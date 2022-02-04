import mysql from '../mysql.js';
import logger from '../logger.js';
import metrics from '../metrics.js';
import wordpressTransform from '../transform/wordpress.js';
import elasticSearch from '../elastic-search.js';
import config from '../config.js';

class WPHarvest {

  constructor() {
    this.POST_TYPES = ['post', 'page', 'book'];

    metrics.setDefaultLabels(
      'wp-post-updates',
      'index-status', 
      {
        source : 'wordpress',
        instance : config.instance.name
      }
    );
  }

  startInterval() {
    setInterval(() => this.run(), 5*1000);
  }

  async init() {
    await mysql.connect();
    await mysql.ensureSqlSchema();

    await elasticSearch.connect();
    await elasticSearch.ensureIndex();
  }

  async run() {
    let {results, fields} = await mysql.query(`select * from ${mysql.LOG_TABLE}`); 
    if( results.length === 0 ) return;
    
    let byId = {};
    results.forEach(row => {
      byId[row.post_id] = row;
    });
  
    for( let postId in byId ) {
      await this.harvestPost(postId);
    }
  }

  async reharvestAll() {
    let resp = await mysql.query(`select ID from wp_posts where post_status = 'publish' and post_type IN (?)`, [this.POST_TYPES]);
    for( let post of resp.results ) {
      await this.harvestPost(post.ID);
    }
  }

  async harvestPost(postId) {
    try {
      let qResp = await mysql.query(`select ID, post_type, post_content, post_name, post_title, post_status from wp_posts where ID=${postId}`);
      
      // post doesn't exists
      // TODO: delete from elastic search
      if( qResp.results.length === 0 ) {
        logger.warn('Still need to wire up elastic search delete for removed wp_post');
        this.log('unknown', 'ignored-deleted', postId);
        return;
      }
  
      // check this is a post type we are interested in harvesting
      let post = qResp.results[0];
      if( !this.POST_TYPES.includes(post.post_type)  ) {
        this.log(post.post_type, 'ignored-type', postId);
        return;
      }

      // check this post is actually published
      if( post.post_status !== 'publish' ) {
        this.log(post.post_type, 'ignored-unpublished', postId);
        return;
      }

      let record = wordpressTransform(post);

      // check the md5 hash with current elastic search record
      // don't update if they are the same
      try {
        let resp = await elasticSearch.get(record.id);
        if( resp._source.md5 === record.md5 ) {
          this.log(record.type, 'ignored-no-update', postId);
          return;
        }
      } catch(e) {}

      // insert into elastic search
      let resp = await elasticSearch.insert(record);
      if( resp.result !== 'updated' && resp.result !== 'created' ) {
        throw new Error('Unknown result from elasicsearch insert: '+resp.result);
      }

      // send success message and remove all post_id from log table
      this.log(post.post_type, 'success', postId);
    } catch(e) {
      this.log(post.post_type, 'error', postId, e);
    }
  }

  log(type, status, postId, e='') {
    metrics.log(
      'wp-post-updates',
      'index-status',
      {status, type},
      `indexer ${status}: `, postId, e
    );
    return this.deleteLog(postId);
  }

  deleteLog(postId) {
    return mysql.query(`delete from ${mysql.LOG_TABLE} where post_id=?`, [postId]); 
  }

}

const instance = new WPHarvest();

await instance.init();
await instance.startInterval();

// export default instance;