import Helmet from 'react-helmet';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import IndexHtml, { injectDefaultHelmet } from '../template/IndexHtml';
import { bundleLinkTags, bundleScriptTags, otherAssets } from '../assets';

// Inject the default attributes and tags
injectDefaultHelmet();

// Prepare props for IndexHtml
const linkTags = bundleLinkTags.bundleBack;
const scriptTags = bundleScriptTags.bundleBack;
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

// The dashboard render middleware to render a single html page
// We don't need to implement server side rendering for the dashboard
//    so just simply return the rendered html markup
const renderBack = (req, res, next) => {
  // Check for request method
  if (req.method !== 'GET') {
    next();
    return;
  }

  // Write the html
  res.end(html);
};

export default renderBack;
