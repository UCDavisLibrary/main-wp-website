import {MetricServiceClient} from '@google-cloud/monitoring';
import config from './config.js';
import logger from './logger.js';

class GCMetrics {

  constructor() {
    if( config.google.keyfile ) {
      this.client = new MetricServiceClient();
      this.metrics = config.metrics.definitions;
      this.values = {};
      this.labels = {};
      this.ensureMetrics();

      setInterval(() => this._sendQueue(), 3000);
    }
  }

  async ensureMetrics() {
    for( let key in this.metrics ) {
      let metric = this.metrics[key];
      await this.client.createMetricDescriptor({
        name: this.client.projectPath(config.google.projectId),
        metricDescriptor: metric
      });
    }
  }

  setDefaultLabels(type, labels) {
    this.labels[type] = labels;
  }

  log() {
    // apply args to labels
    let args = Array.from(arguments);
    let metricName = args.shift(1);
    let labels = args.shift(1);
    

    // ensure strings for gcs labels
    for( let key in labels ) {
      labels[key] = labels[key]+'';
    }
    labels = Object.assign(labels, this.labels[metricName]);
    args[0] = {labels};


    // apply logger, either error event or info log
    if( labels?.status === 'error' ) {
      logger.error.apply(logger, args);
    } else {
      logger.info.apply(logger, args);
    }

    // metrics only works if gcs is wired up
    if( !config.google.keyfile ) {
      return;
    }

    let key = Object.values(labels).join('-');

    if( !this.values[metricName] ) {
      this.values[metricName] = {};
    }
    if( !this.values[metricName][key] ) {
      this.values[metricName][key] = {
        value : 0,
        labels
      }
    }
    this.values[metricName][key].value += 1;
  }

  async _sendQueue() {
    for( let name in this.values ) {
      for( let key in this.values[name] ) {
        let type = this.metrics[name].type;
        let {value,labels} = this.values[name][key];

        await this._send(type, labels, value);

        this.values[name] = null;
        break;
      }
    }
  }

  async _send(type, labels, value) {
    let dataPoint = {
      interval: {
        endTime: {
          seconds: new Date().getTime() / 1000
        }
      },
      value: {
        int64Value: value+'',
      },
    };

    console.log(dataPoint);

    let timeSeriesData = {
      metric: {type, labels},
      resource: {
        type: 'global',
        labels: {
          project_id: config.google.projectId,
        },
      },
      points: [dataPoint],
    };

    let request = {
      name: this.client.projectPath(config.google.projectId),
      timeSeries: [timeSeriesData],
    };

    // Writes time series data
    try {
      let result = await this.client.createTimeSeries(request);
    } catch(e) {
      console.warn(`error writing metric ${type} ${Object.keys(labels).join('-')}`, e);
    }
  }
}

const instance = new GCMetrics();
export default instance;