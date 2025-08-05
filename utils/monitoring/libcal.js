import mysql from 'mysql2/promise';
import { IncomingWebhook } from '@slack/webhook';
import { CronJob } from 'cron';

const transientQuery = `
SELECT
  option_name AS name, option_value AS value
FROM wp_options
WHERE
  option_name LIKE '_transient_libcal_hours%'
`;

const hoursThreshold = process.env.LIBCAL_HOURS_CACHE_THRESHOLD || 12;

// parse host/port of db
let host = process.env.WORDPRESS_DB_HOST || process.env.DB_HOST || 'db';
let port = 3306;
if (host.match(':')) {
  port = host.split(':')[1];
  host = host.split(':')[0];
}

// setup mysql connection
const pool = mysql.createPool({
  connectionLimit: 3,
  host: host,
  port: port,
  user: process.env.WORDPRESS_DB_USER || process.env.DB_USER || 'wordpress',
  password: process.env.WORDPRESS_DB_PASSWORD || process.env.DB_PASSWORD || 'wordpress',
  database: process.env.WORDPRESS_DB_DATABASE || process.env.DB_DATABASE || 'wordpress',
  multipleStatements: true
});

// setup cron job
new CronJob(
  // default to 7 am and 7 pm
  process.env.LIBCAL_CRON || '0 7,19 * * *',
  run,
  null,
  true,
  'America/Los_Angeles'
);

// setup slack
let webhook;
let url = process.env.ITIS_SLACK_WEBHOOK_URL;
let enabled = process.env.ITIS_SLACK_LIBCAL_ENABLED;
if (url && enabled) webhook = new IncomingWebhook(url);

function createSlackMessage(data) {
  let serverUrl = process.env.WP_SERVER_URL || process.env.SERVER_URL || 'http://localhost:3000';
  const moreInfoUrl = 'https://github.com/UCDavisLibrary/ucdlib-wp-plugins/tree/main/ucdlib-locations';
  let text = `*App/Script:* <${serverUrl}|Main Website>`;

  if (data) {
    text += `\n*Error:* Libcal hours cache is over threshold of ${hoursThreshold} hours!`;
    text += `\n\n\n*Cached requests by age (in hours):*`;
    text += `\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``;
  } else {
    text += `\n*Error:* No cached Libcal hours found!`;
  }
  text += `\n\n\n <${moreInfoUrl}|Learn more>`;

  return {
    text,
    mrkdown: true,
    attachments: []
  };
}

async function run() {
  console.log('Checking libcal hours cache age...');

  try {
    const [results] = await pool.query(transientQuery, []);

    if (results.length === 0) {
      console.log('No libcal transients found.');
      if (webhook) {
        webhook.send(createSlackMessage());
      }
      return;
    }

    let cachedTimes = results.map(item => {
      try {
        let value = item.value;
        const k = 's:6:"cached";i:';
        let start = value.indexOf(k) + k.length;
        let end = value.indexOf(';', start);
        let cached = parseInt(value.substring(start, end));
        return new Date(cached * 1000);
      } catch (e) {
        return false;
      }
    }).filter(item => item);

    if (!cachedTimes.length) {
      console.log('No valid libcal transients found.');
      if (webhook) {
        webhook.send(createSlackMessage());
      }
      return;
    }

    let now = new Date();
    let ages = cachedTimes.map(item => {
      let age = (now - item) / 1000 / 60 / 60;
      return Math.round(age);
    });

    let groups = {};
    ages.forEach(age => {
      if (!groups[age]) groups[age] = 0;
      groups[age]++;
    });

    console.log('Number of cached libcal API requests by hours ago:');
    console.log(groups);

    let overThreshold = false;
    Object.keys(groups).forEach(age => {
      if (age >= hoursThreshold) overThreshold = true;
    });

    if (overThreshold) {
      console.log('Libcal cache is over threshold!');
      if (webhook) {
        webhook.send(createSlackMessage(groups));
      }
    } else {
      console.log('Libcal cache is under threshold.');
    }
  } catch (error) {
    console.error('Error querying libcal transients:', error);
    if (webhook) {
      webhook.send({ text: '*Error querying libcal transients.*' });
    }
  }
}
