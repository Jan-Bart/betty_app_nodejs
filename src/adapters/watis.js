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
  let descriptie = await Description.findOne({ afkorting:afkortingkje, betekenis:description});

  if(descriptie){
    const response = {
      message: 'Die descriptie betaat al',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
    return true;
  }

  const newthing = new Description({
    afkorting:afkortingkje,
    betekenis:description
  });

  newthing.save().then( function(data) {
    const response = {
      message: 'Afkorting toegevoegd aan de database :)',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
  });
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

    addDescription(afkorting, betekenis, event);
  }
  else{
    command = command.split(' ')[0];
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
            return true;
          }
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
        //ignore <----> urban dictionary
        });
      }
      else{
        const response = {
          message: 'Afkorting: ' + data[0].afkorting + ' - Betekenis: ' + data[0].betekenis,
          channel: event.channel,
          attachments: null,
        };
        Betty.emit('response', response);
      }
    })
  }
}