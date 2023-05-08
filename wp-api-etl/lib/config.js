import dotenv from "dotenv";

class Config {
  constructor(envPath) {
    if (envPath) {
      dotenv.config({ path: envPath });
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
