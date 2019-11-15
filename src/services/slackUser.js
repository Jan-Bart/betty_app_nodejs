import SlackUser from '../models/slackUser';
import betty from '../betty';

export function search(query = {}, sort = 'id', populateProps = []) {
  return SlackUser.find(query).sort(sort).populate(populateProps).exec();
}

export function findOne(query, populateProps = []) {
  return SlackUser.findOne(query).populate(populateProps).exec();
}

async function create({ slackId }) {
  const data = await betty.getSlackUser(slackId);

  const user = new SlackUser({
    slackId,
    firstName: data.user.profile.first_name,
    lastName: data.user.profile.last_name,
    avatarUrl: data.user.profile.image_original,
  });

  await user.save();

  return user;
}

export async function findOrCreate(slackId) {
  const user = await findOne({ slackId });

  if (user) {
    return user;
  }

  return create({ slackId });
}
