const path = require("path")

const webpack = require("webpack")
const HtmlWebpackPlugin = require("html-webpack-plugin")

const appDirectory = path.resolve(__dirname)
const { presets } = require(`${appDirectory}/babel.config.js`)

const compileNodeModules = [
  // Add every react-native package that needs compiling
  "@react-native-picker/picker",
  "react-native-root-toast",
  "react-native-snap-carousel",
  "react-native-swiper",
  "react-native-vector-icons",
  "react-native-walkthrough-tooltip",
  "victory-native",
  "react-native-elements",
  "react-native-image-picker",
  "react-native-maps",
  "react-native-qrcode-svg",
  "react-native-ratings",
  "react-native-root-siblings",
  "react-native-version-number",
  "@react-native-community/push-notification-ios",
  'react-native-camera',
  '@storybook/react-native',
  '@storybook/addon-actions',
  '@storybook/addon-knobs',
  '@storybook/addon-ondevice-actions',
  '@storybook/addon-ondevice-knobs',
  '@storybook/react-native',
  '@storybook/react-native-server',
  'react-native-animatable',
  '@react-navigation/stack',
  '@react-navigation/native',
  'react-native-modal-selector',
  'react-native-swipe-gestures',
  'react-native-modal-datetime-picker'
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`))

const babelLoaderConfiguration = {
  test: /\.js$|tsx?$/,
  // Add every directory that needs to be compiled by Babel during the build.
  include: [
    path.resolve(__dirname, "index.web.js"), // Entry to your application
    path.resolve(__dirname, "./app.tsx"), // Change this to your main App file
    path.resolve(__dirname, "app"),
    ...compileNodeModules,
  ],
  use: {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      presets,
      plugins: ["react-native-web"],
    },
  },
}

const svgLoaderConfiguration = {
  test: /\.svg$/,
  use: [
    {
      loader: "@svgr/webpack",
    },
  ],
}

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|ttf)$/,
  use: {
    loader: "url-loader",
    options: {
      name: "[name].[ext]",
    },
  },
}

module.exports = {
  entry: {
    app: path.join(__dirname, "index.web.js"),
  },
  output: {
    path: path.resolve(appDirectory, "dist"),
    publicPath: "/",
    filename: "rnw_blogpost.bundle.js",
  },
  resolve: {
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".web.js", ".js"],
    alias: {
      'react-native$': 'react-native-web'
  },
    fallback: { "stream": require.resolve("stream-browserify") }
  },
  module: {
    rules: [babelLoaderConfiguration, imageLoaderConfiguration, svgLoaderConfiguration],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "index.html"),
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      // See: https://github.com/necolas/react-native-web/issues/349
      __DEV__: JSON.stringify(true),
    }),
  ],
}
