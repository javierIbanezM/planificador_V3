'use strict';

const express = require('express');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// GET /api/muelles-estado.php — réplica de public/api/muelles-estado.php.
// El original no comprueba el método HTTP (solo Auth::check()); se replica
// igual y se acepta en GET, que es como lo consume header-muelles.ejs.
router.get('/api/muelles-estado.php', async (req, res) => {
  if (!auth.check(req)) {
    res.status(401).json({ status: 'error', mensaje: 'No autenticado' });
    return;
  }

  res.json(await controller.estado(String(req.session.almacen || '')));
});

module.exports = router;
