module.exports = {
  apps: [
    {
      name: 'webapp-railway',
      script: 'npx',
      args: 'tsx src/server.ts',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false, // Disable PM2 file monitoring
      instances: 1, // Development mode uses only one instance
      exec_mode: 'fork'
    }
  ]
}