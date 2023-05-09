import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

/**
 * @class HTTPCache
 * @description Simple HTTP cache for the WP API ETL. Stores cached responses in .http-cache directory.
 */
class HTTPCache {

  constructor() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.localCacheDir = path.join(__dirname, '.http-cache');
    if( !fs.existsSync(this.localCacheDir) ) {
      fs.mkdirSync(this.localCacheDir);
    }

    this.cache = {};
  }

  /**
   * @description Get a cached response by URL
   * @param {String} url - URL to retrieve
   * @returns - Cached response or null if not found
   */
  get(url) {
    url = this.hash(url);
    if( this.cache[url] ) {
      return this.cache[url].response;
    }

    let cacheFile = this.getCacheFile(url);
    if( fs.existsSync(cacheFile) ) {
      let cache = JSON.parse(fs.readFileSync(cacheFile));
      this.cache[url] = cache;
      return cache.response;
    }
    return null;
  }

  /**
   * @description Set a cached response by URL
   * @param {String} url - URL to set
   * @param {*} response - Response to cache
   */
  set(url, response) {
    let hash = this.hash(url);
    this.cache[hash] = {url, response};
    fs.writeFileSync(this.getCacheFile(hash), JSON.stringify(this.cache[hash]));
  }

  /**
   * @description Get the path to a cache file by hash
   * @param {String} hash - Hash of the URL
   * @returns {String}
   */
  getCacheFile(hash) {
    return path.join(this.localCacheDir, hash+'.json');
  }

  /**
   * @description Hash a URL
   * @param {String} url - URL to hash
   * @returns - Hashed URL
   */
  hash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  /**
   * @description Clear the whole cache
   */
  clearCache(){
    fs.rmdirSync(this.localCacheDir, { recursive: true });
    fs.mkdirSync(this.localCacheDir);
    this.cache = {};
  }

}

const instance = new HTTPCache();
export default instance;
