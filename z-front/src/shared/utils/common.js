export function debounce(fn, delay) {
  let timeout;
  return function(...params) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      const ctx = this;
      fn.apply(ctx, params);
    }, delay);
  };
}

export function upperFistLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
