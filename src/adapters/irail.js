import moment from 'moment';
import request from 'request';
import Betty from '../betty';

moment.locale('nl');

export default function handle(event) {
  if (event.text.indexOf('trein naar') === -1) {
    return false;
  }

  const destination = event.text.split('trein naar ').pop();

  const url = `https://api.irail.be/connections/?from=Antwerpen-zuid&to=
    ${destination}&date=${moment().format('DDMMYY')}&time=${moment().format('HHmm')}
    &timesel=departure&format=json&lang=nl&fast=false&typeOfTransport=trains&alerts=false&results=6`
  request.get(url, (err, data) => {
    if (err) {
      return;
    }
    const connections = [];
    const info = JSON.parse(data.body);
    info.connection.forEach((conn) => {
      connections.push({
        departure: {
          station: conn.departure.station,
          time: moment.unix(conn.departure.time).format('HH:mm'),
        },
        arrival: {
          station: conn.arrival.station,
          time: moment.unix(conn.arrival.time).format('HH:mm'),
        },
      });
    });
    const message = `De volgende treinen vertrekken naar ${destination}\n`;
    let attachment = '';

    connections.forEach((element) => {
      attachment += `• Om ${element.departure.time}u in ${element.departure.station}, aankomst om ${element.arrival.time}u in ${element.arrival.station}\n`;
    });
    const attachments = {
      mrkdwn_in: ['text', 'pretext'],
      text: attachment,
    };
    const resp = {
      message,
      channel: event.channel,
      attachments,
    };
    Betty.emit('response', resp);
  });
  return true;
}
