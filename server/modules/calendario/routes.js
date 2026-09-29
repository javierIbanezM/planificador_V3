'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/calendario.js envía /api/calendario.php como
// multipart/form-data (fetch + FormData) aunque no lleva ficheros — hace
// falta multer para que req.body se rellene igual que hacía $_POST en PHP.
const upload = multer();

// GET /calendario.php — réplica de public/calendario.php.
router.get('/calendario.php', auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`), (req, res) => {
  // Réplica de templates/headers/muelles.php: sin almacén en sesión, redirige a index.php.
  if (!req.session.almacen) {
    res.redirect(`${appConfig.baseUrl()}index.php`);
    return;
  }

  res.render('pages/calendario', {
    baseUrl: appConfig.baseUrl(),
    page: 'Calendario',
  });
});

// POST /api/calendario.php — réplica de public/api/calendario.php.
router.post('/api/calendario.php', auth.requireLoginApi('No autenticado'), upload.none(), async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const almacen = String(req.session.almacen || '');
  const fechaConsultada = String(req.body.fechaconsultada || '');

  switch (funcion) {
    case 'CalendarioReal':
      res.json(await controller.calendarioReal(almacen, fechaConsultada));
      break;

    case 'CalendarioProgramado':
      res.json(await controller.calendarioProgramado(almacen, fechaConsultada));
      break;

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
