import fs from 'fs';
import path from 'path';
import mysql from 'mysql';
import { fileURLToPath } from 'url';
import { IncomingWebhook } from '@slack/webhook';
import { CronJob } from 'cron';

// load sql
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const updatesQuery = fs.readFileSync(path.join(__dirname, 'daily-updates.sql'), 'utf-8');
const TABLE_HEADERS = ['Name', 'Type', 'User', 'Original Author', 'Revisions', 'Last Revision', ];
const FIELDS = ['post_name', 'type', 'updated_by', 'created_by', 'update_count', 'last_updated'];

// parse host/port of db
let host = process.env.WORDPRESS_DB_HOST || process.env.DB_HOST || 'db';
let port = 3306;
if( host.match(':') ) {
  port = host.split(':')[1];
  host = host.split(':')[0];
}
let days = parseInt(process.env.CHANGES_NUM_DAYS || 1);

// setup mysql connection
const pool = mysql.createPool({
  connectionLimit : 3,
  host            : host,
  port            : port,
  user            : process.env.WORDPRESS_DB_USER || process.env.DB_USER || 'wordpress',
  password        : process.env.WORDPRESS_DB_PASSWORD || process.env.DB_PASSWORD || 'wordpress',
  database        : process.env.WORDPRESS_DB_DATABASE || process.env.DB_DATABASE  || 'wordpress'
});

// setup cron job
new CronJob(
  // default to 8 am
	process.env.CHANGES_CRON || '0 8 * * *', 
	run,
	null,
	true,
	'America/Los_Angeles'
);

// setup slack
let webhook;
let url = process.env.SLACK_WEBHOOK_URL;
if( url ) webhook = new IncomingWebhook(url);

function createSlackMessage(data) {
  let serverUrl = process.env.WP_SERVER_URL || process.env.SERVER_URL;
  
  let table = data.map(item => {
    let row = [];
    FIELDS.forEach(field => {
      if( field === 'post_name' ) {
        row.push('<'+serverUrl+'?p='+item.post_id+'|'+item[field]+'>');
      } else if ( field === 'updated_by' || field === 'created_by' ) {
        row.push(item[field].replace(/\@ucdavis.edu/, ''));
      } else if ( field === 'last_updated' ) {
        row.push(item[field].toLocaleString());
      } else {
        row.push(item[field]);
      }
    });
    return row.join(', ');
  });

  table = `${TABLE_HEADERS.join(', ')}

  - ${table.join('\n  - ')}`;


  let now = new Date();
  let yesterday = new Date(now.getTime() - (1000 * 60 * 60 *24));

  return {
     text: `️✏️ New Website Updates: ${yesterday.toLocaleString()} - ${now.toLocaleString()}

${table}`,
     mrkdwn: true,
     attachments: []
  };
}
 

function run() {
  if( !url ) return;

  pool.query(updatesQuery, [days], (error, results, fields) => {
    if (error) throw error;
    if( results.length === 0 ) return;
    webhook.send(createSlackMessage(results));
  });  
}