import metrics from '../metrics.js';
import storage from '../storage.js';
import config from '../config.js';
import libguideTransform from '../transform/libguide.js';
import elasticSearch from '../elastic-search.js';
import logger from '../logger.js';
import {CronJob} from 'cron';

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
    this.checkLastUpdated(indexedData.metadata);
    indexedData = indexedData.data;

    metrics.setDefaultLabels(
      'gcs-harvest', 
      'index-status', 
      {
        source : indexedData.id,
        type : 'libguide',
        instance : config.instance.name
      }
    );

    let record;

    for( let url of indexedData.urls ) {
      try {
        // download indexer json from bucket
        record = await storage.jsonDownload(url.id+'.json');
        this.checkLastUpdated(record.metadata);
        record = record.data;

        // transform record
        record = libguideTransform(indexedData.id, record);

        // smoke check for actual lib guide.  indexer just harvests
        // all of sitemap.xml which contains some non-content-libguide urls
        // these urls normally do not have dc.title which is mapped to title
        // in transformer
        if( !record.title ) {
          this.log('ignored', url);
          continue;
        }

        // check the md5 hash with current elastic search record
        // don't update if they are the same
        try {
          let resp = await elasticSearch.get(record.id);
          if( resp._source.md5 === record.md5 ) {
            this.log('ignored-no-update', url);
            continue;
          }
        } catch(e) {}

        let resp = await elasticSearch.insert(record);
        if( resp.result !== 'updated' && resp.result !== 'created' ) {
          throw new Error('Unknown result from elasicsearch insert: '+resp.result);
        }

        this.log('success', url);
      } catch(e) {
        this.log('error', url, e);
      }
    }
  }

  log(status, url, e='') {
    metrics.log(
      'gcs-harvest', 
      'index-status',
      {status},
      `indexer ${status}: `, url, e
    );
  }

  checkLastUpdated(metadata) {
    let updated = new Date(metadata.updated);

    // TODO: add new metric for this
    let lastUpdatedDiff =  Date.now() - updated.getTime();
    if( lastUpdatedDiff > config.libguides.staleTime ) {
      logger.warn(`Stale Harvest Data: ${metadata.name} is ${(lastUpdatedDiff/(1000*60*60)).toFixed(2)}h old and considered stale after ${(config.libguides.staleTime/(1000*60*60)).toFixed(2)}h`)
    }
  }
}

const instance = new GCSHarvest();
export default instance;