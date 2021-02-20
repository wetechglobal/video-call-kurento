import crypto from 'crypto';
import { Buffer } from 'buffer';

const saltLen = 16;
const iterations = 100000;
const keyLen = 64;
const digest = 'sha512';

const hashPwd = pwd => {
  // Create a random salt to ensure if the given passwords are the same
  //    then they will not get the same hash output result
  const salt = crypto.randomBytes(saltLen);
  // Create the hash using pbkdf2 with the generated salt
  const hash = crypto.pbkdf2Sync(pwd, salt, iterations, keyLen, digest);
  // Combine the two generated salt and hash buffer into one new buffer
  // We will need to retrieve the salt when comparing against the password
  const combined = Buffer.alloc(saltLen + keyLen);
  salt.copy(combined);
  hash.copy(combined, saltLen);
  // Return the combined buffer in base 64 format
  return combined.toString('base64');
};

const comparePwd = (pwd, hashedPwd) => {
  // Rebuild the combined buffer from base 64 format
  const combined = Buffer.from(hashedPwd, 'base64');
  // Check if the combined buffer length is valid
  if (combined.length !== saltLen + keyLen) {
    return false;
  }
  // Retrieve the salt and hash buffer from the combined buffer
  const salt = combined.slice(0, saltLen);
  const hash64 = combined.slice(saltLen, combined.length).toString('base64');
  // Create a new hash from the retrieved salt and convert the buffers to string
  const h64 = crypto.pbkdf2Sync(pwd, salt, iterations, keyLen, digest).toString('base64');
  // Compare them and return
  return h64 === hash64;
};

export { hashPwd, comparePwd };
