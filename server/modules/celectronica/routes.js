'use strict';

const express = require('express');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const controller = require('./controller');

const router = express.Router();

// public/assets/celectronica/celectronica.js y firma.php envían los 4
// endpoints de abajo como multipart/form-data (fetch + FormData), incluso
// cuando solo llevan campos de texto (p.ej. la firma en base64). express no
// parsea multipart por defecto (a diferencia del $_POST de PHP, que sí lo
// hace); upload.none() rellena req.body igual que $_POST para formularios
// sin ficheros.
const upload = multer();

/**
 * Sin auth.requireLogin/auth.check() a propósito: celectronica es la tablet
 * de firma ADR en el muelle, pensada para que el transportista la use sin
 * credenciales. El PHP original (public/celectronica/index.php,
 * public/celectronica/firma.php y los 4 endpoints de
 * public/api/celectronica/) no llama a Auth::check() en ninguno de los dos
 * casos — se verificó leyendo cada fichero, no solo el catálogo del
 * proyecto — y aquí se replica exactamente igual: el único control de
 * acceso real es conocer la URL con "?almacen=".
 */

// GET /celectronica/index.php — réplica de public/celectronica/index.php.
router.get('/celectronica/index.php', (req, res) => {
  if (req.query.almacen === undefined) {
    res.redirect(`${appConfig.baseUrl()}login.php?entorno=Planificador`);
    return;
  }

  req.session.almacen = String(req.query.almacen);

  res.render('pages/celectronica/index', {
    baseUrl: appConfig.baseUrl(),
    titulo: 'Centralita Electrónica',
  });
});

// GET /celectronica/firma.php — réplica de public/celectronica/firma.php.
router.get('/celectronica/firma.php', (req, res) => {
  res.render('pages/celectronica/firma', {
    baseUrl: appConfig.baseUrl(),
    conductorNombre: req.session.conductorNombre ? String(req.session.conductorNombre) : '',
    conductorApellidos: req.session.conductorApellidos ? String(req.session.conductorApellidos) : '',
    consignacion: req.session.consignacion ? String(req.session.consignacion) : '',
  });
});

// POST /api/celectronica/mostrar-muelles-adr.php — réplica de public/api/celectronica/mostrar-muelles-adr.php.
router.post('/api/celectronica/mostrar-muelles-adr.php', upload.none(), async (req, res) => {
  const almacen = String(req.session.almacen || '');
  res.json(await controller.mostrarMuellesAdr(almacen));
});

// POST /api/celectronica/mostrar-ordenes.php — réplica de public/api/celectronica/mostrar-ordenes.php.
router.post('/api/celectronica/mostrar-ordenes.php', upload.none(), async (req, res) => {
  const almacen = String(req.session.almacen || '');
  const muelle = String(req.body.muelle || '');
  res.json(await controller.mostrarOrdenes(almacen, muelle));
});

// POST /api/celectronica/entrar-firma.php — réplica de public/api/celectronica/entrar-firma.php.
router.post('/api/celectronica/entrar-firma.php', upload.none(), async (req, res) => {
  const id = String(req.body.id || '');
  res.json(await controller.entrarFirma(req, id));
});

// POST /api/celectronica/guardar-firma.php — réplica de public/api/celectronica/guardar-firma.php.
router.post('/api/celectronica/guardar-firma.php', upload.none(), async (req, res) => {
  const firma = String(req.body.firma || '');
  res.json(await controller.guardarFirma(req, firma));
});

module.exports = router;
