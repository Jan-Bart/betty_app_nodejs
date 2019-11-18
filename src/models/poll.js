import mongoose from 'mongoose';
import blockKit from '../helpers/slackBlockKit';
import SlackUser from './slackUser';

const Option = new mongoose.Schema({
  text: String,
  description: String,
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: SlackUser, default: [] }],
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
  deletableByAnyone: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

Poll.methods.findOption = async function findOption(id) {
  return this.options.find(option => option.id === id);
};

Poll.methods.canBeDeletedBy = function canBeDeletedBy(slackUser) {
  return this.deletableByAnyone || this.createdBy._id.toString() === slackUser.id;
};

Poll.methods.formatAsSlackBlocks = async function formatAsSlackBlocks() {
  await this.populate(['createdBy', 'options.voters']).execPopulate();
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

  let confirmText = this.deletableByAnyone ? '' : `Enkel *${this.createdBy.getFullName()}* kan deze poll verwijderen. `;
  confirmText += 'Deze actie kan *NIET* ongedaan gemaakt worden.';

  result.push(blockKit.buildDivider());
  result.push(blockKit.buildSection({
    text: ' ',
    accessory: blockKit.accessories.buildButton({
      style: 'danger',
      text: 'Verwijder poll',
      value: `poll_delete__poll_${this.id}`,
      confirm: blockKit.accessories.button.buildConfirm({
        title: 'Ben je zeker?',
        text: confirmText,
        confirmText: 'Heel zeker, verwijder maar.',
        denyText: 'Nee, ik heb mij bedacht.',
      }),
    }),
  }));

  return result;
};

module.exports = mongoose.model('Poll', Poll);
