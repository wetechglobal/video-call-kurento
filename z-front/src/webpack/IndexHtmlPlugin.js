import Helmet from 'react-helmet';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import IndexHtml, { injectDefaultHelmet } from '../server/template/IndexHtml';
import { getAssets } from '../server/assets/getAssets';

// A webpack plugin to generate static html files using server/template/IndexHtml
// Require the AssetsPlugin correctly configured to work with
// See ./webpackConfig.js for detail
class IndexHtmlPlugin {
  // Merge options with default options
  constructor(options) {
    this.options = {
      output: 'index.html',
      bundle: 'bundle',
      assetsName: 'assets.json',
      ...options,
    };
  }

  // Implement webpack plugin API
  apply = compiler => {
    compiler.plugin('emit', (compilation, callback) => {
      // Spread options
      const { output, bundle, assetsName } = this.options;

      // Get and check the assets from AssetsPlugin
      const assetsJson = compilation.assets[assetsName];
      if (!assetsJson) {
        throw new Error('Missing assets from AssetsPlugin');
      }

      // Parse and build the assets
      const assets = JSON.parse(assetsJson.source());
      const { bundleLinkTags, bundleScriptTags, otherAssets } = getAssets(assets);

      // Inject the default attributes and tags
      injectDefaultHelmet();

      // Prepare props for IndexHtml
      const linkTags = bundleLinkTags[bundle];
      const scriptTags = bundleScriptTags[bundle];
      const serverState = {
        ASSETS: otherAssets,
      };
      const helmet = Helmet.renderStatic();

      // Render the html markup
      let html = renderToStaticMarkup(
        <IndexHtml
          linkTags={linkTags}
          scriptTags={scriptTags}
          serverState={serverState}
          helmet={helmet}
        />,
      );
      html = `<!DOCTYPE html>${html}`;

      // Add the rendered html markup to the compiler
      // eslint-disable-next-line no-param-reassign
      compilation.assets[output] = {
        source: () => html,
        size: () => html.length,
      };

      // Callback
      callback();
    });
  };
}

export default IndexHtmlPlugin;
