import convert from './convert';
import mp4ToFlac from './mp4ToFlac';

const convertMp4ToFlac = filename => convert(filename, 'mp4', 'flac', mp4ToFlac);

export default convertMp4ToFlac;
