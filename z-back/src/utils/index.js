import requireDirectory from 'require-directory';

// Merge all utils exports into a single utils object
const utils = requireDirectory(module, {
  recurse: false,
});
Object.entries(utils).forEach(([utilKey, util]) => {
  Object.entries(util).forEach(([funcKey, func]) => {
    utils[funcKey === 'default' ? utilKey : funcKey] = func;
  });
});

export default utils;
