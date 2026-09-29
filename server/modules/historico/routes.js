'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/historico.js envía /api/historico.php como multipart/form-data
// (fetch + FormData) aunque no lleva ficheros — hace falta multer para que
// req.body se rellene igual que hacía $_POST en PHP.
const upload = multer();

// GET /historico.php — réplica de public/historico.php.
router.get('/historico.php', auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`), (req, res) => {
  // Réplica de templates/headers/muelles.php: sin almacén en sesión, redirige a index.php.
  if (!req.session.almacen) {
    res.redirect(`${appConfig.baseUrl()}index.php`);
    return;
  }

  res.render('pages/historico', {
    baseUrl: appConfig.baseUrl(),
    page: 'Histórico',
  });
});

// POST /api/historico.php — réplica de public/api/historico.php.
router.post('/api/historico.php', auth.requireLoginApi('No autenticado'), upload.none(), async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const almacen = String(req.session.almacen || '');
  const todo = req.body.todo === '1' || req.body.todo === 'true';

  switch (funcion) {
    case 'historico_planigrid':
      res.json(await controller.planigrid(almacen, todo));
      break;

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
