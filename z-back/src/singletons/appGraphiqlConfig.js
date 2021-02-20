import url from 'url';

const graphiqlConfig = req => ({
  endpointURL: '/graphql',
  subscriptionsEndpoint: url.format({
    host: req.get('host'),
    protocol: req.protocol.replace('http', 'ws'),
    pathname: '/subscriptions',
  }),
});

export default graphiqlConfig;
