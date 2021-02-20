const corsConfig = {
  origin: (origin, cb) => {
    cb(null, true);
    // if (/^http:\/\/localhost:[\d]{4}$/.test(origin)) {
    //   cb(null, true)
    //   return
    // }
    // cb(null, false)
  },
};

export default corsConfig;
