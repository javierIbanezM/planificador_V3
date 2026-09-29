'use strict';

/**
 * Un único punto canónico para arrancar/parar/reiniciar la app, para evitar
 * la confusión de hoy (varios `node server.js` sueltos compitiendo por el
 * puerto 8011 sin que nadie supiera cuál servía de verdad).
 *
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 restart planificador
 *   pm2 logs planificador
 *   pm2 stop planificador
 *
 * instances/exec_mode fijados a 1/fork a propósito: la sesión usa
 * express-session con MemoryStore (en RAM del propio proceso), así que en
 * modo cluster (>1 instancia) cada petición podría caer en una instancia
 * distinta y perder la sesión. Si en el futuro se pasa a un store
 * compartido (Redis, etc.), se puede subir `instances` y cambiar a
 * exec_mode: 'cluster'.
 */
module.exports = {
  apps: [
    {
      name: 'planificador',
      script: 'server/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        PORT: 8011,
      },
      error_file: 'storage/logs/pm2-error.log',
      out_file: 'storage/logs/pm2-out.log',
      time: true,
    },
  ],
};
