import moment from 'moment';
import { isNullOrUndefined } from 'util';
import Betty from '../betty';
import normalizeAndTokenizeText from '../helpers/normalizeAndTokenize';


moment.locale('nl');
const modules = [
  '*broodjes*: module ivm het bestellen van broodjes',
  '*irail*: module ivm de treinen.',
  '*status*: module ivm de status van applicaties',
  '*watis*: module ivm afkortingen en het zoeken van woorden',
  '*jira*: module ivm het zoeken van jira tickets',
  '*weer*: module ivm informatie over het weer',
];
const broodjes = [
  '*betty bestel smos kaas hesp*: je bestelt een broodje smos kaas hesp. Je kan dit natuurlijk wijzigen naar jouw eigen voorkeur. Voer dit command nog eens uit om jouw bestelling te wijzigen.',
  '*betty bestel delete/remove*: Verwijder jouw bestelling.',
  '*betty bestel menu*: Welke broodjes beschikbaar zijn.',
  '*betty bestel lijst*: De volledige lijst van bestellingen.',
  '*betty bestelling halen*: Betty bepaalt wie het broodje moet gaan halen.',
  '*betty bestelling halen ikke*: Geef jezelf op als vrijwilliger om de broodjes te halen.',
];
const irail = [
  '*betty trein naar Amsterdam*: geeft alle data ivm de treinen van Antwerpen-Zuid naar Amsterdam.',
];
const status = [
  '*betty status kanalen*: geeft de status van kanalen.',
];
const watis = [
  '*betty wat is jb*: geeft de informatia ivm de afkorting jb.',
  '*betty wat is add afkorting betekenis*: voegt afkortingen toe aan de database.',
  '*betty wat is delete afkorting*: verwijdert afkorting uit de database.',
];
const jira = [
  '*betty toon ZBCOSMO-18*: toont de informatie ivm het jira ticket ZBCOSMO-18.',
  '*betty zoek toast*: zoekt jira af voor ticketjes ivm het woord toast.',
];
const weer = [
  '*betty weer*: geeft een .gif van het weer.',
];

const modulemap = {
    broodjes,
    irail,
    status,
    watis,
    jira,
    weer,
};

export default function handle(event) {
  const sentence = normalizeAndTokenizeText(event.text);
  if(sentence[0] !== 'help')return false;
  if (isNullOrUndefined(sentence[1]) || sentence[1] === '') {
    const message = 'Help modules';
    let attachment = '';
    modules.forEach((module) => {
      attachment += `betty help ${module}\n`;
    });
    const attachmentData = {
      mrkdwn_in: ['text', 'pretext'],
      text: attachment,
    };
    const response = {
      message,
      channel: event.channel,
      attachments: attachmentData,
    };
    Betty.emit('response', response);
    return true;
  }

  const module = sentence[1];
  let found = false;
  modules.forEach((_module) => {
    if (_module.split(': ')[0] === `*${module}*`) {
      found = true;
    }
  });

  if (found !== true) {
    const response = {
      message: 'Module niet gevonden',
      channel: event.channel,
      attachments: null,
    };
    Betty.emit('response', response);
    return false;
  }
  const message = `betty help *${module}*`;
  let attachment = '';
  modulemap[module].forEach((info) => {
    attachment += `${info}\n`;
  });

  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment,
  };
  const response = {
    message,
    channel: event.channel,
    attachments: attachmentData,
  };
  Betty.emit('response', response);

  return true;
}
