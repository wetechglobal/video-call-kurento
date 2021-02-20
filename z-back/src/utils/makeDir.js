import childProcess from 'child_process';
import fs from 'fs';

const makeDir = dir => {
  if (fs.existsSync(dir)) {
    return;
  }
  fs.mkdirSync(dir);
  childProcess.exec(`chmod -R a+rwX ${dir}`);
};

export default makeDir;
