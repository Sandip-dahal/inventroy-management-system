// craco.config.js
module.exports = {
  devServer: {
    client: {
      webSocketURL: {
        hostname: 'localhost',
        port: 3000,
        pathname: '/ws'
      },
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'none'
    }
  }
};