import ffmpeg from 'fluent-ffmpeg';
import log from 'nn-node-log';

const mp4ToFlac = (filename, outFilename) =>
  new Promise((resolve, reject) => {
    try {
      ffmpeg(filename)
        .inputOptions('-loglevel panic')
        .toFormat('flac')
        .audioFrequency(16000)
        .audioChannels(1)
        .save(outFilename)
        .on('end', (stdout, stderr) => {
          if (stderr) {
            log.error(stderr);
            const err = new Error('ffmpeg panic an error');
            err.ffmpegErr = stderr;
            reject(err);
            return;
          }
          resolve();
        });
    } catch (err) {
      reject(err);
    }
  });

export default mp4ToFlac;
