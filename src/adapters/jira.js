import moment from 'moment';
import JiraClient from 'jira-connector';
import SearchClient from 'jira-connector/api/search';
import Betty from '../betty';

moment.locale('nl');
const jira = new JiraClient({
  host: process.env.JIRA_HOST,
  basic_auth: {
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
  },
});
const s = new SearchClient(jira);

export default function handle(event) {
  const sentence = event.text.replace(/[.,?!;()"'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');
  if (sentence[0] === 'toon') {
    const tosearch = event.text.replace('toon ', '');
    s.search({
      jql: `key=${tosearch}`,
    }, (error, result) => {
      if (error) {
        console.log(error.errorMessages[0]);
        return false;
      }
      const response = {
        message: `Ticket gevonden: ${result.issues[0].key}\nhttps://jira.antwerpen.be/browse/${result.issues[0].key}\n${result.issues[0].fields.summary}`,
        channel: event.channel,
        attachments: null,
      };
      Betty.emit('response', response);
      return true;
    });
  }
  if (sentence[0] === 'zoek') {
    const tosearch = event.text.replace('zoek ', '');
    s.search({
      jql: `text~"${tosearch}"`,
    }, (error, result) => {
      if (error) {
        console.log(error.errorMessages[0]);
        return false;
      }
      let response = {
        message: `Aantal results: ${result.total}`,
        channel: event.channel,
        attachments: null,
      };
      Betty.emit('response', response);
      result.issues.slice(0, 5).forEach((e) => {
        response = {
          message: `Ticket gevonden: ${e.key}\nhttps://jira.antwerpen.be/browse/${e.key}\n${e.fields.summary}`,
          channel: event.channel,
          attachments: null,
        };
        Betty.emit('response', response);
      });
      return true;
    });
  }
  return false;
}
