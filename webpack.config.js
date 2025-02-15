const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      mode: 'development',
    },
    argv
  );
  
  // Completely ignore @google-cloud modules for web
  config.resolve.alias = {
    ...config.resolve.alias,
    '@google-cloud/secret-manager': false
  };
  
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "net": false,
    "http": false,
    "https": false,
    "path": false,
    "crypto": false,
    "stream": false,
    "url": false,
    "querystring": false,
    "fs": false,
    "util": false,
    "os": false,
    "child_process": false
  };
  
  return config;
};