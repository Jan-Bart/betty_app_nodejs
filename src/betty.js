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

    this.on('reaction', (data) => {
      this.sendSlackReaction(data);
    });
  }

  async getSlackUser(userId) {
    return this.slack.users.info({ user: userId });
  }

  sendSlackMessage(message, conversationId, attachments) {
    console.log('sending slack: ', message);
    const messageData = {
      channel: conversationId,
      text: message,
    };
    if (attachments) {
      messageData.attachments = [attachments];
    }
    this.slack.chat.postMessage(messageData)
      .then((res) => {
        // `res` contains information about the posted message
        console.log('Message sent: ', res.ts);
      })
      .catch(console.error);
  }
}

module.exports = new Betty();
