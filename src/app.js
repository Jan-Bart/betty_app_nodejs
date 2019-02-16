import mongoose from 'mongoose';
import async from 'async';
import express from 'express';
import glob from 'glob';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import Betty from './betty';
import routes from './routes';

const {
  MONGO_USER,
  MONGO_PASS,
  MONGO_CONNECTIONSTRING,
} = process.env;


let app;


function initializeDatabase(callback) {
  mongoose.Promise = global.Promise;
  let connectionString = 'mongodb://';
  connectionString += (MONGO_PASS && MONGO_USER ? `${MONGO_USER}:${MONGO_PASS}@` : '') + MONGO_CONNECTIONSTRING;
  mongoose.connect(connectionString, {
    useNewUrlParser: true,
  });
  mongoose.connection.once('open', (err) => {
    if (err) {
      console.log('mongo error', err);
      return callback(err);
    }

    return callback();
  });
}


function initializeExpress(callback) {
  app = express();
  app.set('port', process.env.PORT);
  app.use(helmet());
  app.use(bodyParser.json({ limit: '4096kb' }));

  app.use((req, res, next) => {
    logger.info(req.method + ' ' + req.url);
    return next();
  });

  app.use(routes);

  app.use((err, req, res, next) => {
    console.log(err);
    return next(err);
  });

  // Status handler
  return callback();
}

function startListening(callback) {
  app.listen(app.get('port'), () => {
    console.log(`Express server listening on port ${app.get('port')}`);
    return callback();
  });
}

function initializeBetty(callback) {
  glob.sync('adapters/*.js', { cwd: __dirname }).forEach((adapter) => {
    // eslint-disable-next-line
    const toImport = require(`${__dirname}/${adapter}`); 
    Betty.on('event', toImport.default);
  });
  return callback();
}


function start(cb) {
  // give some time for pre-initialization
  async.series([
    initializeDatabase,
    initializeExpress,
    startListening,
    initializeBetty,
  ], (err) => {
    if (err) {
      console.error(`Error occured ${err}`);
      return process.exit(1);
    }
    if (cb && typeof cb === 'function') {
      return cb(err);
    }
    return cb;
  });
}

function stop() {
  app.close();
}

export default {
  start,
  stop,
};
