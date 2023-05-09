import dotenv from "dotenv";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

/**
 * @class Config
 * @description Configuration class for the WP API ETL. Sets defaults and reads from .env file if present.
 * @param {String} envPath - Path to the .env file
 */
class Config {
  constructor(envPath) {
    if (envPath) {
      dotenv.config({ path: envPath });
    } else {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const envFile = join(__dirname, '../.env');
      if (existsSync(envFile)) {
        dotenv.config({ path: envFile });
      }
    }
    const env = process.env;

    this.host = env.HOST || "http://localhost:3000";
    this.apiPath = env.API_PATH || "/wp-json/wp/v2";
    this.useCache = env.USE_CACHE === 'false' ? false : true;
    if ( this.useCache ) {
      this.writeToCache = true;
    } else {
      this.writeToCache = env.WRITE_TO_CACHE === 'false' ? false : true;
    }
  }

}

export default Config;
