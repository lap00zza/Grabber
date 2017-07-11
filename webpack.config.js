var path = require('path')
var fs = require('fs')
var webpack = require('webpack')

module.exports = {
  cache: true,
  entry: {
    cs_watch_page: './src/index.js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  },
  output: {
    filename: 'grabber.user.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: fs.readFileSync('./USERSCRIPT', {encoding: 'UTF-8'}),
      entryOnly: true,
      raw: true
    })
  ]
}
