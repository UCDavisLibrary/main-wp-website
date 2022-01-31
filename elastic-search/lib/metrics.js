import {MetricServiceClient} from '@google-cloud/monitoring';
import {ErrorReporting} from '@google-cloud/error-reporting';
import config from './config.js';

class GCMetrics {

  constructor() {
    if( config.google.keyfile ) {
      this.client = new MetricServiceClient();
      this.metrics = config.metrics.definitions;
      this.errors = new ErrorReporting({
        reportMode: 'always'
      });
      this.values = {};
      this.ensureMetrics();

      setInterval(() => this._sendQueue(), 5000);
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

  error(e) {
    console.error(e);

    const evt = this.errors.event();
    if( typeof e === 'object' ) {
      evt.setMessage(e.message+'\n\nStack:\n'+e.stack);
    } else {
      evt.setMessage(e);
    }
    evt.setServiceContext(config.instance.name, config.instance.version);
   this.errors.report(evt);
  }

  log(name, labels={}) {
    labels.instance = config.instance.name;
    let key = Object.values(labels).join('-');

    if( !config.google.keyfile ) {
      console.log('local-metric: '+key+' 1');
      return;
    }


    if( !this.values[name] ) {
      this.values[name] = {};
    }
    if( !this.values[name][key] ) {
      this.values[name][key] = {
        value : 0,
        labels
      }
    }
    this.values[name][key].value += 1;
  }

  async _sendQueue() {
    let values = this.values
    this.values = {};

    for( let name in values ) {
      for( let key in values[name] ) {
        let type = this.metrics[name].type;
        let {value,labels} = values[name][key];

        await this._send(type, labels, value);
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