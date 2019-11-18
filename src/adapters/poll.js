import * as PollService from '../services/poll';
import * as SlackUserService from '../services/slackUser';

let betty;

function matchAll(subject, pattern, flags) {
  const regexp = RegExp(pattern, flags);
  const matches = [];

  let match;

  while ((match = regexp.exec(subject)) !== null) {
    matches.push(match[0]);
  }

  return matches;
}

async function respondToEvent(event) {
  // betty poll "what is your name?" "john black" "jack smith"
  if (!event.text.trim().startsWith('poll ') || !event.user) {
    return undefined;
  }

  const [, command] = event.text.match(/(.*?) ".*/);
  const [text, ...options] = matchAll(event.text, '".*?"', 'gs').map(e => e.trim().replace(/"/g, '')).filter(e => e);

  const slackUser = await SlackUserService.findOrCreate(event.user);

  if (!options.length) {
    const referral = slackUser.slackId ? `, <@${slackUser.slackId}>` : '';
    return betty.sendSlackMessage(`Oeps! Foutje in uw commando${referral}. Probeer \`betty help poll\`.`, event.channel);
  }

  const poll = await PollService.create({
    createdBy: slackUser,
    text,
    options: options.map(option => ({ text: option })),
    deletableByAnyone: command.includes(' --allow-delete'),
  });

  const { channel, ts } = await betty.sendSlackMessage('', event.channel, null, await poll.formatAsSlackBlocks());
  poll.slackTsId = ts;
  poll.slackChannelId = channel;
  return poll.save();
}

async function respondToDeleteAction(blockActions) {
  const actions = (blockActions.actions || []).filter(action => action.value.startsWith('poll_delete__'));

  if (!actions.length) {
    return undefined;
  }

  const user = await SlackUserService.findOrCreate(blockActions.user.id);

  return Promise.all(actions.map(async (action) => {
    const [, pollId] = action.value.match(/poll_delete__poll_(.*)/);
    const poll = await PollService.findOneById(pollId);

    if (!poll) {
      return undefined;
    }

    if (!poll.slackTsId || !poll.slackChannelId) {
      return undefined;
    }

    if (!poll.canBeDeletedBy(user)) {
      return undefined;
    }

    const { ts } = await betty.deleteSlackMessage(poll.slackChannelId, poll.slackTsId);
    poll.slackTsId = ts;
    poll.deleted = true;
    return poll.save();
  }));
}

async function respondToVoteAction(blockActions) {
  const actions = (blockActions.actions || []).filter(action => action.value.startsWith('poll_vote__'));

  if (!actions.length) {
    return undefined;
  }

  const user = await SlackUserService.findOrCreate(blockActions.user.id);

  return Promise.all(actions.map(async (action) => {
    const [, pollId, optionId] = action.value.match(/poll_vote__poll_(.*)__option_(.*)/);
    const poll = await PollService.findOneById(pollId);

    if (!poll) {
      console.log('cant find poll');
      return undefined;
    }

    const option = await poll.findOption(optionId);

    if (!option) {
      return undefined;
    }

    option.toggleVoter(user);
    await poll.save();

    if (!poll.slackTsId || !poll.slackChannelId) {
      return undefined;
    }

    const { ts } = await betty.updateSlackMessage(poll.slackChannelId, poll.slackTsId, '', await poll.formatAsSlackBlocks());
    poll.slackTsId = ts;
    return poll.save();
  }));
}

async function respondToBlockActions(blockActions) {
  respondToVoteAction(blockActions);
  respondToDeleteAction(blockActions);
}

export function initialize(options) {
  betty = options.betty;

  betty.on('event', respondToEvent);
  betty.on('blockActions', respondToBlockActions);
}
