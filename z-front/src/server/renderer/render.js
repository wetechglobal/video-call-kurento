import cookie from 'cookie';
import Helmet from 'react-helmet';
import React from 'react';
import { ApolloProvider, renderToStringWithData } from 'react-apollo';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import createApolloClient from '../../shared/store/createApolloClient';
import createReduxStore from '../../shared/store/createReduxStore';
import IndexHtml, { injectDefaultHelmet } from '../template/IndexHtml';
import Routes from '../../shared/Routes';
import { bundleLinkTags, bundleScriptTags, otherAssets } from '../assets';

// The main render middleware with server rendering for end user
// This will try to render the route associated with the request url
//    and inject SERVER_REDUX redux store to the window object
//    through the serverState prop in IndexHtml component
const render = async (req, res, next) => {
  try {
    // Check for request method
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Parse and get the authToken from cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const authToken = cookies.authToken;

    // Prepare render context
    const serverContext = {
      authToken,
    };
    const apolloClient = createApolloClient(serverContext);
    const reduxStore = createReduxStore({
      serverContext,
      apolloClient,
    });
    const routerContext = {
      status: 301,
      url: '',
    };

    // Inject the default attributes and tags
    injectDefaultHelmet();

    // Render the root html markup
    const rootHtml = await renderToStringWithData(
      <ApolloProvider store={reduxStore} client={apolloClient}>
        <StaticRouter location={req.url} context={routerContext}>
          <Routes />
        </StaticRouter>
      </ApolloProvider>,
    );

    // Check if we need to redirect
    if (routerContext.url) {
      res.writeHead(routerContext.status, {
        Location: routerContext.url,
      });
      res.end();
      return;
    }

    // Get the redux state from the store
    const reduxState = reduxStore.getState();

    // Prepare props for IndexHtml
    const linkTags = bundleLinkTags.bundle;
    const scriptTags = bundleScriptTags.bundle;
    const serverState = {
      REDUX: reduxState,
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

    // Write the html
    res.end(html);
  } catch (err) {
    next(err);
  }
};

export default render;
