// Metro tweaks Privy's Expo SDK needs (https://docs.privy.io/basics/react-native/installation).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // isows and zustand ship ESM entry points Metro cannot load via package exports.
  if (moduleName === 'isows' || moduleName.startsWith('zustand')) {
    return context.resolveRequest({ ...context, unstable_enablePackageExports: false }, moduleName, platform);
  }
  // jose must resolve to its browser build in React Native.
  if (moduleName === 'jose') {
    return context.resolveRequest({ ...context, unstable_conditionNames: ['browser'] }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config;
