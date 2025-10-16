module.exports = {
  apps: [
    {
      name: 'chatbot-backend',
      cwd: './backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: './backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      // Pre-requisites
      pre_deploy_local: 'npm run build',
      post_update: 'npm install && npm run build'
    },
    {
      name: 'chatbot-frontend',
      cwd: './frontend',
      script: 'npx',
      args: 'vite preview --port 5173 --host',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: './frontend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      // Pre-requisites
      pre_deploy_local: 'npm run build',
      post_update: 'npm install && npm run build'
    }
  ]
};
