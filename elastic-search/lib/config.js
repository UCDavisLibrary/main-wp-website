import fs from 'fs';
const env = process.env;


// GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_PROJECT_ID are required for
// opencensus authentication
let gcProjectId = '';
if( env.GOOGLE_APPLICATION_CREDENTIALS ) {
  gcProjectId = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8')).project_id;
  env.GOOGLE_PROJECT_ID = gcProjectId;
}

let WP_TYPES = env.WORDPRESS_POST_TYPES;
if( WP_TYPES ) {
  WP_TYPES = WP_TYPES.split(',').map(item => item.toLowerCase().trim())
}

const config = {

  service : {
    port : env.PORT || '3000'
  },

  libguides : {
    harvestSchedule : env.LIBGUIDES_CRON || '0 5 * * *',
    staleTime : env.LIBGUIDES_STALE_TIME || 1000 * 60 * 60 * 24 * 2 // 2 days
  },

  wordpress : {
    types : WP_TYPES || ['post', 'page', 'location']
  },

  instance : {
    name : env.INSTANCE_NAME || 'generic-website-instance-label',
    version : env.APP_VERSION || '-1'
  },

  google : {
    keyfile : env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId : gcProjectId,
  },

  storage : {
    bucket : env.GOOGLE_CLOUD_BUCKET || 'libguides-indexer-main',
    indexFile : 'index.json',
    databaseFile : 'databases.json'
  },

  logging : {
    level : env.LOG_LEVEL || 'info'
  },

  mysql : {
    host : env.WORDPRESS_DB_HOST || env.DB_HOST || 'db:3306',
    database : env.WORDPRESS_DB_DATABASE || env.DB_DATABASE || 'wordpress',
    password : env.WORDPRESS_DB_PASSWORD || env.DB_PASSWORD ||  'wordpress',
    user : env.WORDPRESS_DB_USER || env.DB_USER || 'wordpress'
  },

  elasticSearch : {
    host : env.ELASTIC_SEARCH_HOST || 'elasticsearch',
    port : env.ELASTIC_SEARCH_PORT || '9200',
    username : env.ELASTIC_SEARCH_USERNAME || 'elastic',
    password : env.ELASTIC_SEARCH_PASSWORD || 'changeme',
    requestTimeout : env.ELASTIC_SEARCH_REQUEST_TIME || 3*60*1000,
    indexAlias : 'main-website',
    fields : {
      exclude : ['_'],
    }
  },

  metrics : {
    exportInterval : parseInt(env.EXPORT_INTERVAL || 60),
    indexAgeWarning : 48, // hours
    indexStatus : {
      SUCCESS : 'success',
      ERROR : 'error',
      IGNORED_NO_UPDATE : 'ignored-no-update',
      IGNORED : 'ignored'
    },

    // this is dumb... the metric point type defined in the metric (below), has a deferent attribute
    // name when actually reporting the dataPoint in the timeSeriesData. this maps the difference.
    pointValueMap : {
      INT64 : 'int64Value',
      DOUBLE : 'doubleValue',
      DISTRIBUTION : 'distributionValue'
    },

    definitions : {
      "page-index-status" : {
        description: 'Webpage status at time of indexing (success, failure, ignored, etc)',
        displayName: 'Main website page - ElasticSearch index status',
        type: 'custom.googleapis.com/main-website/page-index-status',
        metricKind: 'GAUGE',
        valueType: 'INT64',
        unit: '1',
        labels: [
          {
            key: 'instance',
            valueType: 'STRING',
            description: 'Website instance name',
          },
          {
            key: 'source',
            valueType: 'STRING',
            description: 'webpage source, ie libguide, wordpress',
          },
          {
            key: 'type',
            valueType: 'STRING',
            description: 'webpage type, ie guide, news, website',
          },
          {
            key: 'status',
            valueType: 'STRING',
            description: 'ex: success, error, ignored',
          }
        ]
      },

      "page-index-age" : {
        description: 'How old the record being indexed is at time of indexing',
        displayName: 'Main website page - ElasticSearch index age',
        type: 'custom.googleapis.com/main-website/page-index-age',
        metricKind: 'GAUGE',
        valueType: 'DISTRIBUTION',
        bucketOptions: {
          explicitBuckets: {
            bounds: [1, 3, 6, 12, 24, 48, 96, 168]
          }
        },
        unit: 'h',
        labels: [
          {
            key: 'instance',
            valueType: 'STRING',
            description: 'Website instance name',
          },
          {
            key: 'source',
            valueType: 'STRING',
            description: 'webpage source, ie libguide, wordpress',
          },
          {
            key: 'type',
            valueType: 'STRING',
            description: 'webpage type, ie guide, news, website',
          }
        ]
      },

      "page-index-max-age" : {
        description: 'Max age of record being indexed for given interval',
        displayName: 'Main website page - ElasticSearch index max age',
        type: 'custom.googleapis.com/main-website/page-index-max-age',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
        unit: 'h',
        labels: [
          {
            key: 'instance',
            valueType: 'STRING',
            description: 'Website instance name',
          },
          {
            key: 'source',
            valueType: 'STRING',
            description: 'webpage source, ie libguide, wordpress',
          },
          {
            key: 'type',
            valueType: 'STRING',
            description: 'webpage type, ie guide, news, website',
          }
        ]
      }

    }
  }
}

export default config