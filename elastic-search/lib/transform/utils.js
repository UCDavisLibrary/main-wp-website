import config from '../config.js';

function setDates(record, createProp='created', modifiedProp='modified') {
  record.created = fixDate(record[createProp]);
  record.modified = fixDate(record[modifiedProp]);

  let sortByCreated = config.indexer.sortByDateCreated.includes(record.type);
  record.sortByDate = record[sortByCreated ? 'created' : 'modified'];
}

function fixDate(date) {
  if( !date ) return date;
  return new Date(date).toISOString();
}

export {setDates}