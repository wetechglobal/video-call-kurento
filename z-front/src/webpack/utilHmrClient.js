// A hacky way to enable auto reload using existing APIs from webpack hot middleware
// This is useful when the server is down due to nodemon restart and HMR can not reload itself
// https://github.com/glenjamin/webpack-hot-middleware/issues/21

// Import the webpack HMR client here then we don't need to add it in the config
import 'webpack-hot-middleware/client?reload=true'; // eslint-disable-line

let totalAttemps = 0;
let hasError = false;

const init = () => {
  const es = new EventSource('/__webpack_hmr');

  if (hasError) {
    // eslint-disable-next-line no-console
    console.log('[HMR] attemping to reload...');
  }

  es.onerror = () => {
    es.close();
    hasError = true;
    totalAttemps += 1;
    // Extend the interval time when user get idle
    const n = Math.floor(totalAttemps / 10) + 1;
    setTimeout(init, n * n * 1000);
  };

  es.onopen = () => {
    if (!hasError) {
      return;
    }
    window.location.reload();
  };
};

init();
