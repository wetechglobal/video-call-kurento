// See src/webpack/webpackConfig.js where the AssetsPlugin get configured
//    for more detail about the customized assets structure

import getBundleAssets from './getBundleAssets';
import getFaviconAssets from './getFaviconAssets';
import getOtherAssets from './getOtherAssets';

// Build all assets urls into tags and extract other useful information
// Also separate the tags like the way we separate our browser bundles
const getAssets = assets => {
  // Get all assets tags from the assets urls
  const { bundleLinkTags, bundleScriptTags } = getBundleAssets(assets);
  const { faviconRoot, faviconLinkTags } = getFaviconAssets(assets);
  const otherAssets = getOtherAssets(assets);

  // Add favicon link tags into all bundle link tags
  for (const name of Object.keys(bundleLinkTags)) {
    bundleLinkTags[name] = [...faviconLinkTags, ...bundleLinkTags[name]];
  }

  // Return
  return {
    bundleLinkTags,
    bundleScriptTags,
    faviconRoot,
    otherAssets,
  };
};

export default getAssets;
