import log from 'nn-node-log';
import requireDirectory from 'require-directory';

const emails = requireDirectory(module, {
  recurse: false,
});

const wrap = fn => async (...args) => {
  try {
    // Put to queue?
    // TODO
    await fn(...args);
  } catch (err) {
    log.stack(err);
    // Retry or put to queue?
    // TODO
  }
};

Object.keys(emails).forEach(k => {
  emails[k] = wrap(emails[k].default);
});

export default emails;
