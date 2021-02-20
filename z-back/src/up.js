import log from 'nn-node-log';

import { serverPort } from './config';
import init from './singletons/init';
import server from './singletons/server';
import handleSocketServer from './kurento/handleSocketServer';

init()
  .then(() => {
    server.listen(serverPort, () => log.info(`Listening on port ${serverPort}`));
    handleSocketServer(server);

    process.on('uncaughtException', err => {
      log.stack(err);
    });
  })
  .catch(err => {
    log.stack(err, 'fatal');
  });
