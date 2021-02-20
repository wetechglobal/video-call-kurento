import log from 'nn-node-log';

const handleNotfound = (req, res, next) => {
  const err = new Error('Content not found');
  err.code = 404;
  next(err);
};
const handleError = (err, req, res, next) => {
  let { code, message } = err;
  if (!code) {
    code = 500;
  }
  if (code >= 500) {
    log.stack(err);
    message = 'Internal server error';
  }
  res.writeHead(code);
  res.end(message);
};

export { handleNotfound, handleError };
