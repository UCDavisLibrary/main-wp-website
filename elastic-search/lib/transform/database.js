import crypto from 'crypto';

function transformDatabase(database) {
  database.id = 'database-'+database.id;
  database.type = 'database';
  database.link = database.url;
  
  if( !database.title && database.name ) {
    database.title = database.name;
  }

  if( database.name ) {
    delete database.name;
  }
  if( database.url ) {
    delete database.url;
  }

  database.md5 = crypto.createHash('md5').update(JSON.stringify(database)).digest('hex')

  return database;
}

export default transformDatabase