export default {
  buildSection: function buildSection(options) {
    const result = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: options.text,
      },
    };

    if (options.accessory) {
      result.accessory = options.accessory;
    }

    return result;
  },

  buildDivider: function buildDivider() {
    return { type: 'divider' };
  },

  buildActions: function buildActions(options) {
    return {
      type: 'actions',
      elements: options.map(option => ({
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: option.text,
        },
        value: option.id,
      })),
    };
  },

  accessories: {
    buildButton: function buildButton(options) {
      return {
        type: 'button',
        text: {
          type: 'plain_text',
          emoji: true,
          text: options.text,
        },
        value: options.value,
      };
    },
  },

  buildContext: function buildContext(elements) {
    return { type: 'context', elements };
  },

  context: {
    buildImage: function buildImage(options) {
      return {
        type: 'image',
        image_url: options.imageUrl,
        alt_text: options.altText,
      };
    },

    buildText: function buildText(options) {
      return {
        type: 'plain_text',
        emoji: true,
        text: options.text,
      };
    },
  },
};
