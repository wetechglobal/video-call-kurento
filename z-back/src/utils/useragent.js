import useragent from 'useragent';

const cacheKey = '__accessInfo';

const getAccessInfoWithoutCache = req => {
  // Parse the user agent from header using the useragent.lookup method
  const ag = useragent.lookup(req.headers['user-agent']);
  // Return the user agent together with the request ip
  return JSON.stringify({
    ip: req.ip,
    ag: ag.family,
    agV: ag.toVersion(),
    os: ag.os.family,
    osV: ag.os.toVersion(),
    device: ag.device.family,
  });
};

const getAccessInfo = req => {
  // Check for cache in the req object to avoid parsing
  if (cacheKey in req) {
    return req[cacheKey];
  }
  // Get the access info then cache it and return
  req[cacheKey] = getAccessInfoWithoutCache(req);
  return req[cacheKey];
};

export { getAccessInfo };
