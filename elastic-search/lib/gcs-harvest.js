import metrics from './metrics.js';
import storage from './storage.js';
import config from './config.js';
import libguideTransform from './transform/libguide.js';

class GCSHarvest {

  constructor() {

  }

  async run() {
    const indexedData = await storage.jsonDownload(config.storage.indexFile);
    let metric = {
      source : indexedData.id,
      type : 'libguide'
    };
    let record;

    for( let url of indexedData.urls ) {
      
      
      try {
        record = await storage.jsonDownload(url.id+'.json');
        record = libguideTransform(record);

        if( !record.title ) {
          metrics.log('index-status', Object.assign({status: 'ignored'}, metric));
          continue;
        }

        delete record.content;
        console.log(record);
        
        metrics.log('index-status', Object.assign({status: 'success'}, metric));
      } catch(e) {
        console.log(e);
        metrics.log('index-status', Object.assign({status: 'error'}, metric));
        metrics.error('Failed to index: '+url.id+' '+url.url);
      }
    }
  }

}

const instance = new GCSHarvest();
instance.run();

export default instance;