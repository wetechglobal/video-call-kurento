import convert from './convert';
import flacToTxt from './flacToTxt';

const convertFlacToTxt = filename => convert(filename, 'flac', 'txt', flacToTxt);

export default convertFlacToTxt;
