'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _helmet = require('helmet');

var _helmet2 = _interopRequireDefault(_helmet);

var _betty = require('./betty');

var _betty2 = _interopRequireDefault(_betty);

var _routes = require('./routes');

var _routes2 = _interopRequireDefault(_routes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  MONGO_USER,
  MONGO_PASS,
  MONGO_CONNECTIONSTRING
} = process.env;

let app;

function initializeDatabase(callback) {
  _mongoose2.default.Promise = global.Promise;
  let connectionString = 'mongodb://';
  connectionString += (MONGO_PASS && MONGO_USER ? `${MONGO_USER}:${MONGO_PASS}@` : '') + MONGO_CONNECTIONSTRING;
  _mongoose2.default.connect(connectionString, {
    useNewUrlParser: true
  });
  _mongoose2.default.connection.once('open', err => {
    if (err) {
      console.log('mongo error', err);
      return callback(err);
    }

    return callback();
  });
}

function initializeExpress(callback) {
  app = (0, _express2.default)();
  app.set('port', process.env.PORT);
  app.use((0, _helmet2.default)());
  app.use(_bodyParser2.default.json({ limit: '4096kb' }));

  app.use(_routes2.default);

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
  _glob2.default.sync('adapters/*.js', { cwd: __dirname }).forEach(adapter => {
    // eslint-disable-next-line
    const toImport = require(`${__dirname}/${adapter}`);
    _betty2.default.on('event', toImport.default);
  });
  return callback();
}

function start(cb) {
  // give some time for pre-initialization
  _async2.default.series([initializeDatabase, initializeExpress, startListening, initializeBetty], err => {
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

exports.default = {
  start,
  stop
};