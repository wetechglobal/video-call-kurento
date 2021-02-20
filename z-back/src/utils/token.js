import crypto from 'crypto';

import base62 from './base62';

const newToken = () =>
  // Generate a random 64 bytes token in base 64 format
  // This token should NOT be used in url since it may contain unsafe characters
  // Use the newUrlToken method instead if the token need to be used in url
  crypto.randomBytes(64).toString('base64');

const newUrlToken = () =>
  // Generate a random 16 bytes token in base 62 format
  base62.encode(crypto.randomBytes(16));

const encodeToken = token =>
  // Simply add a hyphen between the id and tokenValue
  // We will use this id later to get data from db efficiently
  `${token.id}-${token.tokenValue}`;

const decodeToken = encoded => {
  // Guard check before splitting
  if (!encoded) {
    return null;
  }
  // Find the index of the hyphen and check if it's exists
  // We will split the encoded token using the `substring` method with the found index
  //    instead of the `split` method because the tokenValue may also contain hyphen
  const i = encoded.indexOf('-');
  if (i < 0) {
    return null;
  }
  // Split the encoded token and return
  const id = encoded.substring(0, i);
  const tokenValue = encoded.substring(i + 1);
  return {
    id,
    tokenValue,
  };
};

export { newToken, newUrlToken, encodeToken, decodeToken };
