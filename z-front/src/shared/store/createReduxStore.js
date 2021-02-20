import thunk from 'redux-thunk';
import { combineReducers, createStore, applyMiddleware } from 'redux';

import { getInitialState } from '../utils/context';

const createReduxStore = opts => {
  const { serverContext, apolloClient, reducers } = opts;

  return createStore(
    combineReducers({
      ...reducers,
      apollo: apolloClient.reducer(),
    }),
    getInitialState(serverContext),
    applyMiddleware(thunk, apolloClient.middleware()),
  );
};

export default createReduxStore;
