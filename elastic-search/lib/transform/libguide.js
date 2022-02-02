import crypto from 'crypto';

function transformRecord(libguideSource, libguide, parentRecord) {
  let record = parentRecord || {};

  if( !parentRecord ) {
    record.id = libguide.url,
    record.libguide = {
      id : libguide.id,
      source : libguideSource
    }
    record.title = libguide.dublinCore?.title;
    record.description = libguide.dublinCore?.description;
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

  if( libguide.dublinCore?.subjects ) {
    record.subjects = mergeSets(
      record.subjects,
      libguide.dublinCore.subjects.spit(',').map(item => item.trim())
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