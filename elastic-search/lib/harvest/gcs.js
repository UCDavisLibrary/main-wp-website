import metrics from '../metrics.js';
import storage from '../storage.js';
import config from '../config.js';
import libguideTransform from '../transform/libguide.js';
import databaseTransform from '../transform/database.js';
import elasticSearch from '../elastic-search.js';
import logger from '../logger.js';
import {CronJob} from 'cron';
import fetch from 'node-fetch';

class GCSHarvest {

  constructor() {
    logger.info('Scheduling LibGuides GCS crawl cron for: '+config.libguides.harvestSchedule);
    this.cronJob = new CronJob(config.libguides.harvestSchedule, () => {
      this.run();
    }, null, true, 'America/Los_Angeles');
    this.cronJob.start();
  }

  async init() {
    await elasticSearch.connect();
    await elasticSearch.ensureIndex();
  }

  async run() {
    let indexedData = await storage.jsonDownload(config.storage.indexFile);
    this.recordAge(indexedData.data, indexedData.metadata.updated, indexedData.data.id);
    indexedData = indexedData.data;

    let record;

    for( let url of indexedData.urls ) {
      try {
        // download indexer json from bucket
        record = await storage.jsonDownload(url.id+'.json');
        let timestamp = record.data.timestamp;
        record = record.data;

        // transform record
        record = libguideTransform(indexedData.id, record);

        // smoke check for actual lib guide.  indexer just harvests
        // all of sitemap.xml which contains some non-content-libguide urls
        // these urls normally do not have dc.title which is mapped to title
        // in transformer
        if( !record.title ) {
          this.recordStatus(indexedData, 'ignored', url);
          continue;
        }

        // check the md5 hash with current elastic search record
        // don't update if they are the same
        try {
          let resp = await elasticSearch.get(record.id);
          if( resp._source.md5 === record.md5 ) {
            this.recordStatus(indexedData, 'ignored-no-update', url);
            continue;
          }
        } catch(e) {}

        // log the age of record about to be indexed
        this.recordAge(indexedData, timestamp, url.url);

        let resp = await elasticSearch.insert(record);
        if( resp.result !== 'updated' && resp.result !== 'created' ) {
          throw new Error('Unknown result from elasicsearch insert: '+resp.result);
        }

        this.recordStatus(indexedData, 'success', url);
      } catch(e) {
        this.recordStatus(indexedData, 'error', url, e);
      }
    }

    let databases = await storage.jsonDownload(config.storage.databaseFile);
    databases = databases.data;

    for( let database of databases ) {
      database = databaseTransform(database);

      // check md5
      try {
        let resp = await elasticSearch.get(database.id);
        if( resp._source.md5 === database.md5 ) {
          this.recordStatus(database, 'ignored-no-update', database.link, null, 'database');
          continue;
        }
      } catch(e) {}

      // check db url
      // JM - Here if we want it, but opens a can-o-worms
      // try {
      //   let url = new URL(database.link);
      //   let protocol = url.protocol;
      //   if( protocol === 'http:' ) url.protocol = 'https:';

      //   let valid = await this.validUrl(url);
      //   if( !valid && protocol === 'http:' ) {
      //     url.protocol = 'http:';
      //     valid = await this.validUrl(url);
      //   }

      //   if( !valid ) {
      //     this.recordStatus(database, 'ignored-bad-url', database.link, null, 'database');
      //     continue;
      //   }

      // } catch(e) {
      //   this.recordStatus(database, 'ignored-invalid-url', database.link, e.message, 'database');
      //   continue;
      // }

      let resp = await elasticSearch.insert(database);
      if( resp.result !== 'updated' && resp.result !== 'created' ) {
        throw new Error('Unknown result from elasicsearch insert: '+resp.result);
      }

      this.recordStatus(database, 'success', database.link, null, 'database');
    }
  }

  async validUrl(url) {
    let resp = await fetch(url.href, {method: 'HEAD'});
    if( resp.status >= 200 && resp.status <= 299 ) {
      return true;
    }

    return false;
  }

  recordStatus(indexedData, status, url, error, type) {
    metrics.log(
      config.metrics.definitions['page-index-status'].type,
      {
        status,
        source : indexedData.id,
        type : type || 'libguide',
      },
      1,
      url, 
      {error}
    );
  }

  recordAge(indexedData, updated, url) {
    updated = new Date(updated);
    let age =  Date.now() - updated.getTime();
    age = parseFloat((age/(1000*60*60)).toFixed(2));

    metrics.log(
      config.metrics.definitions['page-index-age'].type,
      {
        source : indexedData.id,
        type : 'libguide',
      },
      age,
      url
    );

    metrics.log(
      config.metrics.definitions['page-index-max-age'].type,
      {
        source : indexedData.id,
        type : 'libguide',
      },
      age,
      url,
      {max: true, log: false}
    );
  }
}

const instance = new GCSHarvest();
export default instance;