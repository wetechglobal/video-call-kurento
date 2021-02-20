// See src/webpack/webpackConfig.js where the AssetsPlugin get configured
//    for more detail about the customized assets structure

// The regex to determine if the url is belonged to other assets
// We will need to build an url map with their name
//    so the regex must be able to extract that name
const otherRegex = /\/(worker[\w]*).*\.[\w]+$/;

// Helper to build an url map with their name
const buildUrlMap = urls => {
  // Loop through all urls and build the map
  const map = {};
  for (const url of urls) {
    // Check for matches regex
    const matches = otherRegex.exec(url);
    if (!matches) {
      continue;
    }
    // Extract the name and add it into the map
    const name = matches[1];
    map[name] = url;
  }
  // Return
  return map;
};

// Get other assets like services worker js and css
// Those assets will be loaded asynchronously only when we call them
//    so we don't need to create any link or script tag
//    just build an url map with their name
const getOtherAssets = assets => {
  // Get all urls with default guard
  const { cssUrls = [], jsUrls = [] } = assets;

  // Build all url maps with their name
  const css = buildUrlMap(cssUrls);
  const js = buildUrlMap(jsUrls);

  // Check if there's no assets
  if (!Object.keys(css).length && !Object.keys(js).length) {
    return null;
  }

  // Return
  return {
    css,
    js,
  };
};

export { otherRegex };
export default getOtherAssets;
