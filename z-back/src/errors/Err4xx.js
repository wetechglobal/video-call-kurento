class Err4xx extends Error {
  constructor(type, data = {}) {
    super('Invalid request');
    this.data = {
      ...data,
      type,
    };
  }
}

export default Err4xx;
