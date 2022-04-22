import express from 'express';
import config from './lib/config.js';
import logger from './lib/logger.js';

import es from './lib/elastic-search.js';
import gcs from './lib/harvest/gcs.js';
import wp from './lib/harvest/wp.js';

const app = express();

let reindexRunning = false;
app.get('/reindex', async (req, res) => {
  if( reindexRunning ) {
    return res.json({status: 'already running'});
  }

  let rebuildSchema = (req.query.rebuildSchema === 'true');

  reindexRunning = true;
  res.json({status: 'started', rebuildSchema});
  
  if( rebuildSchema ) {
    await es.deleteIndex();
    await es.ensureIndex();
  }

  await wp.reharvestAll();
  await gcs.run();
  reindexRunning = false;
});

async function init() {
  await wp.init();
  wp.startInterval();
  await gcs.init();
}


app.listen(config.service.port, () => {
  init();
  logger.info('Main website indexer service running on port: '+config.service.port);
});