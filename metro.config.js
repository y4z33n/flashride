const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution of Supabase packages
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
