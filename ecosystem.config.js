/**
 * PM2 Ecosystem Configuration
 * Runs both Next.js app and background worker
 */

module.exports = {
  apps: [
    {
      name: 'shootingstar-web',
      script: 'server.js',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
    {
      name: 'shootingstar-worker',
      script: 'dist/worker/index.js',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
