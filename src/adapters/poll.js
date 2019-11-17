import * as PollService from '../services/poll';
import * as SlackUserService from '../services/slackUser';

let betty;

async function respondToEvent(event) {
  // betty poll "what is your name?" "john black" "jack smith"
  const [command, text, ...options] = event.text.split('"').map(part => part.trim()).filter(part => part.length);

  if (command !== 'poll' || !event.user) {
    return undefined;
  }

  const slackUser = await SlackUserService.findOrCreate(event.user);

  if (!options.length) {
    const referral = slackUser.slackId ? `, <@${slackUser.slackId}>` : '';
    return betty.sendSlackMessage(`Oeps! Foutje in uw commando${referral}. Probeer \`betty help poll\`.`, event.channel);
  }

  const poll = await PollService.create({
    createdBy: slackUser,
    text,
    options: options.map(option => ({ text: option })),
  });

  const { channel, ts } = await betty.sendSlackMessage('', event.channel, null, await poll.formatAsSlackBlocks());
  poll.slackTsId = ts;
  poll.slackChannelId = channel;
  return poll.save();
}

async function respondToBlockActions(blockActions) {
  const actions = (blockActions.actions || []).filter(action => action.value.startsWith('poll_vote__'));

  if (!actions.length) {
    return;
  }

  const user = await SlackUserService.findOrCreate(blockActions.user.id);

  actions.forEach(async (action) => {
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
  });
}

export function initialize(options) {
  betty = options.betty;

  betty.on('event', respondToEvent);
  betty.on('blockActions', respondToBlockActions);
}
