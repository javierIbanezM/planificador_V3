'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/visor-almacen.js envía /api/visor-almacen.php como
// multipart/form-data (fetch + FormData) aunque no lleva ficheros — hace
// falta multer para que req.body se rellene igual que hacía $_POST en PHP.
const upload = multer();

// GET /visor-almacen.php — réplica de public/visor-almacen.php.
router.get(
  '/visor-almacen.php',
  auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`),
  (req, res) => {
    // Réplica de templates/headers/muelles.php: sin almacén en sesión,
    // redirige al selector de almacén (index.php).
    if (!req.session.almacen) {
      res.redirect(`${appConfig.baseUrl()}index.php`);
      return;
    }

    res.render('pages/visor-almacen', {
      baseUrl: appConfig.baseUrl(),
      page: 'Visor de almacén',
    });
  }
);

// /api/visor-almacen.php — réplica de public/api/visor-almacen.php (solo
// POST; cualquier otro método responde 405, igual que el original).
router.all('/api/visor-almacen.php', (req, res, next) => {
  if (!auth.check(req)) {
    res.status(401).json({ status: 'error', mensaje: 'No autenticado' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', mensaje: 'Método no permitido' });
    return;
  }

  upload.none()(req, res, next);
}, async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const almacen = String(req.session.almacen || '');

  switch (funcion) {
    case 'visordealmacen_consigenlanave':
      res.json(await controller.consigEnLaNave(almacen));
      return;

    case 'visordealmacen_consignopreparadas':
      res.json(await controller.consigNoPreparadas(almacen));
      return;

    case 'visordealmacen_consigpreparadas':
      res.json(await controller.consigPreparadas(almacen));
      return;

    case 'visordealmacen_preavsinrecep':
      res.json(await controller.preavisosSinRecepcionar(almacen));
      return;

    case 'visordealmacen_preavporllegar':
      res.json(await controller.preavisosPorLlegar(almacen));
      return;

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
