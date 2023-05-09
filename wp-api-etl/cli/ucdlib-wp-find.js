import { Command, Option } from 'commander';
import {JSDOM} from "jsdom";

import Config from "../lib/config.js";
import WpApi from "../lib/wp-api.js";

const program = new Command();

program
  .command('post-by-element')
  .description('Find posts that contain a specified DOM element')
  .argument('<query>', 'Args to pass to QuerySelector')
  .option('-t, --type <type...>', 'Post type to search', ['page'])
  .action(async (query, options) => {
    const foundPosts = [];
    const config = new Config();
    const api = new WpApi(config);

    for (const postType of options.type) {
      const posts = await api.getPostsByTypeAll(postType);
      for (const post of posts) {
        const dom = new JSDOM(post.content.rendered);
        const elements = dom.window.document.querySelectorAll(query);
        if (elements.length > 0) {
          foundPosts.push(post);
        }
      }
    }

    console.log(`Found ${foundPosts.length} posts.`);
    for (const post of foundPosts) {
      console.log(post.link);
    }

  }
);

program.parse(process.argv);
