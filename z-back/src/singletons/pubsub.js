import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const waitThenPublish = (...args) => {
  // Publish the event to notify the clients after a short amount of time
  // We will use this method if the event need to come after the response
  //    and the cookie or local storage is updated at that time
  // This should be done in another way like creating another mutation
  //    but just leave 700 ms timeout for now
  setTimeout(() => pubsub.publish(...args), 700);
};

export { waitThenPublish };
export default pubsub;
