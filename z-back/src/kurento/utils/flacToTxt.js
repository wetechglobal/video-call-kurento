import fs from 'fs';

import transcribe from './transcribe';

const flacToTxt = async (filename, outFilename) => {
  const results = await transcribe(filename);
  const text = results
    .map(r => r.alternatives[0].transcript)
    .join('\n')
    .replace(/\n+\s*/g, '\n');
  fs.writeFileSync(outFilename, text);
};

export default flacToTxt;
