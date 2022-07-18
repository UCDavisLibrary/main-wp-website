import mysql from 'mysql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import waitUntil from './wait-until.js';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MySQL {

  constructor() {
    let [host, port] = config.mysql.host.split(':');
    this.client = mysql.createPool({
      connectionLimit : 8,
      multipleStatements: true,
      host : host,
      port : port,
      user : config.mysql.user,
      password : config.mysql.password,
      database : config.mysql.database
    });

    this.LOG_TABLE = 'ucdlib_post_updates_log';
  }

  /**
   * @method connect
   * @description wait for mysql host/port, then attempt to establish connection
   * 
   * @returns 
   */
  async connect() {
    let [host, port] = config.mysql.host.split(':');
    await waitUntil(host, port);
  }

  query() {
    return new Promise((resolve, reject) => {
      this.client.query(...Array.from(arguments), (error, results, fields) => {
        if( error ) reject(error);
        else resolve({results, fields});
      });
    });
  }

  async ensureSqlSchema() {
    let q = `SELECT count(*) as count
      FROM information_schema.TABLES 
      WHERE (TABLE_SCHEMA = '${config.mysql.database}') AND (TABLE_NAME = 'ucdlib_post_updates_log')`;

    let tq = `SELECT count(*) as count
      FROM information_schema.TRIGGERS 
      WHERE (EVENT_OBJECT_SCHEMA = 'wordpress') AND (TRIGGER_NAME = 'ucdlib_wp_posts_insert_log_trigger' OR TRIGGER_NAME = 'ucdlib_wp_posts_update_log_trigger')`;
    
    
    let resp = await this.query(q);
    let tresp = await this.query(tq);
    if( resp.results.length && resp.results[0].count > 0 &&
      tresp.results.length && tresp.results[0].count > 1 ) {
      return;
    }

    logger.info('Ensuring indexer sql schema in database');
    let schema = fs.readFileSync(path.join(__dirname, 'sql', 'post-updates-log.sql'), 'utf-8');

    await this.query(schema);
  }

}

const instance = new MySQL();
export default instance;