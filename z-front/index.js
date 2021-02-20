require('babel-register')
require('./src/server/hook')


const log = require('nn-node-log')

// Pretty printing for all uncaught exceptions
//    and prevent the process from being killed
process.on('uncaughtException', (err) => {
  log.stack(err)
})


// Only require the necessary module to minimize
//    the number of dependencies for production
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  // eslint-disable-next-line global-require
  require('./src/webpack/dev')
}
else if (process.env.NODE_ENV === 'production') {
  if (process.argv.indexOf('-b') > -1) {
    // eslint-disable-next-line global-require
    require('./src/webpack/bin')
  }
  else {
    // eslint-disable-next-line global-require
    require('./src/server/up')
  }
}
else {
  log.fatal('Invalid process.env.NODE_ENV')
}
