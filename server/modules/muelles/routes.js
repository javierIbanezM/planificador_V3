'use strict';

const express = require('express');
const multer = require('multer');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// comunes.js envía /api/muelles.php como multipart/form-data (fetch +
// FormData) aunque no lleva ficheros — hace falta multer para que req.body
// se rellene igual que hacía $_POST en PHP.
const upload = multer();

// /api/muelles.php — réplica de public/api/muelles.php (solo POST; cualquier
// otro método responde 405, igual que el original).
router.all('/api/muelles.php', auth.requireLoginApi('No autenticado'), (req, res, next) => {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', mensaje: 'Método no permitido' });
    return;
  }

  upload.none()(req, res, next);
}, async (req, res) => {
  const funcion = String(req.body.funcion || '');
  const usuario = String(req.session.usuario || '');
  const almacen = String(req.session.almacen || '');
  const muelle = String(req.body.muelle || '');

  switch (funcion) {
    case 'modal_infomuelle':
      res.json(await controller.infoMuelle(muelle, almacen));
      return;

    case 'modal_infomuellereserva':
      res.json(await controller.infoMuelleReserva(muelle, almacen));
      return;

    case 'modal_logsmuelles':
      res.json(await controller.logsMuelle(almacen, muelle));
      return;

    case 'modal_consultaMuelleActivo':
      res.json(await controller.consultaMuelleActivo(muelle, almacen));
      return;

    case 'ActivaMuelle':
      res.json(await controller.activarMuelle(muelle, almacen, usuario));
      return;

    case 'DesactivaMuelle':
      res.json(await controller.desactivarMuelle(muelle, almacen, usuario));
      return;

    default:
      res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
  }
});

module.exports = router;
