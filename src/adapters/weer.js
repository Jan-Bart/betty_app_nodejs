import moment from 'moment';
import Betty from '../betty';

moment.locale('nl');

export default function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');

  if (sentence[0] === 'buienradar') {
    const url = 'http://api.buienradar.nl/image/1.0/radarmapbe?width=550';
    const message = `Buienradar om ${moment().format('HH:mm')}u: \n`;
    const attachments = {
      fallback: 'buienradar',
      image_url: url,
    };
    const resp = {
      message,
      channel: event.channel,
      attachments,
    };
    Betty.emit('response', resp);
  } else {
    return false;
  }
  return true;
}
