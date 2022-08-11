import {Storage} from '@google-cloud/storage';
import config from './config.js';

class GCSStorage {

  constructor() {
    this.client = new Storage({
      projectId: config.google.projectId,
    });
  }

  async download(filename) {
    return this.client.bucket(config.storage.bucket).file(filename).download();
  }

  async metadata(filename) {
    return this.client.bucket(config.storage.bucket).file(filename).getMetadata();
  }


  async jsonDownload(file) {
    const contents = await this.download(file);
    const metadata = await this.metadata(file);
    return {
      metadata: metadata[0], 
      data: JSON.parse(contents.toString())
    }
  }

}

const instance = new GCSStorage();
export default instance;