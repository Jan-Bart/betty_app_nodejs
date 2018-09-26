'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handle;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _betty = require('../betty');

var _betty2 = _interopRequireDefault(_betty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_moment2.default.locale('nl');

function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ');

  if (sentence[0] !== 'status') {
    return false;
  }

  try {
    (0, _request2.default)(`https://www.antwerpen.be/status/${sentence[1]}`, (error, response, body) => {
      const version = JSON.parse(body);
      const resp = {
        message: `Op ${sentence[1]} staat nu *${version.version}*`,
        channel: event.channel,
        attachments: null
      };
      _betty2.default.emit('response', resp);
    });
  } catch (err) {
    console.log(err);
  }
  return true;
}