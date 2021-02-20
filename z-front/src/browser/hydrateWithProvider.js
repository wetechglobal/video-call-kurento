import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter } from 'react-router-dom';
import { render } from 'react-dom';

import createApolloClient from '../shared/store/createApolloClient';
import createReduxStore from '../shared/store/createReduxStore';

// A render helper to easily setup the provider across bundles
// This function should implement the same logic with server
//    from the server renderers in src/server/renderer
const hydrateWithProvider = opts => {
  // Spread options
  const { Routes, reducers } = opts;

  // Prepare instances
  const apolloClient = createApolloClient();
  const reduxStore = createReduxStore({
    apolloClient,
    reducers,
  });

  // Render
  render(
    <ApolloProvider store={reduxStore} client={apolloClient}>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </ApolloProvider>,
    document.getElementById('root'),
  );
};

export default hydrateWithProvider;
