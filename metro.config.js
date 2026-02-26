const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of Supabase packages
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Stub react-native-maps on web (it uses native-only internals)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'shims/react-native-maps.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
