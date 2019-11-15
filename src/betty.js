import { EventEmitter } from 'events';

const { WebClient } = require('@slack/client');

class Betty extends EventEmitter {
  constructor() {
    super();

    // The client is initialized and then started to get an active connection to the platform
    this.slack = new WebClient(process.env.SLACK_TOKEN);

    this.on('response', (data) => {
      this.sendSlackMessage(data.message, data.channel, data.attachments);
    });
  }

  async getSlackUser(userId) {
    return this.slack.users.info({ user: userId });
  }

  async updateSlackMessage(channelId, tsId, message, blocks) {
    console.log('updating slack message: \n', JSON.stringify({ channelId, tsId, message, blocks }));

    if (process.env.SEND_TO_SLACK === 'false') {
      return { ok: true, channel: channelId, ts: `${new Date().getTime()}.12345`, text: '' };
    }

    const response = await this.slack.chat.update({ channel: channelId, text: message, ts: tsId, blocks });
    console.log('Message sent: ', response.ts);
    return response;
  }

  async sendSlackMessage(message, channelId, attachments, blocks) {
    console.log('sending slack message: \n', JSON.stringify({ message, channelId, attachments, blocks }));

    const messageData = {
      channel: channelId,
      text: message,
      blocks,
    };

    if (attachments) {
      messageData.attachments = [attachments];
    }

    if (process.env.SEND_TO_SLACK === 'false') {
      return { ok: true, channel: channelId, ts: `${new Date().getTime()}.12345`, message: messageData };
    }

    const response = await this.slack.chat.postMessage(messageData);
    console.log('Message sent: ', response.ts);
    return response;
  }
}

module.exports = new Betty();
