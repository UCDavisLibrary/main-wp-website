import metrics from '../metrics.js';
import storage from '../storage.js';
import config from '../config.js';
import libguideTransform from '../transform/libguide.js';
import elasticSearch from '../elastic-search.js';

class GCSHarvest {

  constructor() {

  }

  async run() {
    await elasticSearch.connect();
    await elasticSearch.ensureIndex();

    const indexedData = await storage.jsonDownload(config.storage.indexFile);
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

}

const instance = new GCSHarvest();
instance.run();

export default instance;