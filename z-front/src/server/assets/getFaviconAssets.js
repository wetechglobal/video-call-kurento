// See src/webpack/webpackConfig.js where the AssetsPlugin get configured
//    for more detail about the customized assets structure

import React from 'react';

// The regex to match with the generated urls from FaviconsPlugin
// https://github.com/jantimon/favicons-webpack-plugin
const attrRegex = /([^/-]+)-?([\d]+x[\d]+)?(\.png|ico)$/;

// Helper to get the rel attribute
const linkRelMap = {
  favicon: 'icon',
};
const getLinkRel = name => linkRelMap[name] || name;

// Helper to get the type attribute
const linkTypeMap = {
  'favicon.ico': 'image/x-icon',
  'favicon.png': 'image/png',
};
const getLinkType = (name, ext) => linkTypeMap[name + ext];

// Get all favicon urls from the customized assets and build the associated tags
// Also find the favicon with extension .ico to serve as the root favicon
const getFaviconAssets = assets => {
  // Get all urls with default guard
  const { faviconUrls = [] } = assets;

  // Init the root url
  let faviconRoot = '';

  // Loop through all urls and build the tags
  const faviconLinkTags = [];
  for (const url of faviconUrls) {
    // Check for matches regex
    const matches = attrRegex.exec(url);
    if (!matches) {
      continue;
    }
    // Get all necessary attributes
    const name = matches[1];
    const sizes = matches[2];
    const ext = matches[3];
    let rel = getLinkRel(name);
    const type = getLinkType(name, ext);
    // Hot fix
    if (rel === 'favicon.') {
      rel = 'favicon';
    }
    // Render a new tag
    faviconLinkTags.push(<link rel={rel} type={type} sizes={sizes} href={url} key={url} />);
    // Check for root url
    if (ext === '.ico') {
      faviconRoot = url;
    }
  }

  // Return
  return {
    faviconRoot,
    faviconLinkTags,
  };
};

export default getFaviconAssets;
