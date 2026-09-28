'use strict';

const express = require('express');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

router.get('/', (req, res) => res.redirect(`${appConfig.baseUrl()}index.php`));

// GET/POST /index.php — réplica de public/index.php (Visor Global / selector de almacén).
router.get('/index.php', auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`), async (req, res) => {
  const almacenes = await controller.almacenes();
  res.render('pages/index', {
    baseUrl: appConfig.baseUrl(),
    page: 'Visor Global',
    almacenes,
  });
});

router.post('/index.php', auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`), async (req, res) => {
  const almacenSolicitado = String(req.body.almacen || '');

  if (await controller.seleccionarAlmacen(almacenSolicitado)) {
    req.session.almacen = almacenSolicitado;
    res.redirect(`${appConfig.baseUrl()}planificador.php`);
    return;
  }

  // Almacén inválido/inexistente: no se guarda en sesión, se vuelve a
  // mostrar el listado.
  const almacenes = await controller.almacenes();
  res.render('pages/index', {
    baseUrl: appConfig.baseUrl(),
    page: 'Visor Global',
    almacenes,
  });
});

module.exports = router;
