import moment from 'moment';
import request from 'request';
import Betty from '../betty';
import Description from '../models/description';

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
async function addDescription(afkortingkje, description, event) {
  const descriptie = await Description.findOne({
    afkorting: afkortingkje,
  });

  if (descriptie) {
    descriptie.update({ betekenis: description }).then(() => {
      const response = {
        message: 'Afkorting gewijzigd in de database :)',
        channel: event.channel,
        attachments: null,
      };
      Betty.emit('response', response);
    });
    return true;
  }

  const newthing = new Description({
    afkorting: afkortingkje,
    betekenis: description,
  });

  newthing.save().then(() => {
    const response = {
      message: 'Afkorting toegevoegd aan de database :)',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
  });
  return true;
}


async function getDescription(afkortinga) {
  const data = await Description.find({
    afkorting: afkortinga,
  });
  if (data.length === 0) {
    return null;
  }
  return data;
}

async function deleteDescription(afkortingkje, event) {
  const todelete = await Description.findOne({
    afkorting: afkortingkje,
  });
  todelete.remove().then(() => {
    const response = {
      message: 'Afkorting verwijderd :)',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
  });

  return true;
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

  const commandsentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');
  let command = commandsentence[1];
  if (command === undefined) {
    return false;
  }
  if (command === 'is' || command === 's' || command === 'es') {
    command = commandsentence[2];
  }
  let eventtext = event.text; 
  eventtext = event.text.replace(commandsentence[0], '');
  if (command === 'add') {// Add afkorting in database
    command = eventtext.substring(eventtext.indexOf('add ') + 3);
    const afkorting = command.split(' ')[1];
    const betekenis = command.substring(command.indexOf(afkorting) + afkorting.length + 1);
    addDescription(afkorting, betekenis, event);
  } else if (command === 'delete') { // Delete afkorting
    command = eventtext.substring(eventtext.indexOf('delete ') + 6);
    const afkorting = command.split(' ')[1];
    deleteDescription(afkorting, event);
  } else { // Find in urbandictionary
    const [y] = command.split(' ');
    command = y;
    const descriptie = getDescription(command);

    descriptie.then((data) => {
      if (data == null) {
        request.get(`http://api.urbandictionary.com/v0/define?term=${match}`, (err, datareq, body) => {
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
        });
      } else {
        const response = {
          message: `*${data[0].afkorting}* \n${data[0].betekenis}`,
          channel: event.channel,
          attachments: null,
        };
        Betty.emit('response', response);
      }
    });
  }
}
