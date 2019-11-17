import mongoose from 'mongoose';
import blockKit from '../helpers/slackBlockKit';
import SlackUser from './slackUser';

const Option = new mongoose.Schema({
  text: String,
  description: String,
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SlackUser', default: [] }],
});

Option.methods.hasVotes = function getNumberOfVotes() {
  return this.getNumberOfVotes() > 0;
};

Option.methods.getNumberOfVotes = function getNumberOfVotes() {
  return this.voters.length;
};

Option.methods.isChosenBy = function isChosenBy(slackUser) {
  return !!this.voters.find(voter => voter.toString() === slackUser.id);
};

Option.methods.toggleVoter = function toggleVoter(slackUser) {
  if (this.isChosenBy(slackUser)) {
    this.voters = this.voters.filter(voter => voter.toString() !== slackUser.id);
    return;
  }

  this.voters.push(slackUser);
};

const Poll = new mongoose.Schema({
  text: String,
  // allowsMultipleChoices: { type: Boolean, default: true },
  // allowsExtraOptions: { type: Boolean, default: true },
  options: [Option],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: SlackUser, default: null },
  slackTsId: String,
  slackChannelId: String,
}, { timestamps: true });

Poll.methods.findOption = async function findOption(id) {
  await this.populate(['options']);
  return this.options.find(option => option.id === id);
};

Poll.methods.formatAsSlackBlocks = async function formatForSlack() {
  await this.populate(['createdBy', 'options', 'options.text', 'options.voters']).execPopulate();
  const result = [
    blockKit.buildSection({ text: `*${this.text}* Poll van <${process.env.SLACK_WORKSPACE_URL}/team/${this.createdBy.slackId}|${this.createdBy.getFullName()}>` }),
    blockKit.buildDivider(),
  ];

  this.options.forEach((option) => {
    result.push(blockKit.buildSection({
      text: option.text,
      accessory: blockKit.accessories.buildButton({ text: 'Stem', value: `poll_vote__poll_${this.id}__option_${option.id}` }),
    }));

    const contextOptions = option.voters.map(voter => blockKit.context.buildImage(
      { imageUrl: voter.getAvatarUrl().replace('_original', '_24'), altText: voter.getFullName() },
      // @todo: replace avatar with small sized url _original => _24
    ));

    const votesCaption = `${option.hasVotes() ? option.getNumberOfVotes() : 'Geen'} ${option.getNumberOfVotes() === 1 ? 'stem' : 'stemmen'}`;
    contextOptions.push(blockKit.context.buildText({ text: votesCaption }));

    result.push(blockKit.buildContext(contextOptions));
  });

  result.push(blockKit.buildDivider());

  // @todo: add a suggestion if poll.allowsExtraOptions
  // result.blocks.push(blockKit.buildActions());

  return result;
};

module.exports = mongoose.model('Poll', Poll);
