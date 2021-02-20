/* eslint-disable import/no-extraneous-dependencies */

import fs from 'fs';
import path from 'path';

import json5 from 'json5';
import webpack from 'webpack';

import AssetsPlugin from 'webpack-assets-manifest';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import FaviconsPlugin from 'favicons-webpack-plugin';

import { localIdentName } from '../server/hook';

const cwd = process.cwd();

// Define the babelrc and eslintrc paths
const babelrcPath = path.join(cwd, '.babelrc-browser');
const eslintrcPath = path.join(cwd, '.eslintrc-browser');
// Read and parse the babelrc options
const babelrcFile = fs.readFileSync(babelrcPath);
const babelrcOptions = json5.parse(babelrcFile);

// Define the entry paths
const entryBundle = path.join(cwd, 'src/browser/bundle.js');
const entryBundleBack = path.join(cwd, 'src/browser/bundleBack.js');
const entryBundleVendor = path.join(__dirname, 'utilHmrClient.js');
const entryFavicon = path.join(cwd, 'src/shared/assets/favicon.png');

// Define the output paths
const outputPath = path.join(cwd, 'bin');
// Assets output paths for js and css
const outputAssetsJs = 'public/assets/[name].js';
const outputAssetsJsPro = 'public/assets/[name]-[chunkhash].js';
const outputAssetsCssPro = 'public/assets/[name]-[contenthash].css';
// Favicons output paths for FaviconsPlugin
const outputFavicons = 'public/favicons/';
const outputFaviconsPro = 'public/favicons/[hash]-';
// Fonts and images output paths for loaders
const outputFonts = 'public/fonts/';
const outputImages = 'public/images/';
// Manifest output path for AssetsPlugin
const outputAssetsJson = 'assets.json';

const webpackConfig = {
  entry: {
    bundle: [entryBundle],
    bundleBack: [entryBundleBack],
    bundleVendor: [entryBundleVendor],
  },

  output: {
    path: outputPath,
    filename: outputAssetsJs,
    publicPath: '/',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'eslint-loader',
          options: {
            configFile: eslintrcPath,
          },
        },
        enforce: 'pre',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            ...babelrcOptions,
          },
        },
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              localIdentName,
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[hash].[ext]',
              outputPath: outputImages,
            },
          },
        ],
      },
      {
        test: /\.(ttf|woff|woff2|eot|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[hash].[ext]',
              outputPath: outputFonts,
            },
          },
        ],
      },
    ],
  },

  plugins: [
    // Standard recommended webpack plugins
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'bundleVendor',
    }),
    // Auto generate favicons for all browsers and platforms
    // Right now we are just generate standard favicons for browsers only
    new FaviconsPlugin({
      logo: entryFavicon,
      prefix: outputFavicons,
      persistentCache: false,
      icons: {
        android: false,
        appleIcon: false,
        appleStartup: false,
        coast: false,
        favicons: true,
        firefox: false,
        opengraph: false,
        twitter: false,
        yandex: false,
        windows: false,
      },
    }),
    // We need to inject the assets into the generated html in server rendering
    //    but we use hash as asset's name and we wouldn't know it's name until emitted
    // We need to customize the assets so it can be easily read and injected into the html
    new AssetsPlugin({
      output: outputAssetsJson,
      writeToDisk: true,
      // The customized assets.json would be as following:
      // {
      //   "jsUrls": [
      //     "/public/bundle-[chunkhash].js",
      //     "/public/bundleBack-[chunkhash].js",
      //     "/public/bundleVendor-[chunkhash].js",
      //     ...
      //   ],
      //   "cssUrls": [
      //     "/public/bundle-[contenthash].css",
      //     "/public/bundleBack-[contenthash].css",
      //     ...
      //   ],
      //   "faviconUrls": [
      //     "/public/favicons-[hash]/favicon-16x16.png",
      //     "/public/favicons-[hash]/favicon-32x32.png",
      //     "/public/favicons-[hash]/favicon.ico",
      //     ...
      //   ],
      //   ...
      // }
      customize: (key, value, originalValue, data) => {
        // Ensure all urls are absolute
        let url = value;
        if (url.charAt(0) !== '/') {
          url = `/${url}`;
        }
        // Get the asset type
        let type = '';
        if (url.endsWith('.js')) {
          type = 'jsUrls';
        } else if (url.endsWith('.css')) {
          type = 'cssUrls';
        } else if (/\/favicons/.test(url)) {
          type = 'faviconUrls';
        } else {
          return false;
        }
        // Get the asset from the type and push the url
        const asset = data.assets[type] || [];
        if (!asset.includes(url)) {
          asset.push(url);
        }
        // Return
        return {
          key: type,
          value: asset,
        };
      },
    }),
  ],

  // Enable source map for easier debug
  // This config will add source map into the output
  //    so we should remove it when building the binary version
  devtool: 'sourcemap',

  // The dev server options to use with webpack dev middleware
  // This config does not effect the build in production
  //    since there's no dev server or dev middleware there
  //    so we don't need to remove it when building the binary version
  devServer: {
    hot: true,
    stats: {
      colors: true,
      children: false,
      modules: false,
    },
    serverSideRender: true,
  },
};

if (process.env.NODE_ENV === 'production') {
  // Remove dev HMR client
  delete webpackConfig.entry.bundleVendor;

  // Set output filename to chunkhash
  // Set hashDigestLength to fit with ExtractTextPlugin
  webpackConfig.output.filename = outputAssetsJsPro;
  webpackConfig.output.hashDigestLength = 32;

  // Remove eslint-loader
  webpackConfig.module.rules = webpackConfig.module.rules.filter(
    m => m.use.loader !== 'eslint-loader',
  );
  // Remove style-loader
  // Use the loader from ExtractTextPlugin to get a separated css file
  for (const ext of ['.scss', '.css']) {
    const rule = webpackConfig.module.rules.find(r => r.test.test(ext));
    rule.use = rule.use.filter(u => u !== 'style-loader');
    rule.use = ExtractTextPlugin.extract(rule.use);
  }
  // Add img-loader to optimize images
  const imageRule = webpackConfig.module.rules.find(r => r.test.test('.png'));
  imageRule.use.push({
    loader: 'img-loader',
    options: {
      gifsicle: {
        interlaced: true,
        optimizationLevel: 3,
      },
      mozjpeg: {
        quality: 100,
      },
      pngquant: {
        quality: 100,
      },
      optipng: false,
      svgo: false,
    },
  });

  // Remove HotModuleReplacementPlugin
  webpackConfig.plugins = webpackConfig.plugins.filter(
    p => !(p instanceof webpack.HotModuleReplacementPlugin),
  );
  // Set FaviconsPlugin output prefix with hash
  const faviconsPlugin = webpackConfig.plugins.find(p => p instanceof FaviconsPlugin);
  faviconsPlugin.options.prefix = outputFaviconsPro;
  // Add other plugins for production
  webpackConfig.plugins.push(
    // Add ExtractTextPlugin with contenthash file name
    new ExtractTextPlugin(outputAssetsCssPro),
    // Add optimization plugins to optimize and minify all bundles
    // https://webpack.js.org/guides/production/#the-manual-way
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"',
    }),
    new webpack.optimize.UglifyJsPlugin({
      comments: false,
      compress: {
        warnings: false,
      },
      mangle: true,
    }),
  );

  // Remove source map
  delete webpackConfig.devtool;
}

export default webpackConfig;
