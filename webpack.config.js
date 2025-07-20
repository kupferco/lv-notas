const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      // Use production mode for builds, development for dev server
      mode: env.mode || 'production',
    },
    argv
  );
  
  // Only exclude Airtable for web (keep Google Cloud for server connections)
  config.resolve.alias = {
    ...config.resolve.alias,
    'airtable': false,
    'airt': false
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
