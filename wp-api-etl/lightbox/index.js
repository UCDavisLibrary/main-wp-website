import {JSDOM} from "jsdom";
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import Config from "../lib/config.js";
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
    const posts = await this.findPostsWithMissingImageIds();
    console.log(posts);
  }

  async findPostsWithMissingImageIds(postTypes = ['pages', 'exhibit']){
    if ( !Array.isArray(postTypes) ) {
      postTypes = [postTypes];
    }
    const out = {};
    for( let postType of postTypes ) {
      const posts = await this.api.getPostsByTypeAll(postType);
      for( let post of posts ) {
        let imgCt = 0;
        const dom = new JSDOM(post.content.rendered);
        const galleries = dom.window.document.querySelectorAll('.wp-block-gallery');
        for( let gallery of galleries ) {
          const images = gallery.querySelectorAll('img');
          for( let image of images ) {
            if ( !image.hasAttribute('data-id') ) {
              imgCt++;
            }
          }
        }
        if ( imgCt > 0 ) {
          out[post.id] = {imgCt, post};
        }
      }
    }
    return out;
  }
}

const run = async () => {
  console.log("Running LightBoxImageCheck");
  ( new LightBoxImageCheck() ).run();
}

run();
