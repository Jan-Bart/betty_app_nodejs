import moment from 'moment';
import SlackUser from '../models/slackUser';
import betty from '../betty';

export function search(query = {}, sort = 'id', populateProps = []) {
  return SlackUser.find(query).sort(sort).populate(populateProps).exec();
}

async function update(user) {
  const data = await betty.getSlackUser(user.slackId);

  user.firstName = data.user.profile.first_name;
  user.lastName = data.user.profile.last_name;
  user.avatarUrl = data.user.profile.image_original;
  user.updatedAt = new Date();

  await user.save();

  return user;
}

export async function findOne(query, populateProps = []) {
  const user = await SlackUser.findOne(query).populate(populateProps).exec();

  if (!user.updatedAt || moment(user.updatedAt) < moment().subtract(1, 'hour')) {
    return update(user);
  }

  return user;
}

async function create({ slackId }) {
  return update(new SlackUser({ slackId }));
}

export async function findOrCreate(slackId) {
  const user = await findOne({ slackId });

  if (user) {
    return user;
  }

  return create({ slackId });
}
