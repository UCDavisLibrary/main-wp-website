import mysql from '../mysql.js';
import logger from '../logger.js';
import metrics from '../metrics.js';
import wordpressTransform from '../transform/wordpress.js';
import elasticSearch from '../elastic-search.js';
import config from '../config.js';
import {unserialize} from 'php-serialize';

class WPHarvest {

  constructor() {
    this.rtRunning = false;
    this.POST_TYPES = config.wordpress.types;
    logger.info('Wordpress indexer will index posts of types: '+this.POST_TYPES.join(', '));
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
    if( this.rtRunning === true ) return;

    let {results, fields} = await mysql.query(`select * from ${mysql.LOG_TABLE}`); 
    if( results.length === 0 ) {
      this.rtRunning = false;
      return;
    }
    
    this.rtRunning = true;

    let byId = {};
    results.forEach(row => {
      byId[row.post_id] = row;
    });
  
    for( let postId in byId ) {
      await this.harvestPost(postId);
    }

    this.rtRunning = false;
  }

  async reharvestAll() {
    await this.init();

    // run elastic search delete by type
    let result = await elasticSearch.client.deleteByQuery({
      index : config.elasticSearch.indexAlias,
      body : {
        query: {
          bool : {
            should : this.POST_TYPES.map(type => ({term: {type}}))
          }
        }
      }
    });
    logger.info(`Scrubbed ${result.deleted} posts from elastic search of types: ${this.POST_TYPES.join(', ')}`);

    let resp = await mysql.query(`select ID from wp_posts where post_status = 'publish' and post_type IN (?)`, [this.POST_TYPES]);
    for( let post of resp.results ) {
      await this.harvestPost(post.ID, {recordAge: false});
    }
  }

  async harvestPost(postId, opts={}) {
    let post = {};

    try {
      let qResp = await mysql.query(`select 
        p.ID, post_type, post_content, post_name, post_author, user_email, post_title, post_status, post_date_gmt, post_modified_gmt, menu_order 
      from 
        wp_posts p
      left join wp_users u on p.post_author = u.ID
      where p.ID=${postId}`);
      
      // post doesn't exists
      // TODO: delete from elastic search
      if( qResp.results.length === 0 ) {
        await this.deletePostFromEs(postId);
        this.recordStatus('unknown', 'ignored-deleted', postId);
        return;
      }
  
      // check this is a post type we are interested in harvesting
      post = qResp.results[0];
      if( !this.POST_TYPES.includes(post.post_type)  ) {
        await this.deletePostFromEs(postId);
        this.recordStatus(post.post_type, 'ignored-type', postId);
        return;
      }

      // check this post is actually published
      if( post.post_status !== 'publish' ) {
        await this.deletePostFromEs(postId);
        this.recordStatus(post.post_type, 'ignored-unpublished', postId);
        return;
      }

      // get terms we are interested in
      const termTypes = ['tag', 'category', 'directory-tag', 'library', 'expertise-areas'];
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
        .filter(item => termTypes.includes(item.taxonomy));

      // get post meta
      post.meta = {};
      qResp = await mysql.query(`select * from wp_postmeta where post_id = ${postId};`);
      qResp.results.forEach(item => {
        if( !post.meta[item.meta_key] ) post.meta[item.meta_key] = [];
        post.meta[item.meta_key].push(item.meta_value);
      });

      // custom meta field parsing

      // past employee
      if ( post.meta.pastEmployee && post.meta.pastEmployee.length && post.meta.pastEmployee[0] ){
        await this.deletePostFromEs(postId);
        this.recordStatus(post.post_type, 'ignored-quit', postId);
        return;
      }

      // curators
      if( post.meta.curators ) {
        post.meta.curators = post.meta.curators.map(item => unserialize(item))[0];
        qResp = await mysql.query(`select * from wp_postmeta where meta_key = 'contactEmail' and post_id IN (?)`, [post.meta.curators]);
        if( qResp.results.length ) {
          post.meta.curator_emails = unserialize(qResp.results[0].meta_value)
            .map(item => item.value)
        }
      }
      // ucd_hide_author
      if( post.meta.ucd_hide_author ) {
        if( post.meta.ucd_hide_author.length && post.meta.ucd_hide_author[0] === '1' ) {
          post.meta.ucd_hide_author = true;
        } else {
          post.meta.ucd_hide_author = false;
        }
      }

      // multiple authors
      if ( post.meta.ucd_hide_og_author) {
        if( post.meta.ucd_hide_og_author.length && post.meta.ucd_hide_og_author[0] === '1' ) {
          post.meta.ucd_hide_og_author = true;
        } else {
          post.meta.ucd_hide_og_author = false;
        }
      }
      if ( post.meta.ucd_additional_authors ){
        qResp = await mysql.query(`select * from wp_postmeta where meta_key = 'contactEmail' and post_id IN (?)`, [post.meta.ucd_additional_authors]);
        if( qResp.results.length ) {
          post.meta.additional_author_emails = [];
          try {
            qResp.results.forEach(item => {
              unserialize(item.meta_value).forEach(v => {
                post.meta.additional_author_emails.push(v.value);
              });
            });
          } catch (error) {}
        }
      }

      // default collection to be a manuscript
      if ( post.post_type == 'collection' && (!post.meta.collectionType || !post.meta.collectionType.length)) {
        post.meta.collectionType = ['manuscript'];
      }

      // person departments
      if ( post.meta.position_dept ){
        qResp = await mysql.query(`select ID, post_title from wp_posts where post_status = 'publish' and ID IN (?)`, [post.meta.position_dept]);
        if( qResp.results.length ) post.departments = qResp.results;
      }

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
      if( opts.recordAge !== false ) {
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

  async deletePostFromEs(id) {
    try {
      let exists = await elasticSearch.client.exists({
        index : config.elasticSearch.indexAlias,
        id : id
      });
      if( !exists ) return;

      logger.info('Removing post from elastic search: '+id); 
      await elasticSearch.client.delete({
        index : config.elasticSearch.indexAlias,
        id : id
      });
    } catch(e) {
      logger.error('Failed to remove post from elastic search: '+id, e);    
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