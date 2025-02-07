import fetch from "node-fetch";
import {MetricServiceClient} from '@google-cloud/monitoring';
import fs from 'fs';

const SCORE_MAP = {
  "_" : 'waiting', 
  "S" : 'starting',
  "R" : 'reading',
  "W" : 'sending', 
  "K" : 'keepalive',
  "D" : 'dnslookup',
  "C" : 'closing', 
  "L" : 'logging', 
  "G" : 'finishing',
  "I" : 'idle_cleanup',
  "." : 'open'
}

const TYPES = {
  scoreboard : 'workload.googleapis.com/apache.scoreboard',
  workers : 'workload.googleapis.com/apache.workers',
  traffic : 'workload.googleapis.com/apache.traffic',
  requests : 'workload.googleapis.com/apache.requests'
}

let googeCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));

const URL = process.env.APACHE_STATUS_URL || 'http://wordpress:8080/server-status?auto'
const INTERVAL = parseInt(process.env.REPORTING_INTERVAL || 60);
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'unknown';
const PROJECT_ID = process.env.PROJECT_ID || googeCredentials.project_id;
const LOG_LEVEL = process.env.LOG_LEVEL || '';

const client = new MetricServiceClient();


async function crawl(url) {
  let resp = await fetch(url);
  resp = await resp.text();
  
  let values = {};

  resp.split('\n')
    .map(item => item.trim())
    .filter(item => item)
    .forEach(item => {

      let [key, value] = item.split(':').map(v => v.trim())
      values[key] = value;
    });
  return values;
}

function parseScoreboard(scoreboard) {
  let values = {};
  for( let v in SCORE_MAP ) values[SCORE_MAP[v]] = 0;

  for( let i = 0; i < scoreboard.length; i++ ) {
    values[SCORE_MAP[scoreboard[i]]] += 1;
  }
  return values;
}

async function parseStats(url) {
  let values = await crawl(url);
  let scoreboard = parseScoreboard(values.Scoreboard);

  return {
    requests : Math.round(parseFloat(values.ReqPerSec)),
    workers : {
      idle : values.IdleWorkers,
      busy : values.BusyWorkers
    },
    scoreboard,
    traffic : Math.round(parseFloat(values.BytesPerSec))
  }
}

async function sendMetrics(values) {

  // scoreboard
  let value = values.scoreboard;
  for( let key in value ) {
    await sendMetric(TYPES.scoreboard, {state: key}, value[key]);
  }

  // workers
  value = values.workers;
  for( let key in value ) {
    await sendMetric(TYPES.workers, {state: key}, value[key]);
  }

  // traffic
  await sendMetric(TYPES.traffic, {}, values.traffic);

  // requests
  await sendMetric(TYPES.requests, {}, values.requests); 
}

async function sendMetric(type, labels, value) {
  if( LOG_LEVEL === 'debug' ) {
    console.log('sending metric', type, labels, value);
  }

  labels.server_name = INSTANCE_NAME;

  let dataPoint = {
    interval: {
      endTime: {
        seconds: Math.floor(Date.now() / 1000)
      }
    },
    value: {
      int64Value : value+'',
    }
  }

  if( type === TYPES.traffic || type === TYPES.requests ) {
    dataPoint.interval.startTime = {
      seconds : Math.floor(Date.now() / 1000) - 30
    }
  }

  let timeSeriesData = {
    metric: {type, labels},
    resource: {
      type: 'global',
      labels: {
        project_id: PROJECT_ID,
      },
    },
    points: [dataPoint],
  };

  let request = {
    name: client.projectPath(PROJECT_ID),
    timeSeries: [timeSeriesData],
  };

  // Writes time series data
  try {
    let result = await client.createTimeSeries(request);
  } catch(e) {
    console.error(`error writing metric ${type}`, labels, value, e);
  }
}


async function run() {
  let resp = await parseStats(URL);
  await sendMetrics(resp);
}

console.log('Starting Apache Monitoring Service', {
  URL, INTERVAL, INSTANCE_NAME, PROJECT_ID, LOG_LEVEL
});


setInterval(() => run(), INTERVAL*1000);