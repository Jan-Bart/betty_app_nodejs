import Betty from '../betty';

export default function callBetty(req, res) {
  // challenge for slack
  if (req.body && req.body.challenge) {
    return res.status(200).json(req.body.challenge);
  }
  if (!req.body || !req.body.event) {
    return res.status(200).json({});
  }

  const { event } = req.body;
  if (event.text && (event.type === 'app_mention' || event.text.substring(0, 5).toLowerCase() === 'betty')) {
    event.text = event.text.split(' ').slice(1).join(' ');
    console.log('event emitting: ', event.text);
    Betty.emit('event', event);
  }

  return res.status(200).json([]);
}
