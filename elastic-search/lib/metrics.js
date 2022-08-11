import {MetricServiceClient} from '@google-cloud/monitoring';
import config from './config.js';
import logger from './logger.js';

class GCMetrics {

  constructor() {
    if( config.google.keyfile ) {
      this.client = new MetricServiceClient();
      this.metrics = config.metrics.definitions;
      this.labels = null;
      this.ensureMetrics();

      this.setGlobalLabels({instance: config.instance.name});

      this.queue = {};

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

  setGlobalLabels(labels) {
    this.labels = labels;
  }

  /**
   * @method log
   * @description log a metrics event.  This function is due functional.  First it will console log
   * the event, sending to stdout or stderr (if error detected).  Additionally it will stash the metric
   * and report to Google Cloud Metrics at a regular interval.
   * 
   * @param {String} type metric type.  See defined types in config.metric.definitions 
   * @param {String} labels metric labels. See defined labels for a type in config.metric.definitions 
   * @param {String} url url for metric.  Note, this is only for logging, metrics will not contain the url 
   * @param {Number} value metric value to record 
   * @param {Object} opts 
   * @param {Error} opts.error optional error object for logging
   * @param {Error} opts.max set max value instead of accumulated value.
   * 
   * @returns {Promise}
   */
  log(type, labels, value, url, opts={}) {
    
    // ensure strings for gcs labels
    for( let key in labels ) {
      labels[key] = labels[key]+'';
    }
    if( this.labels ) {
      labels = Object.assign(labels, this.labels);
    }

    // apply logger, either error event or info log
    if( type === config.metrics.definitions['page-index-status'].type && 
      labels?.status === 'error' ) {
      
        logger.error.apply(logger, [type, labels, url, opts.error]);
    } else if ( type === config.metrics.definitions['page-index-age'].type && 
      value > config.metrics.indexAgeWarning ) {

      logger.error.apply(logger, [`Page index age is greater than ${config.metrics.indexAgeWarning}h`, labels, value]);
    } else if( opts.log !== false ) {
      logger.info.apply(logger, [type, labels, url, value]);
    }

    // metrics only works if gcs is wired up
    if( !config.google.keyfile ) {
      return;
    }

    let metric = this.getMetricObject(labels, type);

    if( Array.isArray(metric.value)) {
      metric.value.push(value);
    } else if ( opts.max === true ) {
      if( metric.value < value ) {
        metric.value = value;
      }
    } else {
      metric.value += value;
    }
  }

  addGauge(metric, value) {
    metric.value += value;
  }

  getMetricKey(labels) {
    return Object.values(labels).join('-');
  }

  getMetricObject(labels, type) {
    let key = this.getMetricKey(labels);
    let metric;

    if( this.queue[type] ) {
      metric = this.queue[type].find(metric => metric.key === key);
      if( metric ) return metric;
    }

    let metricDef = this.getDefinitionByType(type);
    let value;
    if( metricDef.valueType === 'DISTRIBUTION' ) {
      value = [];
    } else {
      value = 0;
    }

    metric = {key, labels, type, value, definition: metricDef}
    if( !this.queue[type] ) this.queue[type] = [];
    this.queue[type].push(metric);
    return metric;
  }

  getDefinitionByType(type) {
    return Object.values(config.metrics.definitions).find(item => item.type === type);
  }

  async _sendQueue() {
    for( let type in this.queue ) {
      if( this.queue[type].length === 0 ) return;

      this._send(this.queue[type].shift());
    }
  }

  async _send(metric) {
    let {type, labels, value} = metric;

    // see config.metrics.pointValueMap for description about what the crap this is.
    let metricType = this.getDefinitionByType(type);
    let valueType = config.metrics.pointValueMap[metricType.valueType];

    // calcs: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/TypedValue#Distribution
    if( Array.isArray(value) ) {
      let bounds = metric.definition.bucketOptions.explicitBuckets.bounds;
      let distribution = {
        count : value.length,
        mean : 0,
        sumOfSquaredDeviation : 0,
        bucketOptions : metric.definition.bucketOptions,
        bucketCounts : bounds.map(item => 0)
      }

      value.forEach(v => {
        distribution.mean += v;
        for( let i = 0; i <= bounds.length; i++ ) {
          if( bounds[i] > v ) {
            distribution.bucketCounts[i] += 1;
            break;
          }
        }
      });
      distribution.mean = distribution.mean / value.length;

      value.forEach(v => {
        distribution.sumOfSquaredDeviation += Math.pow(v - distribution.mean, 2);
      });

      // for some reason, some of this needs to be strings... I guess to support Int64?
      distribution.count = distribution.count+'';
      distribution.bucketCounts = distribution.bucketCounts.map(c => c+'');

      value = distribution;
    } else {
      value = value+'';
    }


    let dataPoint = {
      interval: {
        endTime: {
          seconds: Math.floor(Date.now() / 1000)
        }
      },
      value: {
        [valueType]: value,
      }
    }

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

    logger.info('sending metric', type, labels, dataPoint);

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