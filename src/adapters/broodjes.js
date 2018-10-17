import moment from 'moment';
import _ from 'lodash';
import weightedRandom from 'weighted-random';
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
    attachment += `Broodje ${element.broodje} - ${element.userName}\n`;
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

async function getWeights() {
  const data = await Broodje.find({ createdAt: { $gte: moment().startOf('day') } });
  try {
    const workload = await Broodje.aggregate([
      { $match: { createdAt: { $gte: new Date((new Date().getTime() - (30 * 24 * 60 * 60 * 1000))) } } },
      {
        $group: {
          _id: { name: '$userName', id: '$userId' },
          chinese: { $sum: { $cond: ['$chinese', 1, 0] } },
          participant: { $sum: { $cond: ['$chinese', 0, 1] } },
        },
      },
    ]);
    const weights = [];
    let totalWeight = 0;
    workload.forEach((e) => {
      if (_.find(data, o => o.userId === e._id.id) === undefined) {
        return;
      }
      let weight = (1 - (e.chinese / (e.chinese + e.participant)));
      weight = Math.round((weight ** 5) * 100) / 100;
      weights.push({
        weight,
        user: e._id,
        chinees: e.chinese,
        participant: e.chinese + e.participant,
      });
      totalWeight += weight;
    });
    weights.forEach((weight) => {
      weight.chance = Math.round((weight.weight / totalWeight) * 100);
    });
    return weights;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function broodjeHalen(event) {
  // first check if no chinese has been assigned today
  let chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
  if (chineseUser) {
    broodjesReaction(`${chineseUser.userName} haalt vandaag de broodjes!`, event, null);
  } else {
    try {
      const volunteers = await getWeights();
      const weights = volunteers.map(user => user.chance);
      // now we got a workforce, let's get our chinese volunteer
      const chineesIndex = weightedRandom(weights);
      const chinees = volunteers[chineesIndex].user;
      chineseUser = await Broodje.findOne({ createdAt: { $gte: moment().startOf('day') }, userId: chinees.id });
      chineseUser.chinese = true;
      await chineseUser.save();
      broodjesReaction(`${chineseUser.userName} haalt vandaag de broodjes!`, event, null);
    } catch (e) {
      console.log(e);
      broodjesReaction('Er is een probleem met het bepalen van de chinese vrijwilliger!', event, null);
    }
  }
}


async function broodjeHalenReset(event) {
  const chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
  if (chineseUser) {
    chineseUser.chinese = false;
    await chineseUser.save();
  }
  broodjesReaction('De chinese vrijwilliger is gereset!', event, null);
}

async function broodjeHalenSet(event) {
  const user = await Betty.getSlackUser(event.user);
  const newChineseUser = await Broodje.findOne({ userId: user.user.id, createdAt: { $gte: moment().startOf('day') } });
  if (!newChineseUser) {
    broodjesReaction('Je moet een broodje besteld hebben om te kunnen gaan halen', event, null);
  }
  // als user deelnemer is
  const chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
  if (chineseUser) {
    chineseUser.chinese = false;
    await chineseUser.save();
  }
  newChineseUser.chinese = true;
  await newChineseUser.save();
  broodjesReaction(`[UPDATE] ${newChineseUser.userName} haalt vandaag de broodjes!`, event, null);
}


async function broodjesStats(event) {
  const chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
  if (chineseUser) {
    broodjeHalen(event);
  } else {
    const countFrom = new Date((new Date().getTime() - (30 * 24 * 60 * 60 * 1000)));
    const weights = await getWeights();
    let attachment = '';

    weights.forEach((element) => {
      attachment += `${element.user.name} heeft ${Math.round(element.chance)}% kans om te gaan halen (C${element.chinees}/P${element.participant}/W${element.weight})\n`;
    });
    const attachmentData = {
      mrkdwn_in: ['text', 'pretext'],
      text: attachment,
    };
    broodjesReaction(`De kans wordt berekend op deelnames sinds ${moment(countFrom).format('DD/MM/YYYY')}`, event, attachmentData);
  }
}

function broodjesMenu(event) {
  broodjesReaction('Het menu kan je hier vinden http://goo.gl/SFgtl3', event, null);
}

async function broodjesLijst(event) {
  const lijst = await createBroodjeslijstAttachment();
  if (lijst === null) {
    return broodjesReaction('Er zijn vandaag nog geen broodjes besteld :disappointed:', event, null);
  }
  const message = `Broodjes ${moment().format('dddd DD MMMM')}\n`;
  return broodjesReaction(message, event, lijst);
}

async function addBroodje(broodje, user, event) {
  let besteldBroodje = await Broodje.findOne({ userId: user.id, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje gewijzigd naar *broodje ${broodje}* voor _${user.real_name}_`;
    besteldBroodje.broodje = broodje;
  } else {
    message = `*Broodje ${broodje}* toegevoegd voor _${user.real_name}_`;
    besteldBroodje = new Broodje({
      broodje,
      userName: user.real_name,
      userId: user.id,
      chinese: false,
    });
    const chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
    if (chineseUser) {
      chineseUser.chinese = false;
      await chineseUser.save();
    }
  }
  await besteldBroodje.save();
  broodjesReaction(message, event, null);
}

function help(event) {
  const message = 'Bestel een broodje *voor 11u*, de broodjes worden *om 12u gehaald* door een chinese vrijwilliger.\nDe volgende commands zijn beschikbaar:';
  let attachment = '';

  attachment += '*betty broodje smos kaas hesp*: je bestelt een broodje smos kaas hesp. Je kan dit natuurlijk wijzigen naar jouw eigen voorkeur. Voer dit command nog eens uit om jouw bestelling te wijzigen.\n';
  attachment += '*betty broodje delete/remove*: Verwijder jouw bestelling.\n';
  attachment += '*betty broodje menu*: Welke broodjes beschikbaar zijn.\n';
  attachment += '*betty broodje lijst*: De volledige lijst van bestellingen.\n';
  attachment += '*betty broodje halen*: Betty bepaalt wie het broodje moet gaan halen.\n';
  attachment += '*betty broodje halen ikke*: Geef jezelf op als vrijwilliger om de broodjes te halen.\n';
  attachment += '*betty broodje halen reset*: Reset de toewijzing van de chinese vrijwilliger.\n';
  attachment += '*betty broodje halen stats*: Bekijk de kansberekening wie het broodje vandaag haalt.\n';
  attachment += '*betty broodje help*: Deze boodschap.\n';
  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment,
  };

  broodjesReaction(message, event, attachmentData);
}

async function deleteBroodje(user, event) {
  const besteldBroodje = await Broodje.findOne({ userId: user.id, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Broodje verwijderd voor _${user.real_name}_`;
    besteldBroodje.remove();
  } else {
    message = `_${user.real_name}_ heeft geen broodje besteld`;
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

  if (sentence.length === 1 || sentence[1] === 'help') {
    help(event);
  } else if (sentence[1] === 'halen' && sentence[2] === 'reset') {
    broodjeHalenReset(event);
  } else if (sentence[1] === 'halen' && sentence[2] === 'ikke') {
    broodjeHalenSet(event);
  } else if (sentence[1] === 'halen') {
    broodjeHalen(event);
  } else if (sentence[1] === 'menu') {
    broodjesMenu(event);
  } else if (sentence[1] === 'stats') {
    broodjesStats(event);
  } else if (sentence[1] === 'delete' || sentence[1] === 'remove') {
    try {
      Betty.getSlackUser(event.user).then((user) => {
        deleteBroodje(user.user, event);
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
        addBroodje(broodjetext, user.user, event);
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
