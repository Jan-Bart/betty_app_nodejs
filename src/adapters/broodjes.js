import moment from 'moment';
import _ from 'lodash';
import schedule from 'node-schedule';
import Betty from '../betty';
import Broodje from '../models/broodje';

moment.locale('nl');

async function createBroodjeslijstAttachment() {
  const data = await Broodje.find({ createdAt: { $gte: moment().startOf('day') } });
  if (data.length === 0) {
    return null;
  }
  let attachment = '';

  data.forEach((element) => {
    attachment += `Broodje ${element.broodje} - ${element.user}\n`;
  });
  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment,
  };
  return attachmentData;
}

function broodjesReaction(message, event, attachments) {
  const response = {
    message,
    channel: event.channel,
    attachments,
  };
  Betty.emit('response', response);
}

async function broodjeHalen(event) {
  const data = await Broodje.find({ createdAt: { $gte: moment().startOf('day') } });
  const users = [];
  data.forEach((element) => {
    users.push(element.user);
  });

  const chinees = users[Math.floor(Math.random() * users.length)];

  broodjesReaction(`${chinees} haalt vandaag de broodjes!`, event, null);
}

function broodjesMenu(event) {
  broodjesReaction('Het menu kan je hier vinden http://goo.gl/SFgtl3', event, null);
}

async function broodjesLijst(event) {
  const lijst = await createBroodjeslijstAttachment();
  console.log(lijst);
  if (lijst === null) {
    return broodjesReaction('Er zijn vandaag nog geen broodjes besteld :disappointed:', event, null);
  }
  const message = `Broodjes ${moment().format('dddd DD MMMM')}\n`;
  return broodjesReaction(message, event, lijst);
}

async function addBroodje(broodje, user, event) {
  let besteldBroodje = await Broodje.findOne({ user, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje gewijzigd naar *broodje ${broodje}* voor _${user}_`;
    besteldBroodje.broodje = broodje;
  } else {
    message = `*Broodje ${broodje}* toegevoegd voor _${user}_`;
    besteldBroodje = new Broodje({
      broodje,
      user,
    });
  }
  await besteldBroodje.save();
  broodjesReaction(message, event, null);
}


async function deleteBroodje(user, event) {
  const besteldBroodje = await Broodje.findOne({ user, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje verwijderd voor _${user}_`;
    besteldBroodje.remove();
  } else {
    message = `_${user}_ heeft geen broodje besteld`;
  }
  broodjesReaction(message, event, null);
}

export default function handle(event) {
  if (!event.text) {
    return false;
  }
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');

  if (sentence[0] !== 'broodje' && sentence[0] !== 'broodjes') {
    return false;
  }

  if (sentence[1] === 'halen') {
    broodjeHalen(event);
  } else if (sentence[1] === 'menu') {
    broodjesMenu(event);
  } else if (sentence[1] === 'delete' || sentence[1] === 'remove') {
    try {
      Betty.getSlackUser(event.user).then((user) => {
        deleteBroodje(user.user.real_name, event);
      }).catch(err => console.log(err));
    } catch (err) {
      console.log(err);
    }
  } else if (sentence[1] === 'lijst') {
    broodjesLijst(event);
  } else {
    // get full string again for special characters etc
    const broodjetext = event.text.replace(/^(broodjes )/, '').replace(/^(broodje )/, '');
    try {
      Betty.getSlackUser(event.user).then((user) => {
        addBroodje(broodjetext, user.user.real_name, event);
      }).catch((err) => {
        console.log(err);
      });
    } catch (err) {
      console.log(err);
    }
  }
  return true;
}

schedule.scheduleJob('00 11 * * 1-5', async () => {
  const lijst = await createBroodjeslijstAttachment();
  const response = {
    message: '<!here> Heeft iedereen een broodje besteld?',
    channel: 'C03LXRAGP',
    attachments: lijst,
  };
  Betty.emit('response', response);
});
