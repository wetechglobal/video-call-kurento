/* eslint-disable import/no-extraneous-dependencies */

import webpack from 'webpack';

import webpackConfig from './webpackConfig';

// Start a production build using Node api instead of webpack cli
//    to control the build process and config file name
webpack(webpackConfig).run((err, stats) => {
  // https://webpack.js.org/api/node/#stats-tostring-options-
  const msg = err || stats.toString(webpackConfig.devServer.stats);
  // eslint-disable-next-line no-console
  console.log(msg);
});
