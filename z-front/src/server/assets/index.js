// See src/webpack/webpackConfig.js where the AssetsPlugin get configured
//    for more detail about the customized assets structure

// eslint-disable-next-line import/no-unresolved
import assets from '../../../bin/assets.json';
import getAssets from './getAssets';

// Build the assets and export the result individually
//    so we can import them individually
const { bundleLinkTags, bundleScriptTags, faviconRoot, otherAssets } = getAssets(assets);

export { bundleLinkTags, bundleScriptTags, faviconRoot, otherAssets };
