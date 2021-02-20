import Helmet from 'react-helmet';
import log from 'nn-node-log';
import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';

import IndexHtml, { injectDefaultHelmet } from '../template/IndexHtml';
import PageError from '../../shared/PageError';
import { bundleLinkTags, bundleScriptTags, otherAssets } from '../assets';

// The error render middleware to catch all error
// This will try to render the error template page
//    and inject SERVER_ERROR=true to the window object
//    through the serverState prop in IndexHtml component
const renderError = (err, req, res, next) => {
  try {
    // Check the error
    if (!err) {
      next();
      return;
    }

    // Log the error to track
    log.stack(err);

    // Inject the default attributes and tags
    injectDefaultHelmet();

    // Render the root html markup
    const rootHtml = renderToString(<PageError />);

    // Prepare props for IndexHtml
    const linkTags = bundleLinkTags.bundle;
    const scriptTags = bundleScriptTags.bundle;
    const serverState = {
      ERROR: true,
      ASSETS: otherAssets,
    };
    const helmet = Helmet.renderStatic();

    // Render the html markup
    let html = renderToStaticMarkup(
      <IndexHtml
        rootHtml={rootHtml}
        linkTags={linkTags}
        scriptTags={scriptTags}
        serverState={serverState}
        helmet={helmet}
      />,
    );
    html = `<!DOCTYPE html>${html}`;

    // Write the status code and html
    const code = err.code || 500;
    res.writeHead(code);
    res.end(html);
  } catch (renderErr) {
    // Log the error to track
    log.stack(renderErr);

    // Could not do anything more now just simply return an error message
    res.end('<pre>An error occurred. Please try again later.</pre>');
  }
};

export default renderError;
