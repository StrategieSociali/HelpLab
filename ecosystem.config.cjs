module.exports = {
  apps: [
    {
      name: 'helplab-api',
      script: 'build/server.js',
      cwd: '/home/helplab-api/helplab-backend',
      interpreter: '/home/helplab-api/.nvm/versions/node/v20.19.4/bin/node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3001
      }
    }
  ]
}
