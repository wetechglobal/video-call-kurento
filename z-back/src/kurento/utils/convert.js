import fs from 'fs';

import Err4xx from '../../errors/Err4xx';

const processing = {};

const isBeingProcessed = filename => processing[filename];

const convert = async (filename, ext, outext, fn) => {
  const outFilename = filename.replace(new RegExp(`${ext}$`), outext);

  let err = null;
  if (!filename.endsWith(`.${ext}`)) {
    err = new Err4xx(`InvalidExt${ext.toUpperCase()}`);
  } else if (processing[filename]) {
    err = new Err4xx('FileProcessing');
  } else if (fs.existsSync(outFilename)) {
    err = new Err4xx('AlreadyConverted');
  }

  if (err) {
    err.code = 400;
    throw err;
  }

  processing[filename] = true;
  processing[outFilename] = true;

  await fn(filename, outFilename);

  delete processing[filename];
  delete processing[outFilename];
};

export { isBeingProcessed };
export default convert;
