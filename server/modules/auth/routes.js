'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// public/assets/login.js envía /api/login.php como multipart/form-data
// (fetch + FormData), aunque no lleva ficheros — express no parsea
// multipart por defecto (a diferencia de $_POST en PHP), así que hace
// falta multer para rellenar req.body igual que hacía $_POST.
const upload = multer();

// GET /login.php — réplica de public/login.php.
router.get('/login.php', (req, res) => {
  const entorno = String(req.query.entorno || '');

  if (!appConfig.entornos().includes(entorno)) {
    res.redirect(`${appConfig.baseUrl()}login.php?entorno=Planificador`);
    return;
  }

  res.render('pages/login', {
    baseUrl: appConfig.baseUrl(),
    entorno,
  });
});

// POST /api/login.php — réplica de public/api/login.php.
router.post('/api/login.php', upload.none(), async (req, res) => {
  const entorno = String(req.body.entorno || '');
  const pin = String(req.body.pin || '');

  if (!appConfig.entornos().includes(entorno) || pin === '') {
    res.json({ status: 'failure', mensaje: 'Datos de acceso inválidos' });
    return;
  }

  if (entorno === 'cdmuelles') {
    res.json(await controller.loginPda(req, pin, entorno));
    return;
  }

  const nombre = String(req.body.nombre || '');
  res.json(await controller.loginDesktop(req, pin, nombre, entorno));
});

// /api/logout.php — réplica de public/api/logout.php: el PHP original no
// comprueba el método HTTP, y comunes.js (cierresesion()) lo llama con un
// fetch() sin `method` (GET por defecto) — se replica con router.all en vez
// de restringir a POST.
router.all('/api/logout.php', async (req, res) => {
  await auth.logout(req);
  res.json({ status: 'success' });
});

module.exports = router;
