import fs from 'fs';
const env = process.env;


let gcProjectId = '';
if( env.GOOGLE_APPLICATION_CREDENTIALS ) {
  gcProjectId = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8')).project_id;
}

const config = {

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
    indexFile : 'index.json'
  },

  logging : {
    level : env.LOG_LEVEL || 'info'
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
    definitions : {
      "index-status" : {
        description: 'Main website ElasticSearch record indexed (success or failure)',
        displayName: 'Main website record indexed',
        type: 'custom.googleapis.com/website/es-record-indexed',
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
            description: 'record data source, ie libguide, wordpress',
          },
          {
            key: 'type',
            valueType: 'STRING',
            description: 'record type, ie guide, news, website',
          },
          {
            key: 'status',
            valueType: 'STRING',
            description: 'ex: success, error, ignored',
          }
        ]
      }
    }
  }
}

export default config