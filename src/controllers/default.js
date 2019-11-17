import Betty from '../betty';

export default function callBetty(req, res) {
  // challenge for slack
  if (req.body && req.body.challenge) {
    return res.status(200).json(req.body.challenge);
  }

  if (!req.body) {
    return res.status(200).json({});
  }

  if (req.body.event) {
    const { event } = req.body;

    if (event.text && (event.type === 'app_mention' || event.text.substring(0, 5).toLowerCase() === 'betty')) {
      event.text = event.text.split(' ').slice(1).join(' ');
      console.log('event emitting: ', event.text);
      Betty.emit('event', event);
    }
  }

  if (req.body.payload && req.body.payload.type === 'block_actions') {
    Betty.emit('blockActions', req.body.payload);
  }

  return res.status(200).json({});
}
