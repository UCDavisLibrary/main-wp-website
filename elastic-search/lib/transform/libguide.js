import crypto from 'crypto';
import {setDates} from './utils.js';

function transformRecord(libguideSource, libguide, parentRecord) {
  let record = parentRecord || {};

  if( !parentRecord ) {
    record.id = libguide.url,
    record.libguide = {
      id : libguide.id,
      source : libguideSource
    }
    record.type = 'libguide';
    // set title and remove libguides appended ': Home'
    record.title = (libguide.dublinCore?.title || '').trim()
      .replace(/: Home$/i, '')
      .replace(/^Research Guides:/i, '' )
      .trim();
    record.authors = libguide.author;

    if( libguide.dublinCore ) {
      record.description = libguide.dublinCore.description;
      record.created = libguide.dublinCore['date.created'];
      record.modified = libguide.dublinCore['date.modified'];
      setDates(record);
    }

  } else {
    if( !record.children ) record.children = [];
    record.children.push(libguide.url);
  }

  if( libguide.breadcrumbs ) {
    record.breadcrumbs = mergeSets(
      record.breadcrumbs,
      libguide.breadcrumbs.filter(item => item.href).map(item => item.href)
    );
  }

  if( libguide.dublinCore?.subject ) {
    record.subjects = mergeSets(
      record.subjects,
      libguide.dublinCore.subject.split(',').map(item => item.trim())
    );
  }

  if( libguide.libBoxes?.content ) {
    record.content = mergeSets(
      record.content,
      libguide.libBoxes.content
    );
  }

  if( libguide.children ) {
    for( let child of libguide.children ) {
      record = transformRecord(libguideSource, child, record);
    }
  }

  record.md5 = crypto.createHash('md5').update(JSON.stringify(record)).digest('hex')

  return record;
}

function mergeSets(arr1=[], arr2=[]) {
  if( !Array.isArray(arr1) ) arr1 = [arr1];
  if( !Array.isArray(arr2) ) arr2 = [arr2];

  let set = new Set();
  arr1.forEach(item => set.add(item));
  arr2.forEach(item => set.add(item));
  return Array.from(set);
}

export default transformRecord;