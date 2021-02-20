require('babel-register');
const log = require('nn-node-log');

try {
  require('./src/up');
} catch (err) {
  log.stack(err, 'fatal');
}
