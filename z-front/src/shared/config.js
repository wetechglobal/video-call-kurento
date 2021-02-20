// The below config fields will be used in browser and exposed to the users
// We must not put the server config like DB conn string or other sensitive information here

import io from 'socket.io-client';

let backend = 'http://localhost:3001';
// if (process.env.NODE_ENV === 'production') {
backend = 'https://staging-video.magconnect.com.au/';
// }
const frontend = backend;
const backendWs = backend.replace('http', 'ws');

const graphqlUri = `${backend}/graphql`;
const graphqlSubscriptionUri = `${backendWs}/subscriptions`;

const socket = io(backend);
socket.on('id', () => socket.emit('participantStatus'));

export { backend, frontend, graphqlUri, graphqlSubscriptionUri, socket };
