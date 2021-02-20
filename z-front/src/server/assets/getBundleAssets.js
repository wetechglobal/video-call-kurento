// See src/webpack/webpackConfig.js where the AssetsPlugin get configured
//    for more detail about the customized assets structure

import React from 'react';

import { otherRegex } from './getOtherAssets';

// The regex to determine and separate the urls
//    like the way we separate our browser bundles
const bundleRegex = /\/(bundle[\w]*)/;

// Helper to determine and extract the bundle name
const getBundleName = url => {
  // Check it this is an async asset
  if (otherRegex.test(url)) {
    return '';
  }
  // Check for matches regex
  const matches = bundleRegex.exec(url);
  if (!matches) {
    return 'bundleVendor';
  }
  // Return
  return matches[1];
};

// Helper to build the tags from the urls
const buildBundleTags = (urls, render) => {
  // Loop through all urls and build the tags
  const bundleTags = {};
  for (const url of urls) {
    // Get and check the bundle name
    const name = getBundleName(url);
    if (!name) {
      continue;
    }
    // Get the rendered tags from the bundle name
    const tags = bundleTags[name] || [];
    // Render a new tag
    tags.push(render(url));
    bundleTags[name] = tags;
  }
  // Cache the vendor tags then delete it from bundleTags
  const bundleTagsVendor = bundleTags.bundleVendor || [];
  delete bundleTags.bundleVendor;
  // Add all vendor tags into other bundles
  for (const name of Object.keys(bundleTags)) {
    bundleTags[name] = [...bundleTagsVendor, ...bundleTags[name]];
  }
  // Return
  return bundleTags;
};

// Get all css and js urls from the customized assets and build the associated tags
// Also separate the tags like the way we separate our browser bundles
const getBundleAssets = assets => {
  // Get all urls with default guard
  const { cssUrls = [], jsUrls = [] } = assets;

  // Build the tags from all urls
  const bundleLinkTags = buildBundleTags(cssUrls, url => (
    <link rel="stylesheet" href={url} key={url} />
  ));
  const bundleScriptTags = buildBundleTags(jsUrls, url => <script src={url} key={url} />);

  // Ensure each script bundle has a link bundle
  Object.keys(bundleScriptTags).forEach(key => {
    if (!(key in bundleLinkTags)) {
      bundleLinkTags[key] = [];
    }
  });

  // Return
  return {
    bundleLinkTags,
    bundleScriptTags,
  };
};

export default getBundleAssets;
