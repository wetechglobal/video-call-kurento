import generate from 'nanoid/generate';

import { base62Chars } from './base62';

const newId = () => generate(base62Chars, 5);

export { newId };
