'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');

const env = require('./config/env');

env.load(path.join(__dirname, '..', '.env'));

const appConfig = require('./config/appConfig');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Réplica de bootstrap.php: cabeceras de no-cache en todas las respuestas.
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Sesión — réplica de src/Config/Auth.php::start(). cookie_lifetime=0 en PHP
 * (cookie de sesión) + gc_maxlifetime=28800 (8h de inactividad) se
 * aproximan aquí con `rolling: true` y `cookie.maxAge` de 8h, que se
 * renueva en cada petición mientras haya actividad.
 *
 * Nota: MemoryStore (por defecto) vale para un único proceso Node. Si en
 * producción se despliega con PM2 en modo cluster (>1 instancia), hay que
 * sustituirlo por un store compartido (p.ej. connect-mssql, Redis) para que
 * la sesión no se pierda al cambiar de instancia.
 */
app.use(
  session({
    name: 'PLANIFICADOR_SESSID',
    secret: env.get('SESSION_SECRET', 'planificador-v2-dev-secret'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  res.locals.baseUrl = appConfig.baseUrl();
  res.locals.session = req.session || {};
  next();
});

// Assets estáticos (public/assets/**) — mismas rutas que en PHP (<?= $baseUrl ?>assets/...).
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets')));

// Alias de subidas — réplica de router.php (dev) / alias IIS (prod): sirve
// storage/uploads/** (o la ruta configurada en .env) bajo el prefijo público.
// Igual que en PHP, estas variables de entorno solo son necesarias si el
// módulo correspondiente (cdmuelles/celectronica) se usa de verdad: si
// faltan, se omite el alias en vez de tumbar el arranque de toda la app.
function montarAliasSubidas(alias, rutaFisica, nombre) {
  try {
    app.use(alias(), express.static(rutaFisica()));
  } catch (err) {
    console.warn(`No se pudo montar el alias de subidas "${nombre}": ${err.message}`);
  }
}

montarAliasSubidas(appConfig.uploadsFirmasAlias, appConfig.uploadsFirmasPath, 'firmas');
montarAliasSubidas(appConfig.uploadsCdmuellesAlias, appConfig.uploadsCdmuellesPath, 'cdmuelles');

// Descubre y monta el router de cada módulo (server/modules/<modulo>/routes.js).
const modulesDir = path.join(__dirname, 'modules');
for (const nombre of fs.readdirSync(modulesDir)) {
  const routesPath = path.join(modulesDir, nombre, 'routes.js');
  if (fs.existsSync(routesPath)) {
    app.use(require(routesPath));
  }
}

app.use((req, res) => {
  res.status(404).send('No encontrado');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ status: 'error', mensaje: 'Error interno del servidor' });
});

module.exports = app;
