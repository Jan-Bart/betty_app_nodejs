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

const messages = ['Dat ben jij natuurlijk {user}!', 'Wie anders dan {user}?', 'Ongetwijfeld is dat {user}', 'Checking git commits ..... result: {user}'];

function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ').replace(/\s+/g, ' ').toLowerCase();

  if (sentence.indexOf('wie is de beste') !== -1) {
    try {
      _betty2.default.getSlackUser(event.user).then(user => {
        const resp = {
          message: messages[Math.floor(Math.random() * messages.length)].replace('{user}', user.user.real_name),
          channel: event.channel
        };
        _betty2.default.emit('response', resp);
      }).catch(err => {
        console.log(err);
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    return false;
  }
  return true;
}