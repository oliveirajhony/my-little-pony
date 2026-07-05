const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      // swc transpiles cross-project sources without enforcing tsc's rootDir
      // (TS6059); type-checking stays in the separate `typecheck` target.
      compiler: 'swc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
    // NxAppWebpackPlugin wires swc-loader but does not enable decorator metadata.
    // Nest (and TypeORM) resolve dependencies via emitted design:paramtypes, so
    // turn it on for every swc-loader rule after the plugin has applied.
    {
      apply(compiler) {
        compiler.hooks.afterEnvironment.tap('EnableSwcDecoratorMetadata', () => {
          for (const rule of compiler.options.module.rules) {
            const loader = rule?.loader;
            if (typeof loader === 'string' && loader.includes('swc-loader')) {
              rule.options = rule.options || {};
              rule.options.jsc = rule.options.jsc || {};
              rule.options.jsc.parser = {
                ...rule.options.jsc.parser,
                syntax: 'typescript',
                decorators: true,
              };
              rule.options.jsc.transform = {
                ...rule.options.jsc.transform,
                legacyDecorator: true,
                decoratorMetadata: true,
              };
              rule.options.jsc.keepClassNames = true;
            }
          }
        });
      },
    },
  ],
};
