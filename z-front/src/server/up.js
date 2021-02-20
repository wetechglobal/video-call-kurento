import connect from 'connect';
import createStatic from 'connect-static';
import log from 'nn-node-log';

import { faviconRoot } from './assets';
import { renderBack, renderError } from './renderer';

// The options use to create the static middleware
// Serve gzipped static content from bin/public
// Alias root favicon for default request
const staticOpts = {
  dir: 'bin/public',
  aliases: [['/favicon.ico', faviconRoot]],
};

// Build and spin up a minimal lightweight http server
//    using the connect package and its middlewares
createStatic({ dir: 'static' }, (serveKurentoErr, serveKurentoStatic) => {
  if (serveKurentoErr) {
    log.stack(serveKurentoErr, 'fatal');
  }
  createStatic(staticOpts, (err, serveStatic) => {
    // Check for error from createStatic
    if (err) {
      log.stack(err, 'fatal');
    }

    // Init a connect app and add middlewares
    const app = connect();
    app.use('/', serveKurentoStatic);
    app.use('/public', serveStatic);
    app.use('/-', renderBack);
    // app.use('/', render)
    app.use(renderError);

    // Start listening
    const port = process.env.PORT || 3000;
    app.listen(port, () => log.info(`Listening on port ${port}`));
  });
});
