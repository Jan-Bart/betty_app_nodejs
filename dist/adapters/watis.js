'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handle;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _betty = require('../betty');

var _betty2 = _interopRequireDefault(_betty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_moment2.default.locale('nl');

const sorry = ['Het spijt me {user}, ik heb geen idee.', 'Hoe moet ik dat nu weten?', 'Sorry {user}, ik weet dat niet :(', '*Geeeuw* wat zeg je, {user}?'];

const matches = ['wat is', 'waddis', 'wuk es', 'what is', 'what s', 'waddis'];

const descriptions = [['acpaas', '*ACPaaS* \n_Antwerp City Platform as a Service_'], ['alm', '*ALM* \n_Application lifecycle management_'], ['bff', '*BFF* \n_Backend For Frontend_'], ['amap', '*AMAP* \n_Algemene meldingen app_'], ['braas', '*BRaaS* \n_Business Roles as a Service_'], ['bza', '*BZA* \n_Brandweer Zone Antwerpen_'], ['crs', '*CRS* \n_Centraal Referentie Systeem_'], ['daas', '*DAAS* \n_Digipolis Antwerp Application Stack_'], ['dl', '*DL* \n_District & Loketwerking_'], ['dxp', '*DXP* \n_Digital eXperience Platform_'], ['fmo', '*FMO* \n_Facility Management Openbaar domein_'], ['gdp', '*GDP* \n_Generiek Dossier Platform_'], ['gfp', '*GFP* \n_SAP onderdeel (verkopen)_'], ['gmp', '*GMP* \n_Generiek Meldingen Platform_'], ['gvp', '*GVP* \n_Generiek Verkoop Platform_'], ['iam', '*IAM* \n_Identity & Access Management_'], ['idc', '*IDC* \n_Uniek id van CRS-O (mapt 1-op-1 met KBO-nummer)_'], ['klm', '*KLM* \n_Klanten Management_ :airplane:'], ['love', ':heart: https://www.youtube.com/watch?v=HEXWRTEbj1I'], ['lpa', '*LPA* \n_Lokale Politie Antwerpen_ :female-police-officer:'], ['lrs', '*LRS* \n_Lokaal Referentie Systeem_'], ['mdm', '*MDM* \n_Mobile device management_'], ['os', '*OS* \n_Ondernemen & Stadsmarketing_\n_Operating System_'], ['sc', '*SC* \n_Strategische Coördinatie_'], ['solipsisme', '*Solipsisme* \n_Solipsisme is het geloof of de filosofie dat er maar een enkel bewustzijn bestaat: dat van de waarnemer. Het hele universum en alle andere personen waarmee gecommuniceerd wordt bestaan slechts in de geest van de waarnemer._'], ['um', '*UM* \n_User Management_\n Bereikbaar op https://um.antwerpen.be'], ['ume', '*UME* \n_User Management Engine_'], ['wbs', '*WBS* \n_Work-Breakdown Structure_'], ['wcm', '*WCM* \n_Web Content Management (system)_\n Meer info bij het ALM-team.']];

function findMatch(string) {
  let found = false;
  let parsed = false;
  matches.forEach(match => {
    if (string.indexOf(match) !== -1) {
      parsed = string.replace(match, '');
      found = true;
    }
  });
  if (found === false) {
    return false;
  }
  return parsed.replace(/\s+/g, ' ').trim();
}

function handle(event) {
  if (!event.text) {
    return false;
  }
  const sentence = event.text.replace(/[.,?!;()''-]/g, ' ').replace(/\s+/g, ' ').toLowerCase();

  const match = findMatch(sentence);
  if (match === false) {
    return false;
  }
  const found = _lodash2.default.find(descriptions, el => {
    return el[0] === match;
  });

  if (found !== undefined) {
    const resp = {
      message: found[1],
      channel: event.channel,
      attachments: null
    };
    _betty2.default.emit('response', resp);
  } else {
    // try urban dictionary
    _request2.default.get(`http://api.urbandictionary.com/v0/define?term=${match}`, (err, data, body) => {
      if (err) {
        _betty2.default.getSlackUser(event.user).then(user => {
          const resp = {
            message: sorry[Math.floor(Math.random() * sorry.length)].replace('{user}', user.user.profile.first_name),
            channel: event.channel
          };
          _betty2.default.emit('response', resp);
        });
      } else {
        const b = JSON.parse(body);
        if (b.list.length > 0) {
          const attachments = {
            mrkdwn_in: ['text', 'pretext'],
            text: b.list[0].definition,
            title: b.list[0].word,
            title_link: b.list[0].permalink
          };
          const resp = {
            message: '',
            channel: event.channel,
            attachments
          };

          _betty2.default.emit('response', resp);
        } else {
          _betty2.default.getSlackUser(event.user).then(user => {
            const resp = {
              message: sorry[Math.floor(Math.random() * sorry.length)].replace('{user}', user.user.profile.first_name),
              channel: event.channel
            };
            _betty2.default.emit('response', resp);
          });
        }
      }
    });
  }
}