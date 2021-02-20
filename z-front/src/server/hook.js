import cssModulesRequireHook from 'css-modules-require-hook';
import sass from 'node-sass';

// The local identity class name template
// This should be used for css loader options in src/webpack/webpackConfig.js
//    then the class name will be the same in both server and browser
const localIdentName = '[local]';

// Hook the css modules with sass preprocessor
//    then we can require .scss files in server side
// If we also need to require other files from webpack bundles
//    use webpack-register instead
cssModulesRequireHook({
  extensions: ['.scss', '.sass'],
  generateScopedName: localIdentName,
  preprocessCss: (data, file) =>
    sass.renderSync({
      data,
      file,
    }).css,
});

export { localIdentName };
