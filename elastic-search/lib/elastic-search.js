import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import elasticsearch from 'elasticsearch';
import config from './config.js';
import logger from './logger.js';
import waitUntil from './wait-until.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {Client} = elasticsearch;

class ElasticSearch {

  constructor() {
    this.DEFAULT_OFFSET = 0;
    this.DEFAULT_LIMIT = 10;
    this.connect();
  }

    /**
   * @method isConnected
   * @description make sure we are connected to elasticsearch
   */
  async isConnected() {
    if( this.connected ) return;

    logger.info('waiting for es connection');
    await waitUntil(config.elasticSearch.host, config.elasticSearch.port);

    // sometimes we still aren't ready....
    try {
      await this.client.ping({requestTimeout: 5000});
      this.connected = true;
    } catch(e) {
      logger.error(e)
      await this.isConnected();
    }
  }

  /**
   * @method connect
   * @description connect to elasticsearch and ensure collection indexes
   */
  async connect() {
    if( !this.client ) {
      this.client = new Client({
        host: `http://${config.elasticSearch.username}:${config.elasticSearch.password}@${config.elasticSearch.host}:${config.elasticSearch.port}`,
        requestTimeout : config.elasticSearch.requestTimeout
      });
    }

    await this.isConnected();
    logger.error('Connected to Elastic Search');
  }

  analyze(body) {
    return fetch(
      `http://${config.elasticSearch.username}:${config.elasticSearch.password}@${config.elasticSearch.host}:${config.elasticSearch.port}/_analyze`,
      {
        method : 'POST',
        header : {'content-type': 'appliation/json'},
        body : JSON.stringify(body)
      }
    )
  }

  /**
   * @method get
   * @description get the elasticsearch record using id
   * 
   * @param {String} id record id
   * 
   * @returns {Promise} resolves to elasticsearch result
   */
  async get(id, opts={}) {
    let query = {
      index: config.elasticSearch.indexAlias,
      type: '_all',
      id: id
    };

    if( opts.allFields !== true ) {
      query._source_excludes = (config.elasticSearch?.fields?.exclude || []).join(',');
    }

    return this.client.get(query);
  }

  /**
   * @method search
   * @description search the elasticsearch pure es search document
   * 
   * @param {Object} body elasticsearch search body
   * @param {Object} opts additional options for controlling search params
   * 
   * @returns {Promise} resolves to elasticsearch result
   */
  search(body = {}, opts={}) {
    let options = {
      index : config.elasticSearch.indexAlias,
      body
    }
    if( opts.allFields !== true ) {
      options._source_excludes = (config.elasticSearch?.fields?.exclude || []).join(',');
    }
    if( opts.explain ) {
      options.explain = true;
      options.body.explain = true;
    }

    return this.client.search(options);
  }

  /**
   * @method ensureIndex
   * @description make sure given index exists in elastic search
   * 
   * @param {String} alias 
   * 
   * @returns {Promise}
   */
  async ensureIndex() {
    return;
    let alias = config.elasticSearch.indexAlias;
    let exists = await this.client.indices.existsAlias({name: alias});
    
    if( exists ) {
      logger.debug(`Alias exists: ${alias}`);
      return;
    }

    logger.info(`No alias exists: ${alias}, creating...`);

    let indexName = await this.createIndex(alias);
    await this.client.indices.putAlias({index: indexName, name: alias});
    
    logger.info(`Index ${indexName} created pointing at alias ${alias}`);
  }

  /**
   * @method insert
   * @description insert record into research-profiles index
   * 
   * @param {Object} record
   * @param {String} index index to insert into, defaults to main alias
   */
  insert(record, index) {
    record.updated = new Date().toISOString();
    return this.client.index({
      index : index || config.elasticSearch.indexAlias,
      id : record.id,
      body: record
    });
  }

  /**
   * @method createIndex
   * @description create new new index with a unique name based on alias name
   * 
   * @param {String} alias alias name to base index name off of
   * 
   * @returns {Promise} resolves to string, new index name
   */
   async createIndex(alias, newIndexName) {
    newIndexName = newIndexName && alias !== newIndexName ? newIndexName : `${alias}-${Date.now()}`;
    let schemaTxt = fs.readFileSync(path.join(__dirname, 'schema.json'));
    let mappings = JSON.parse(schemaTxt, 'utf-8');

    try {
      await this.client.indices.create({
        index: newIndexName,
        body : {
          settings : {
            analysis : {
              analyzer: {
                defaultAnalyzer: { 
                  tokenizer: 'standard',
                  filter: ["lowercase", "stop", "asciifolding"]
                },
              }
            }
          },
          mappings
        }
      });
    } catch(e) {
      throw e;
    }

    return newIndexName;
  }

}

const instance = new ElasticSearch();
export default instance;