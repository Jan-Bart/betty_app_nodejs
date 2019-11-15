import Poll from '../models/poll';

export function search(query = {}, sort = 'id', populateProps = []) {
  return Poll.find(query).sort(sort).populate(populateProps).exec();
}

export function findOne(query, populateProps = []) {
  return Poll.findOne(query).populate(populateProps).exec();
}

export function findOneById(id, populateProps = []) {
  return findOne({ _id: id }, populateProps);
}

export async function create(options) {
  const poll = new Poll(options);
  await poll.save();

  return poll;
}
