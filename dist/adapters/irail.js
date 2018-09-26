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
  if (event.text.indexOf('trein naar') === -1) {
    return false;
  }

  const destination = event.text.split('trein naar ').pop();

  const url = `https://api.irail.be/connections/?from=Antwerpen-centraal&to=
    ${destination}&date=${(0, _moment2.default)().format('DDMMYY')}&time=${(0, _moment2.default)().format('HHmm')}
    &timesel=departure&format=json&lang=nl&fast=false&typeOfTransport=trains&alerts=false&results=6`;
  _request2.default.get(url, (err, data) => {
    if (err) {
      return;
    }
    const connections = [];
    const info = JSON.parse(data.body);
    info.connection.forEach(conn => {
      connections.push({
        departure: {
          station: conn.departure.station,
          time: _moment2.default.unix(conn.departure.time).format('HH:mm')
        },
        arrival: {
          station: conn.arrival.station,
          time: _moment2.default.unix(conn.arrival.time).format('HH:mm')
        }
      });
    });
    const message = `De volgende treinen vertrekken naar ${destination}\n`;
    let attachment = '';

    connections.forEach(element => {
      attachment += `• Om ${element.departure.time}u in ${element.departure.station}, aankomst om ${element.arrival.time}u in ${element.arrival.station}\n`;
    });
    const attachments = {
      mrkdwn_in: ['text', 'pretext'],
      text: attachment
    };
    const resp = {
      message,
      channel: event.channel,
      attachments
    };
    _betty2.default.emit('response', resp);
  });
  return true;
}