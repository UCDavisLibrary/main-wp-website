import Config from "../lib/config.js";
import { dirname, join } from 'path';
import { fileURLToPath, URLSearchParams } from 'url';
import { existsSync, mkdirSync } from 'fs';
import WpApi from "../lib/wp-api.js";

class LightBoxImageCheck {

  constructor(){
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envFile = join(__dirname, '.env');
    if ( existsSync(envFile) ) {
      this.config = new Config(envFile);
    } else {
      console.warn(`No .env file found at ${envFile}`);
      this.config = new Config();
    }

    this.api = new WpApi(this.config);

  }

  async run(){
    this.findPostsWithMissingImageIds();
  }

  async findPostsWithMissingImageIds(postTypes = ['pages', 'exhibit']){
    if ( !Array.isArray(postTypes) ) {
      postTypes = [postTypes];
    }
    const out = {};
    const p = await this.api.getPostsByTypeAll('exhibits');
  }
}

const run = async () => {
  console.log("Running LightBoxImageCheck");
  ( new LightBoxImageCheck() ).run();
}

run();
