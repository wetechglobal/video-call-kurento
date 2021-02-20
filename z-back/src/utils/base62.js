import baseX from 'base-x';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62 = baseX(base62Chars);

export { base62Chars };
export default base62;
