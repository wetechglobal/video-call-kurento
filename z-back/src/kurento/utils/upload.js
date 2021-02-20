import log from 'nn-node-log';
import Storage from '@google-cloud/storage';

import { ggcProjectId, gccKeyFilename, ggcBucketName, filesDir } from '../../config';

const storage = Storage({
  projectId: ggcProjectId,
  keyFilename: gccKeyFilename,
});
const bucket = storage.bucket(ggcBucketName);

const upload = async filename => {
  const uri = filename.replace(filesDir, '');

  let exists = false;
  try {
    await bucket.file(uri).getMetadata();
    exists = true;
  } catch (err) {
    const isNotfound = /No such object/.test(err.message);
    if (!isNotfound) {
      log.error('Can not get gcc metadata for file uploading: %s', err);
    }
  }

  if (!exists) {
    await bucket.upload(filename, {
      destination: uri,
    });
  }

  return uri;
};

export default upload;
