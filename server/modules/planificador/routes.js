'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/planificador.js envía /api/planificador.php como
// multipart/form-data (fetch + FormData) aunque no lleva ficheros — hace
// falta multer para que req.body se rellene igual que hacía $_POST en PHP.
const upload = multer();

// GET /planificador.php — réplica de public/planificador.php.
router.get('/planificador.php', auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`), (req, res) => {
  // Réplica de templates/headers/muelles.php: sin almacén en sesión, redirige a index.php.
  if (!req.session.almacen) {
    res.redirect(`${appConfig.baseUrl()}index.php`);
    return;
  }

  res.render('pages/planificador', {
    baseUrl: appConfig.baseUrl(),
    page: 'Planificador',
  });
});

// POST /api/planificador.php — réplica de public/api/planificador.php.
router.post('/api/planificador.php', auth.requireLoginApi('No autenticado'), upload.none(), async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const almacen = String(req.session.almacen || '');

  switch (funcion) {
    case 'planigrid':
      res.json(await controller.planigrid(almacen));
      break;

    case 'posiblesReruteos':
      res.json(await controller.posiblesReruteos(almacen));
      break;

    case 'fusionarReruteo': {
      const idAntiguo = parseInt(req.body.idAntiguo, 10);
      const idNuevo = parseInt(req.body.idNuevo, 10);
      const usuario = String(req.session.usuario || '');

      if (!Number.isInteger(idAntiguo) || !Number.isInteger(idNuevo)) {
        res.status(400).json({ status: 'error', mensaje: 'idAntiguo/idNuevo inválidos' });
        break;
      }

      res.json(await controller.fusionarReruteo(idAntiguo, idNuevo, usuario));
      break;
    }

    case 'agruparcd': {
      const selectedRows = String(req.body.selectedrows || '');
      const usuario = String(req.session.usuario || '');
      res.json(await controller.agruparcd(selectedRows, usuario));
      break;
    }

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
