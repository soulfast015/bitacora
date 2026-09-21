module.exports = {
  apps: [
    {
      name: "bitacora",
      script: ".next/standalone/server.js",
      cwd: "/www/wwwroot/bitacora",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/www/wwwroot/bitacora/logs/error.log",
      out_file: "/www/wwwroot/bitacora/logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
