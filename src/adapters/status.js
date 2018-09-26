import moment from 'moment';
import request from 'request';
import Betty from '../betty';

moment.locale('nl');

export default function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');

  if (sentence[0] !== 'status') {
    return false;
  }

  try {
    request(`https://www.antwerpen.be/status/${sentence[1]}`, (error, response, body) => {
      const version = JSON.parse(body);
      const resp = {
        message: `Op ${sentence[1]} staat nu *${version.version}*`,
        channel: event.channel,
        attachments: null,
      };
      Betty.emit('response', resp);
    });
  } catch (err) {
    console.log(err);
  }
  return true;
}
