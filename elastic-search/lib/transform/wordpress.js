import crypto from 'crypto';
import striptags from 'striptags';
import { parse } from '@wordpress/block-serialization-default-parser';
import htmlEntities from 'html-entities';
import { JSDOM } from 'jsdom';
import {setDates} from './utils.js';

function transformRecord(post) {
  let record = {
    id : post.ID+'',
    title : post.post_title,
    type : post.post_type,
    description : post.post_name,
    created : post.post_date_gmt,
    modified : post.post_modified_gmt,
    content : '',
    blocks : {},
    subjects : [],
    tags : [],
    authors : [],
    ucd_hide_author: post.meta.ucd_hide_author ? true : false
  };

  setDates(record);

  // set categories (we call them subjects) and tags
  for( let term of post.terms ) {
    if( term.taxonomy === 'tag' ) record.tags.push(htmlEntities.decode(term.name));
    if( term.taxonomy === 'category' ) record.subjects.push(htmlEntities.decode(term.name));
  }
  
  // strip all style and post tags
  const dom = new JSDOM(post.post_content);
  ['script', 'style'].forEach(tag => {
    Array.from(dom.window.document.querySelectorAll(tag))
      .forEach(ele => ele.remove());
  });
  post.post_content = dom.window.document.body.innerHTML;

  // authors
  let authors = new Set();
  if( post.user_email ) authors.add(post.user_email);
  if( post.meta.curator_emails ) {
    post.meta.curator_emails.forEach(email => authors.add(email));
  }
  record.authors = Array.from(authors);

  // bio
  if( post.meta.bio ) {
    record.content += post.meta.bio.join('\n');
  }

  // collectionType overrides type
  if( post.meta.collectionType && post.meta.collectionType.length ) {
    record.collectionType = post.meta.collectionType[0];
  }

  // parse the gutenberg block content
  parseBlocks(record, parse(post.post_content));

  // grab all metadata needed to run the directory search
  if ( post.post_type == 'person' ){
    record = {...record, 
      positionTitle: '',
      departmentIds: [],
      libraryIds: [],
      directoryTagIds: [],
      areasOfExperise: []
    }

    for( let term of post.terms ) {
      if( term.taxonomy === 'directory-tag' ) record.directoryTagIds.push(term.term_id);
      if( term.taxonomy === 'library' ) record.libraryIds.push(term.term_id);
      if( term.taxonomy === 'expertise-areas' ) record.areasOfExperise.push(htmlEntities.decode(term.name));
    }
  }

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

/**
 * @method fixDate
 * @description dublin core dates seem to be set like: Aug 6, 2013.
 * We need to fix.
 * 
 * @param {String} date 
 * @returns {String}
 */
 function fixDate(date) {
  if( !date ) return date;
  return new Date(date).toISOString();
}

export default transformRecord;