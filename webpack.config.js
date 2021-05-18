const HtmlWebpackPlugin = require('html-webpack-plugin');

const path = require('path');

module.exports = {
  entry: './index.tsx',
  devServer: {
    host: '0.0.0.0',
    // Enable compression
    compress: true,
    // Enable hot reloading
    hot: true,

    port: 8080,

    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: 'defaults' }]],
            plugins: ['@babel/plugin-transform-react-jsx'],
          },
        },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
        use: ['file-loader'],
      },
    ],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '/react-build'),
    publicPath: '/',
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: path.join(__dirname, '/index.html'),
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.tsx', '.ts'],
  },
};
