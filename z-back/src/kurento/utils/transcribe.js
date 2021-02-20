import { v1p1beta1 } from '@google-cloud/speech';

import upload from './upload';
import { ggcProjectId, gccKeyFilename, ggcBucketName } from '../../config';

const speech = new v1p1beta1.SpeechClient({
  projectId: ggcProjectId,
  keyFilename: gccKeyFilename,
});

// Can have time info
// https://github.com/googleapis/nodejs-speech/blob/156617d1eca6ec7788a6875af34a84ae95968cce/samples/recognize.js#L309
const config = {
  encoding: 'FLAC',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  enableAutomaticPunctuation: true,
};

const transcribe = async filename => {
  const audio = {
    uri: `gs://${ggcBucketName}/${await upload(filename)}`,
  };

  const recognizeRes = await speech.longRunningRecognize({
    config,
    audio,
  });

  const operationRes = await recognizeRes[0].promise();

  return operationRes[0].results;
};

export default transcribe;
