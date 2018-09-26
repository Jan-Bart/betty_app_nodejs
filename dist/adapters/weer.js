'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handle;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _betty = require('../betty');

var _betty2 = _interopRequireDefault(_betty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_moment2.default.locale('nl');

function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ');

  if (sentence[0] === 'buienradar') {
    const url = 'http://api.buienradar.nl/image/1.0/radarmapbe?width=550';
    const message = `Buienradar om ${(0, _moment2.default)().format('HH:mm')}u: \n`;
    const attachments = {
      fallback: 'buienradar',
      image_url: url
    };
    const resp = {
      message,
      channel: event.channel,
      attachments
    };
    _betty2.default.emit('response', resp);
  } else {
    return false;
  }
  return true;
}