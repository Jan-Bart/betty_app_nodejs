import moment from 'moment';
import _ from 'lodash';
import request from 'request';
import Betty from '../betty';
import Description from '../models/description.js'

moment.locale('nl');

const sorry = [
  'Het spijt me {user}, ik heb geen idee.',
  'Hoe moet ik dat nu weten?',
  'Sorry {user}, ik weet dat niet :(',
  '*Geeeuw* wat zeg je, {user}?',
];

const matches = [
  'wat is',
  'waddis',
  'wuk es',
  'what is',
  'what s',
  'waddis',
];

const descriptions = [
  ['acpaas', '*ACPaaS* \n_Antwerp City Platform as a Service_'],
  ['alm', '*ALM* \n_Application lifecycle management_'],
  ['bff', '*BFF* \n_Backend For Frontend_'],
  ['amap', '*AMAP* \n_Algemene meldingen app_'],
  ['braas', '*BRaaS* \n_Business Roles as a Service_'],
  ['bza', '*BZA* \n_Brandweer Zone Antwerpen_'],
  ['crs', '*CRS* \n_Centraal Referentie Systeem_'],
  ['daas', '*DAAS* \n_Digipolis Antwerp Application Stack_'],
  ['dl', '*DL* \n_District & Loketwerking_'],
  ['dxp', '*DXP* \n_Digital eXperience Platform_'],
  ['et', '*ET* \n_Evenementen tool_'],
  ['fmo', '*FMO* \n_Facility Management Openbaar domein_'],
  ['gdp', '*GDP* \n_Generiek Dossier Platform_'],
  ['gfp', '*GFP* \n_Generiek Financiëel Platform_\n_SAP onderdeel (verkopen)_'],
  ['gmp', '*GMP* \n_Generiek Meldingen Platform_'],
  ['gvp', '*GVP* \n_Generiek Verkoop Platform_'],
  ['iam', '*IAM* \n_Identity & Access Management_'],
  ['iod', '*IOD* \n_Inname openbaar domein_'],
  ['idc', '*IDC* \n_Uniek id van CRS-O (mapt 1-op-1 met KBO-nummer)_'],
  ['klm', '*KLM* \n_Klanten Management_ :airplane:'],
  ['lpa', '*LPA* \n_Lokale Politie Antwerpen_ :female-police-officer:'],
  ['lrs', '*LRS* \n_Lokaal Referentie Systeem_'],
  ['mdm', '*MDM* \n_Mobile device management_'],
  ['os', '*OS* \n_Ondernemen & Stadsmarketing_\n_Operating System_'],
  ['ovmr', '*OVMR* \n_Ondernemen Volgens Minder Regels_'],
  ['sc', '*SC* \n_Strategische Coördinatie_'],
  ['solipsisme', '*Solipsisme* \n_Solipsisme is het geloof of de filosofie dat er maar een enkel bewustzijn bestaat: dat van de waarnemer. Het hele universum en alle andere personen waarmee gecommuniceerd wordt bestaan slechts in de geest van de waarnemer._'],
  ['um', '*UM* \n_User Management_\n Bereikbaar op https://um.antwerpen.be'],
  ['ume', '*UME* \n_User Management Engine_'],
  ['wbs', '*WBS* \n_Work-Breakdown Structure_'],
  ['wcm', '*WCM* \n_Web Content Management (system)_\n Meer info bij het ALM-team.'],
];

function findMatch(string) {
  let found = false;
  let parsed = false;
  matches.forEach((match) => {
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
async function addDescription(afkortingkje, description,event){
  let descriptie = await Description.findOne({ afkorting:afkortingkje, betekening:description});

  if(descriptie){
    const response = {
      message: 'Die descriptie betaat al',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
  }else{
    let newthing = new Description({
      afkorting:afkortingkje,
      betekening:description
    });
    newthing.save();
    const response = {
      message: 'Afkorting toegevoegd aan de database :)',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
  }
}

async function getDescription(afkortinga) {
  const data = await Description.find({ afkorting:afkortinga });
  if (data.length === 0) {
    return null;
  }
  return data;
}
export default function handle(event) {

  if (!event.text) {
    return false;
  }
  const sentence = event.text.replace(/[.,?!;()''-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const match = findMatch(sentence);
  if (match === false) {
    return false;
  }
  
  if(Math.floor(Math.random() * 2) === 1) {
    descriptions.push(['love', ':heart: https://www.youtube.com/watch?v=HEXWRTEbj1I']);
  } else {
    descriptions.push(['love', 'A neurochemical con job. :heart:']);
  }
  const commandsentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');
  let command = commandsentence[1];
  if(command == undefined){
    return false;
  }
  if(command == "is" || command == "s" || command == "es"){
    command = commandsentence[2];
  }
  event.text = event.text.replace(commandsentence[0], '');
  if(command == "add"){
    command = event.text.substring(event.text.indexOf('add ') + 3)

    let afkorting = command.split(' ')[1];
    let betekenis = command.substring(command.indexOf(afkorting) + afkorting.length+1);
    console.log("Afkorting: " + afkorting + " betekenis: " + betekenis.replace(' ', ''));

    addDescription(afkorting, betekenis, event);
  }
  else{
    command = command.split(' ')[0];
    console.log(command);
    let descriptie = getDescription(command)

    descriptie.then(function(data) {
      if(data == null){
          request.get(`http://api.urbandictionary.com/v0/define?term=${match}`, (err, data, body) => {
          if (err) {
            Betty.getSlackUser(event.user).then((user) => {
              const resp = {
                message: sorry[Math.floor(Math.random() * sorry.length)].replace('{user}', user.user.profile.first_name),
                channel: event.channel,
              };
              Betty.emit('response', resp);
            });
          } else {
            const b = JSON.parse(body);
            if (b.list.length > 0) {
              const attachments = {
                mrkdwn_in: ['text', 'pretext'],
                text: b.list[0].definition,
                title: b.list[0].word,
                title_link: b.list[0].permalink,
              };
              const resp = {
                message: '',
                channel: event.channel,
                attachments,
              };
              
              Betty.emit('response', resp);
            } else {
              Betty.getSlackUser(event.user).then((user) => {
                const resp = {
                  message: sorry[Math.floor(Math.random() * sorry.length)].replace('{user}', user.user.profile.first_name),
                  channel: event.channel,
                };
                Betty.emit('response', resp);
              });
            }
          }//ignore <----> urban dictionary
        });
      }
      else{
        //console.log(data[0].betekening) // "Some User token"
        const response = {
          message: 'Afkorting: ' + data[0].afkorting + ' - Betekenis: ' + data[0].betekening,
          channel: event.channel,
          attachments: null,
        };
        Betty.emit('response', response);
      }
    })
  }


  /*const found = _.find(descriptions, (el) => {
    return el[0] === match;
  });

  if (found !== undefined) {
    const resp = {                                                        //TODO: replace with mongodb get
      message: found[1],
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', resp);
  } else {
    // try urban dictionary
    
  }*/
}