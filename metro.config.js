const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of Supabase packages
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Stub native-only packages on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'shims/react-native-maps.web.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-notifications') {
      return {
        filePath: path.resolve(__dirname, 'shims/expo-notifications.web.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-device') {
      return {
        filePath: path.resolve(__dirname, 'shims/expo-device.web.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
