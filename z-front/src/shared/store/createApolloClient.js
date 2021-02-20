import 'isomorphic-fetch';
import { ApolloClient, createNetworkInterface } from 'react-apollo';

import { buildRequestHeaders } from '../utils/context';
import { graphqlUri } from '../config';

const createApolloClient = serverContext => {
  const networkInterface = createNetworkInterface({
    uri: graphqlUri,
  });
  networkInterface.use([
    {
      applyMiddleware: (req, next) => {
        req.options.headers = buildRequestHeaders(serverContext, req.options.headers);
        next();
      },
    },
  ]);

  return new ApolloClient({
    networkInterface,
  });
};

export default createApolloClient;
