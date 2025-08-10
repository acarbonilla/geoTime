module.exports = {
  devServer: {
    allowedHosts: 'all',
  },
  // Environment-specific configuration
  webpack: {
    configure: (webpackConfig, { env }) => {
      // Set environment variables based on build environment
      if (env === 'production') {
                 webpackConfig.plugins.forEach(plugin => {
           if (plugin.constructor.name === 'DefinePlugin') {
             plugin.definitions['process.env.REACT_APP_API_URL'] = JSON.stringify('https://iais.online/api');
             plugin.definitions['process.env.REACT_APP_DOMAIN'] = JSON.stringify('iais.online');
             plugin.definitions['process.env.REACT_APP_ENVIRONMENT'] = JSON.stringify('production');
           }
         });
      }
      return webpackConfig;
    },
  },
}; 