'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/configuracion.js envía /api/configuracion.php como
// multipart/form-data (fetch + FormData) aunque no lleva ficheros — hace
// falta multer para que req.body se rellene igual que hacía $_POST en PHP.
const upload = multer();

/**
 * Guard para los fragmentos AJAX y el shell. Réplica de Auth::check(): a
 * diferencia de public/configuracion.php (que exige login con redirect vía
 * Auth::requireLogin), los fragmentos public/configuracion/*.php devuelven
 * 401 con un cuerpo HTML (no JSON) cuando no hay sesión.
 */
function requireSessionFragment(req, res, next) {
  if (!auth.check(req)) {
    res.status(401).send('<p>Sesión no iniciada.</p>');
    return;
  }
  next();
}

// GET /configuracion.php — réplica de public/configuracion.php (shell SPA-like).
router.get('/configuracion.php', auth.requireLogin('Configuración', `${appConfig.baseUrl()}login.php`), (req, res) => {
  // Réplica de templates/headers/muelles.php (incluido por el shell): sin
  // almacén en sesión, redirige a index.php.
  if (!req.session.almacen) {
    res.redirect(`${appConfig.baseUrl()}index.php`);
    return;
  }

  res.render('pages/configuracion', {
    baseUrl: appConfig.baseUrl(),
    page: 'Configuración',
  });
});

// GET /configuracion/inicio.php — réplica de public/configuracion/inicio.php.
router.get('/configuracion/inicio.php', requireSessionFragment, (req, res) => {
  res.render('pages/configuracion/inicio');
});

// GET /configuracion/almacenes.php — réplica de public/configuracion/almacenes.php.
router.get('/configuracion/almacenes.php', requireSessionFragment, (req, res) => {
  res.render('pages/configuracion/almacenes');
});

// GET /configuracion/variables.php — réplica de public/configuracion/variables.php.
router.get('/configuracion/variables.php', requireSessionFragment, (req, res) => {
  res.render('pages/configuracion/variables');
});

// GET /configuracion/automatizaciones.php — réplica de public/configuracion/automatizaciones.php.
router.get('/configuracion/automatizaciones.php', requireSessionFragment, (req, res) => {
  res.render('pages/configuracion/automatizaciones');
});

// /api/configuracion.php — réplica de public/api/configuracion.php (solo
// POST; cualquier otro método responde 405, igual que el original).
router.all('/api/configuracion.php', auth.requireLoginApi('No autenticado'), (req, res, next) => {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', mensaje: 'Método no permitido' });
    return;
  }

  upload.none()(req, res, next);
}, async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const usuario = String(req.session.usuario || '');

  switch (funcion) {
    case 'crearalmacen':
      res.json(await controller.crearAlmacen(req.body, usuario));
      break;

    case 'eliminaralmacen':
      res.json(await controller.eliminarAlmacen(String(req.body.almacen || ''), usuario));
      break;

    case 'maestroalmacenes':
      res.json(await controller.maestroAlmacenes());
      break;

    case 'logsmaestro':
      res.json(await controller.logsMaestro(String(req.body.maestro || '')));
      break;

    case 'maestrovariablesdelsistema':
      res.json(await controller.maestroVariablesDelSistema());
      break;

    case 'MaestroAutomatizaciones':
      res.json(await controller.maestroAutomatizaciones());
      break;

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
