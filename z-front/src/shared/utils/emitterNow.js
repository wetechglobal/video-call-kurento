const initEmitterNow = emitter => {
  // eslint-disable-next-line no-param-reassign
  emitter.now = new Date();
  if (typeof window !== 'undefined') {
    setInterval(() => {
      // eslint-disable-next-line no-param-reassign
      emitter.now = new Date();
      emitter.emit('now');
    }, 60000);
  }
};

export { initEmitterNow };
