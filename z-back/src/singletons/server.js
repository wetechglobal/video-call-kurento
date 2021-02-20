import http from 'http';

// import { execute, subscribe } from 'graphql'
// import { SubscriptionServer } from 'subscriptions-transport-ws'

import app from './app';
// import schema from '../schema'

const server = http.Server(app);

// const subscriptionServer = new SubscriptionServer({
//   schema,
//   execute,
//   subscribe,
// }, {
//   server,
//   path: '/subscriptions',
// })

// export {
//   subscriptionServer,
// }
export default server;
