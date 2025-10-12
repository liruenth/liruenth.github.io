const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js', // Your main ES6 entry file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css', // Output filename for extracted CSS
    }),
     new HtmlWebpackPlugin({
        title: 'Clue Breaker', // Title for the generated HTML
        template: './src/index.html', // Path to your HTML template (optional)
        filename: 'index.html', // Name of the output HTML file
        inject: 'body', // Where to inject script tags (head or body)
        // Other options like minify, favicon, etc. can be added here
      }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Can also be defined in .babelrc
          },
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  // Optional: If targeting specific environments for generated runtime code
  // target: ['web', 'es5'], // or ['web', 'es6'] if only modern browsers are supported
};