import Helmet from 'react-helmet';
import React from 'react';
import serialize from 'serialize-javascript';
import { renderToStaticMarkup } from 'react-dom/server';

// Inject the default attributes and tags into the helmet
// We should call this function before any rendering to make sure
//    the default attributes and tags are injected into the helmet
const injectDefaultHelmet = () =>
  renderToStaticMarkup(
    <Helmet>
      <title>MAG Video Centre</title>
    </Helmet>,
  );

// The IndexHtml component to render html response in server side rendering
// This component can also be used for generating static html files
//    through the webpack plugin src/webpack/IndexHtmlPlugin
const IndexHtml = props => {
  // Spread props
  const { rootHtml, linkTags, scriptTags, serverState, helmet } = props;

  // Prepare script tags to inject some useful state from server into the window object
  // See the below prop types definition for more detail about this state
  const scriptTagsByState = Object.entries(serverState).map(
    ([k, v]) =>
      v && (
        <script
          key={k}
          dangerouslySetInnerHTML={{
            __html: `window.SERVER_${k}=${serialize(v)}`,
          }}
        />
      ),
  );

  // Prepare all Helmet attributes and tags
  const htmlAttrsByHelmet = helmet.htmlAttributes.toComponent();
  const bodyAttrsByHelmet = helmet.bodyAttributes.toComponent();
  const titleTagByHelmet = helmet.title.toComponent();
  const metaTagsByHelmet = helmet.meta.toComponent();
  const linkTagsByHelmet = helmet.link.toComponent();

  // Return
  return (
    <html lang="en" {...htmlAttrsByHelmet}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        {titleTagByHelmet}
        {metaTagsByHelmet}
        {linkTagsByHelmet}
        {linkTags}
      </head>
      <body {...bodyAttrsByHelmet}>
        <div
          id="root"
          dangerouslySetInnerHTML={{
            __html: rootHtml,
          }}
        />
        {scriptTagsByState}
        {scriptTags}
      </body>
    </html>
  );
};

IndexHtml.defaultProps = {
  rootHtml: '',
  linkTags: null,
  scriptTags: null,
  serverState: {},
};

export { injectDefaultHelmet };
export default IndexHtml;
