import moment from 'moment';
import _ from 'lodash';
import weightedRandom from 'weighted-random';
import schedule from 'node-schedule';
import Betty from '../betty';
import Broodje from '../models/broodje';
import normalizeAndTokenizeText from '../helpers/normalizeAndTokenize';
const BROODJES_COMMANDS = ['bestel', 'bestelling', 'broodje', 'broodjes'];

moment.locale('nl');

async function createBroodjeslijstAttachment() {
  const data = await Broodje.find({ createdAt: { $gte: moment().startOf('day') } });
  if (data.length === 0) {
    return null;
  }

  const attachment = data
    .map(element => `${element.broodje} - ${element.userName}`)
    .join('\n');

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
    return broodjesReaction(`${chineseUser.userName} haalt vandaag de bestelling!`, event, null);
  }

  try {
    const volunteers = await getWeights();
    const weights = volunteers.map(user => user.chance);
    // now we got a workforce, let's get our chinese volunteer
    const chineesIndex = weightedRandom(weights);
    const chinees = volunteers[chineesIndex].user;
    chineseUser = await Broodje.findOne({ createdAt: { $gte: moment().startOf('day') }, userId: chinees.id });
    chineseUser.chinese = true;
    await chineseUser.save();
    broodjesReaction(`${chineseUser.userName} haalt vandaag de bestelling!`, event, null);
  } catch (e) {
    console.log(e);
    broodjesReaction('Er is een probleem met het bepalen van de chinese vrijwilliger!', event, null);
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
    broodjesReaction('Je moet iets besteld hebben om te kunnen gaan halen', event, null);
  }
  // als user deelnemer is
  const chineseUser = await Broodje.findOne({ chinese: true, createdAt: { $gte: moment().startOf('day') } });
  if (chineseUser) {
    chineseUser.chinese = false;
    await chineseUser.save();
  }
  newChineseUser.chinese = true;
  await newChineseUser.save();
  broodjesReaction(`[UPDATE] ${newChineseUser.userName} haalt vandaag de bestelling!`, event, null);
}


async function broodjesStats(event) {
  const countFrom = new Date((new Date().getTime() - (30 * 24 * 60 * 60 * 1000)));
  const weights = await getWeights();

  const attachment = weights
    .map((el) => `${el.user.name} heeft ${Math.round(el.chance)}% kans om te gaan halen (C${el.chinees}/P${el.participant}/W${el.weight})`)
    .join('\n');

  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment,
  };
  broodjesReaction(`De kans wordt berekend op deelnames sinds ${moment(countFrom).format('DD/MM/YYYY')}`, event, attachmentData);
}

function broodjesMenu(event) {
  broodjesReaction('Het menu kan je hier vinden http://goo.gl/SFgtl3', event, null);
}

async function broodjesLijst(event) {
  const lijst = await createBroodjeslijstAttachment();
  if (lijst === null) {
    return broodjesReaction('Er is vandaag nog niets besteld :disappointed:', event, null);
  }
  const message = `Bestelling  ${moment().format('dddd DD MMMM')}\n`;
  return broodjesReaction(message, event, lijst);
}

async function addBroodje(event) {
  const { user } = await Betty.getSlackUser(event.user);
  const broodje = event.text.replace(/^(bestelling )/, '').replace(/^(bestel )/, '');
  let besteldBroodje = await Broodje.findOne({ userId: user.id, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Bestelling gewijzigd naar * ${broodje}* voor _${user.real_name}_`;
    besteldBroodje.broodje = broodje;
  } else {
    message = `*Bestelling ${broodje}* toegevoegd voor _${user.real_name}_`;
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

  attachment += '*betty bestel smos kaas hesp*: je bestelt een broodje smos kaas hesp. Je kan dit natuurlijk wijzigen naar jouw eigen voorkeur. Voer dit command nog eens uit om jouw bestelling te wijzigen.\n';
  attachment += '*betty bestel delete/remove*: Verwijder jouw bestelling.\n';
  attachment += '*betty bestel menu*: Welke broodjes beschikbaar zijn.\n';
  attachment += '*betty bestel lijst*: De volledige lijst van bestellingen.\n';
  attachment += '*betty bestelling halen*: Betty bepaalt wie het broodje moet gaan halen.\n';
  attachment += '*betty bestelling halen ikke*: Geef jezelf op als vrijwilliger om de broodjes te halen.\n';
  attachment += '*betty bestelling halen reset*: Reset de toewijzing van de chinese vrijwilliger.\n';
  attachment += '*betty bestelling stats*: Bekijk de kansberekening wie het broodje vandaag haalt.\n';
  attachment += '*betty bestel help*: Deze boodschap.\n';
  const attachmentData = {
    mrkdwn_in: ['text', 'pretext'],
    text: attachment,
  };

  broodjesReaction(message, event, attachmentData);
}

async function deleteBroodje(event) {

  const { user } = await Betty.getSlackUser(event.user);
  const besteldBroodje = await Broodje.findOne({ userId: user.id, createdAt: { $gte: moment().startOf('day') } });

  let message = 'Geen idee wat ik moet doen nu ¯\\_(ツ)_/¯';

  if (besteldBroodje) {
    message = `Bestelling verwijderd voor _${user.real_name}_`;
    besteldBroodje.remove();
  } else {
    message = `_${user.real_name}_ heeft niets besteld`;
  }
  broodjesReaction(message, event, null);
}

const COMMAND_HANDLERS = {
  halen: newProxy({
    reset: broodjeHalenReset,
    ikke: broodjesHalenSet,
    stats: broodjesStats,
  }, {
    get: (obj, prop) => {
      const value = obj[prop];
      if(!value) {
        return broodjeHalen
      }
    }
  }),
  menu: broodjesMenu,
  stats: broodjesStats,
  lijst: broodjesLijst,
  help: help,
  delete: deleteBroodje,
  remove: deleteBroodje
}


export default function handle(event) {
  if (!event.text) {
    return false;
  }
  const sentence = normalizeAndTokenizeText(event.text);
  const [broodjesCommand, command, subcommand] = sentence;
   if (broodjesCommand === 'bestellijst') {
    return broodjesLijst(event);
  }

  if (!BROODJES_COMMANDS.includes(sentence[0])) {
    return false;
  }

  if (sentence.length === 1) {
    return help(event);
  } 

  let commandHandler = COMMAND_HANDLERS[command];
  if(command === 'halen') {
    commandHandler = COMMAND_HANDLERS.halen[subcommand];
  }

  try {
    if(commandHandler) {
      return commandHandler(event);
    }

    return addBroodje(event);
  } catch(err) {
    console.log(err);
  }
  return true;
}

schedule.scheduleJob('00 11 * * 1-5', async () => {
  const lijst = await createBroodjeslijstAttachment();
  const response = {
    message: '<!here> Heeft iedereen besteld?',
    channel: 'C03LXRAGP',
    attachments: lijst,
  };
  Betty.emit('response', response);
});
