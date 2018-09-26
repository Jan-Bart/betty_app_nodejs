'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handle;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _betty = require('../betty');

var _betty2 = _interopRequireDefault(_betty);

var _broodje = require('../models/broodje');

var _broodje2 = _interopRequireDefault(_broodje);

var _nodeSchedule = require('node-schedule');

var _nodeSchedule2 = _interopRequireDefault(_nodeSchedule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_moment2.default.locale('nl');

const j = _nodeSchedule2.default.scheduleJob('00 11 * * *', function () {
  const response = {
    message: 'Heeft iedereen een broodje besteld?',
    channel: 'C03LXRAGP',
    attachments: null
  };
  _betty2.default.emit('response', response);
});

function broodjesReaction(message, event, attachments) {
  const response = {
    message,
    channel: event.channel,
    attachments
  };
  _betty2.default.emit('response', response);
}

async function broodjeHalen(event) {
  const data = await _broodje2.default.find({ createdAt: { $gte: (0, _moment2.default)().startOf('day') } });
  const users = [];
  data.forEach(element => {
    users.push(element.user);
  });

  const chinees = users[Math.floor(Math.random() * users.length)];

  broodjesReaction(`${chinees} haalt vandaag de broodjes!`, event, null);
}

function broodjesMenu(event) {
  broodjesReaction('Het menu kan je hier vinden http://goo.gl/SFgtl3', event, null);
}

async function broodjesLijst(event) {
  const data = await _broodje2.default.find({ createdAt: { $gte: (0, _moment2.default)().startOf('day') } });
  if (data.length === 0) {
    return broodjesReaction('Er zijn vandaag nog geen broodjes besteld :disappointed:', event, null);
  }
  const message = `Broodjes ${(0, _moment2.default)().format('dddd DD MMMM')}\n`;
  let attachment = '';

  data.forEach(element => {
    attachment += `Broodje ${element.broodje} - ${element.user}\n`;
  });
  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment
  };
  return broodjesReaction(message, event, attachmentData);
}

async function addBroodje(broodje, user, event) {
  let besteldBroodje = await _broodje2.default.findOne({ user, createdAt: { $gte: (0, _moment2.default)().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje gewijzigd naar *broodje ${broodje}* voor _${user}_`;
    besteldBroodje.broodje = broodje;
  } else {
    message = `*Broodje ${broodje}* toegevoegd voor _${user}_`;
    besteldBroodje = new _broodje2.default({
      broodje,
      user
    });
  }
  await besteldBroodje.save();
  broodjesReaction(message, event, null);
}

async function deleteBroodje(user, event) {
  const besteldBroodje = await _broodje2.default.findOne({ user, createdAt: { $gte: (0, _moment2.default)().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje verwijderd voor _${user}_`;
    besteldBroodje.remove();
  } else {
    message = `_${user}_ heeft geen broodje besteld`;
  }
  broodjesReaction(message, event, null);
}

function handle(event) {
  if (!event.text) {
    return false;
  }
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ');

  if (sentence[0] !== 'broodje' && sentence[0] !== 'broodjes') {
    return false;
  }

  if (sentence[1] === 'halen') {
    broodjeHalen(event);
  } else if (sentence[1] === 'menu') {
    broodjesMenu(event);
  } else if (sentence[1] === 'delete' || sentence[1] === 'remove') {
    try {
      _betty2.default.getSlackUser(event.user).then(user => {
        deleteBroodje(user.user.real_name, event);
      }).catch(err => console.log(err));
    } catch (err) {
      console.log(err);
    }
  } else if (sentence[1] === 'lijst') {
    broodjesLijst(event);
  } else {
    sentence.shift();
    try {
      _betty2.default.getSlackUser(event.user).then(user => {
        addBroodje(sentence.join(' '), user.user.real_name, event);
      }).catch(err => {
        console.log(err);
      });
    } catch (err) {
      console.log(err);
    }
  }
  return true;
}