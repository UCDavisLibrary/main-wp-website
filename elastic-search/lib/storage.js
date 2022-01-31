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

  async jsonDownload(file) {
    const contents = await this.download(file);
    return JSON.parse(contents.toString());
  }

}

const instance = new GCSStorage();
export default instance;