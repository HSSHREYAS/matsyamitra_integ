/**
 * React Native Config — Asset & Module linking
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null, // We're Android-only for now
      },
    },
  },
};
