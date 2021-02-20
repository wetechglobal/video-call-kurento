import 'es5-shim';
import 'es6-shim';
import 'es6-symbol/implement';
import hydrateWithProvider from './hydrateWithProvider';
import RoutesBack from '../shared/RoutesBack';

// Render
hydrateWithProvider({
  Routes: RoutesBack,
});
