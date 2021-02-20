import hydrateWithProvider from './hydrateWithProvider';
import Routes from '../shared/Routes';

import PageError from '../shared/PageError';

// Check for error from server side rendering
const RoutesOrError = window.SERVER_ERROR ? PageError : Routes;

// Render
hydrateWithProvider({
  Routes: RoutesOrError,
});
