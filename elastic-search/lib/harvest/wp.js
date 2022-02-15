import mysql from '../mysql.js';
import logger from '../logger.js';
import metrics from '../metrics.js';
import wordpressTransform from '../transform/wordpress.js';
import elasticSearch from '../elastic-search.js';
import config from '../config.js';

class WPHarvest {

  constructor() {
    this.POST_TYPES = ['post', 'page', 'book'];
  }

  startInterval() {
    setInterval(() => this.run(), 5*1000);
  }

  async init() {
    await elasticSearch.connect();
    await elasticSearch.ensureIndex();

    await mysql.connect();
    await mysql.ensureSqlSchema();
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
    await this.init();

    let resp = await mysql.query(`select ID from wp_posts where post_status = 'publish' and post_type IN (?)`, [this.POST_TYPES]);
    for( let post of resp.results ) {
      await this.harvestPost(post.ID, true);
    }
  }

  async harvestPost(postId, reharvest=false) {
    let post = {};

    try {
      let qResp = await mysql.query(`select ID, post_type, post_content, post_name, post_title, post_status, post_modified_gmt from wp_posts where ID=${postId}`);
      
      // post doesn't exists
      // TODO: delete from elastic search
      if( qResp.results.length === 0 ) {
        logger.warn('Still need to wire up elastic search delete for removed wp_post');
        this.recordStatus('unknown', 'ignored-deleted', postId);
        return;
      }
  
      // check this is a post type we are interested in harvesting
      post = qResp.results[0];
      if( !this.POST_TYPES.includes(post.post_type)  ) {
        this.recordStatus(post.post_type, 'ignored-type', postId);
        return;
      }

      // check this post is actually published
      if( post.post_status !== 'publish' ) {
        this.recordStatus(post.post_type, 'ignored-unpublished', postId);
        return;
      }

      // get tag and category terms
      qResp = await mysql.query(`select * 
        from wp_term_relationships tr
        left join wp_term_taxonomy tt on tr.term_taxonomy_id = tt.term_taxonomy_id
        left join wp_terms t on t.term_id = tt.term_id
        where object_id = ${postId};
      `);
      post.terms = qResp.results
        .map(item => {
          if( item.taxonomy === 'post_tag' ) item.taxonomy = 'tag';
          return item;
        })
        .filter(item => ['tag', 'category'].includes(item.taxonomy));

      let record = wordpressTransform(post);

      // check the md5 hash with current elastic search record
      // don't update if they are the same
      try {
        let resp = await elasticSearch.get(record.id);
        if( resp._source.md5 === record.md5 ) {
          this.recordStatus(record.type, 'ignored-no-update', postId);
          return;
        }
      } catch(e) {}

      // record age of record about to be indexed, unless its a reharvest
      if( reharvest !== true ) {
        this.recordAge(post);
      }

      // insert into elastic search
      let resp = await elasticSearch.insert(record);
      if( resp.result !== 'updated' && resp.result !== 'created' ) {
        throw new Error('Unknown result from elasicsearch insert: '+resp.result);
      }

      // send success message and remove all post_id from log table
      this.recordStatus(post.post_type, 'success', postId);
    } catch(e) {
      this.recordStatus(post.post_type || 'unknown', 'error', postId, e);
    }
  }

  recordStatus(type, status, postId, error='') {
    metrics.log(
      config.metrics.definitions['page-index-status'].type,
      {status, type, source: 'wordpress'}, 1,
      postId+'', {error}
    );
    return this.deleteLog(postId);
  }

  recordAge(post) {
    let updated = new Date(post.post_modified_gmt);
    let age =  Date.now() - updated.getTime();
    age = parseFloat((age/(1000*60*60)).toFixed(2));

    metrics.log(
      config.metrics.definitions['page-index-age'].type,
      {
        source : 'wordpress',
        type : post.post_type,
      },
      age,
      post.ID+''
    );

    metrics.log(
      config.metrics.definitions['page-index-max-age'].type,
      {
        source : 'wordpress',
        type : post.post_type,
      },
      age,
      post.ID,
      {max: true, log: false}
    );
  }

  deleteLog(postId) {
    return mysql.query(`delete from ${mysql.LOG_TABLE} where post_id=?`, [postId]); 
  }

}

const instance = new WPHarvest();
export default instance;