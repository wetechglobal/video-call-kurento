/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';

import express from 'express';
import log from 'nn-node-log';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';

import webpackConfig from './webpackConfig';

// Create the middlewares
const compiler = webpack(webpackConfig);
const devMiddleware = webpackDevMiddleware(compiler, webpackConfig.devServer);
const hotMiddleware = webpackHotMiddleware(compiler);

// Create an express app
const app = express();
app.use(devMiddleware);
app.use(hotMiddleware);

// We will flush the require cache to enable hot reload with server code
// https://github.com/glenjamin/webpack-hot-middleware/issues/21
// https://github.com/glenjamin/ultimate-hot-reloading-example
const s = path.join(__dirname, '../server'); // server path
const c = path.join(__dirname, '../shared'); // client path
const clearRequireCache = () =>
  Object.keys(require.cache)
    .filter(p => p.startsWith(s) || p.startsWith(c))
    .forEach(p => delete require.cache[p]);

// Check for webpack stats hash
let lastWebpackStatsHash = '';
app.use((req, res, next) => {
  const { hash } = res.locals.webpackStats;
  if (hash !== lastWebpackStatsHash) {
    lastWebpackStatsHash = hash;
    clearRequireCache();
  }
  next();
});

app.use('/', express.static(path.join(process.cwd(), './static')));
// Dynamic require the renderers
app.use('/-', (req, res, next) => {
  // eslint-disable-next-line global-require
  require('../server/renderer').renderBack(req, res, next);
});
// app.use((req, res, next) => {
//   // eslint-disable-next-line global-require
//   require('../server/renderer')
//     .render(req, res, next)
// })
app.use((err, req, res, next) => {
  // eslint-disable-next-line global-require
  require('../server/renderer').renderError(err, req, res, next);
});

// Final handler to print the error stack
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.end(err.stack);
  log.stack(err);
});

// Wait until bundle valid and start listening
devMiddleware.waitUntilValid(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => log.info(`Listening on port ${port}`));
});
