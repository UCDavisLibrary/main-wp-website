import bunyan from 'bunyan'
import {LoggingBunyan} from '@google-cloud/logging-bunyan';
import config from './config.js';

const streams = [
  // Log to the console
  { stream: process.stdout }
];

// wire in stack driver if google cloud service account provided
if( config.google.keyfile ) {

  // create bunyan logger for stackdriver
  let loggingBunyan = new LoggingBunyan({
    projectId: config.google.projectId,
    keyFilename: config.google.keyfile,
    // enables error reporting on error
    serviceContext: {
      service: config.instance.name,
      version: config.instance.version
    }
  });

  // add new logger stream
  streams.push(loggingBunyan.stream(config.logging.level));
}

let logger = bunyan.createLogger({
  name: config.instance.name,
  level: config.logging.level,
  streams: streams
});

let info = {
  name: config.logging.name,
  level: config.logging.level,
  gcLogging : {
    enabled : config.google.keyfile ? true : false,
    file : config.google.keyfile
  }
}

logger.info('logger initialized', info);

export default logger;