import crypto from 'crypto';
import striptags from 'striptags';
import { parse } from '@wordpress/block-serialization-default-parser';
import htmlEntities from 'html-entities';
import { JSDOM } from 'jsdom';

function transformRecord(post) {
  let record = {
    id : post.ID+'',
    title : post.post_title,
    type : post.post_type,
    description : post.post_name,
    content : '',
    blocks : {},
    subjects : [],
    tags : []
  };

  // set categories (we call them subjects) and tags
  for( let term of post.terms ) {
    if( term.taxonomy === 'tag' ) record.tags.push(htmlEntities.decode(term.name));
    if( term.taxonomy === 'category' ) record.subjects.push(htmlEntities.decode(term.name));
  }
  
  // strip all style and post tags
  const dom = new JSDOM(post.post_content);
  ['script', 'style'].forEach(tag => {
    Array.from(dom.window.document.querySelectorAll(tag))
      .forEach(ele => {console.log(ele); ele.remove()});
  });
  post.post_content = dom.window.document.body.innerHTML;

  // parse the gutenberg block content
  parseBlocks(record, parse(post.post_content));

  record.md5 = crypto.createHash('md5').update(JSON.stringify(record)).digest('hex');
  return record;
}

function parseBlocks(record, blocks) {
  for( let block of blocks ) {
    let content = striptags(block.innerHTML).trim();
    if( content ) {
      record.content += content+'. ';
      block.attrs.content = content;
    }

    if( block.innerBlocks && block.innerBlocks.length ) {
      parseBlocks(record, block.innerBlocks);
    }

    if( !block.blockName ) continue;
    if( Object.keys(block.attrs).length === 0 ) continue;

    let blockName = block.blockName.replace(/\/+/g, '-');
    if( !record.blocks[blockName] ) {
      record.blocks[blockName] = [];
    }
    record.blocks[blockName].push(block.attrs);
  }
}

export default transformRecord;