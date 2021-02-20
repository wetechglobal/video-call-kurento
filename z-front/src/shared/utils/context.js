// Check and get the data from server context if it's present
// Otherwise we can safely access the browser context and window object

import browserStorage from './browserStorage';

const getInitialState = serverContext => {
  if (serverContext) {
    return undefined;
  }
  return window.SERVER_REDUX;
};

const getAuthToken = serverContext => {
  if (serverContext) {
    return serverContext.authToken;
  }
  return browserStorage.get('authToken');
};

const getAnonymousId = serverContext => {
  if (serverContext) {
    return undefined;
  }
  return browserStorage.get('anonymousId');
};

const buildRequestHeaders = (serverContext, headers) => {
  // Spread the existing headers instead of directly modifying it
  // This also guards against null or undefined
  const builtHeaders = { ...headers };
  // Get the authToken for authenticated session
  const authToken = getAuthToken(serverContext);
  if (authToken) {
    builtHeaders.authorization = `Bearer ${authToken}`;
  }
  // Get the anonymousId for subscription on anonymous session
  const anonymousId = getAnonymousId(serverContext);
  if (anonymousId && !authToken) {
    builtHeaders['x-anonymous-id'] = anonymousId;
  }
  // Return the built headers
  return builtHeaders;
};

export { getInitialState, getAuthToken, getAnonymousId, buildRequestHeaders };
