import mongoose from 'mongoose';

const SlackUser = new mongoose.Schema(
  {
    slackId: { type: String, index: true, unique: true },
    firstName: String,
    lastName: String,
    avatarUrl: String,
  },
  { timestamps: true },
);

SlackUser.methods.getFullName = function getFullName() {
  return `${this.firstName} ${this.lastName}`.trim();
};

SlackUser.methods.getAvatarUrl = function getAvatarUrl() {
  return this.avatarUrl;
};

module.exports = mongoose.model('SlackUser', SlackUser);
