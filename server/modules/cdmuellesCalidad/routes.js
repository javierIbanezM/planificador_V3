'use strict';

const express = require('express');
const multer = require('multer');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// cdmuelles-calidad.js envía todos estos endpoints como multipart/form-data
// (fetch + FormData) aunque no llevan ficheros — hace falta multer para que
// req.body se rellene igual que hacía $_POST en PHP. Se aplica por-ruta (no
// con router.use) porque este router se monta en la raíz junto a otros
// routers de cdmuelles que comparten el mismo prefijo '/api/cdmuelles': un
// router.use(prefijo, fn) aquí también interceptaría (y consumiría el
// stream de) peticiones que en realidad pertenecen a esos otros routers.
const uploadNone = multer().none();

// Réplica del guard `if (!Auth::check()) { http_response_code(401); ... }`
// repetido en cada public/api/cdmuelles/*.php de Calidad/Expediciones.
function requireAuthJson(req, res, next) {
  if (!auth.check(req)) {
    res.status(401).json({ status: 'error', mensaje: 'No autenticado' });
    return;
  }
  next();
}

// ---------------------------------------------------------------------
// Calidad (Quiz de calidad)
// ---------------------------------------------------------------------

// POST /api/cdmuelles/logs-sonda-manual.php
router.post('/api/cdmuelles/logs-sonda-manual.php', requireAuthJson, uploadNone, async (req, res) => {
  const pin = String(req.body.pin || '');
  const usuario = String(req.body.usuario || '');
  const idplanigrid = String(req.body.idplanigrid || '');
  const numSonda = String(req.body.numSonda || '');

  await controller.calidad.logsSondaManual(pin, usuario, idplanigrid, numSonda);

  // El original tampoco devolvía contenido significativo en esta acción (era
  // "fire and forget" desde el cliente, ver CalidadController::logsSondaManual).
  res.json({ status: 'ok' });
});

// POST /api/cdmuelles/pin-jefe-sonda.php
router.post('/api/cdmuelles/pin-jefe-sonda.php', requireAuthJson, uploadNone, async (req, res) => {
  const pin = String(req.body.pin || '');
  const usuario = String(req.body.usuario || '');
  const idplanigrid = String(req.body.idplanigrid || '');

  res.json(await controller.calidad.pinJefeSonda(pin, usuario, idplanigrid));
});

// POST /api/cdmuelles/pin-jefe.php
router.post('/api/cdmuelles/pin-jefe.php', requireAuthJson, uploadNone, async (req, res) => {
  const pin = String(req.body.pin || '');
  const usuario = String(req.body.usuario || '');
  const idplanigrid = String(req.body.idplanigrid || '');
  const observacion = String(req.body.observacion || '');

  switch (observacion) {
    case 'permitirdiscrepancia':
      res.json(await controller.calidad.permitirDiscrepancia(pin, usuario, idplanigrid));
      return;

    case 'continuarquiznoaprobado': {
      const numSonda = req.body.numSonda !== undefined ? String(req.body.numSonda) : null;
      const causas = String(req.body.causas || '');
      res.json(await controller.calidad.continuarQuizNoAprobado(pin, usuario, idplanigrid, numSonda, causas));
      return;
    }

    default:
      // El original no producía ninguna salida para cualquier otro valor de
      // "observacion" (el if solo contemplaba esos dos casos).
      res.end();
  }
});

// POST /api/cdmuelles/enviar-check.php
router.post('/api/cdmuelles/enviar-check.php', requireAuthJson, uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  const usuario = String(req.body.usuario || '');

  let preguntasYRespuestas;
  try {
    preguntasYRespuestas = JSON.parse(String(req.body.preguntasYRespuestas || '[]'));
  } catch (err) {
    preguntasYRespuestas = [];
  }
  if (!Array.isArray(preguntasYRespuestas)) {
    preguntasYRespuestas = [];
  }

  res.json(await controller.calidad.enviarCheck(id, usuario, preguntasYRespuestas));
});

// ---------------------------------------------------------------------
// Expediciones (bultos / contenedores)
// ---------------------------------------------------------------------

// POST /api/cdmuelles/contenedores-albaran.php
router.post('/api/cdmuelles/contenedores-albaran.php', requireAuthJson, uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const albaran = String(req.body.albaran || '');

  res.json(await controller.expediciones.contenedoresAlbaran(idplanigrid, albaran));
});

// POST /api/cdmuelles/contenedores-verificados.php
router.post('/api/cdmuelles/contenedores-verificados.php', requireAuthJson, uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const albaran = String(req.body.albaran || '');

  res.json(await controller.expediciones.contenedoresVerificados(idplanigrid, albaran));
});

// POST /api/cdmuelles/incrementar-bultos.php
router.post('/api/cdmuelles/incrementar-bultos.php', requireAuthJson, uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const albaran = String(req.body.albaran || '');
  const usuario = String(req.body.usuario || '');
  const playa = req.body.playa !== undefined ? String(req.body.playa) : '';
  const contenedor = req.body.contenedor !== undefined ? String(req.body.contenedor) : '';

  res.json(await controller.expediciones.incrementarBultos(idplanigrid, albaran, usuario, playa, contenedor));
});

// POST /api/cdmuelles/decrementar-bultos.php
router.post('/api/cdmuelles/decrementar-bultos.php', requireAuthJson, uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const albaran = String(req.body.albaran || '');
  const usuario = String(req.body.usuario || '');

  res.json(await controller.expediciones.decrementarBultos(idplanigrid, albaran, usuario));
});

// POST /api/cdmuelles/quitar-contenedor.php
router.post('/api/cdmuelles/quitar-contenedor.php', requireAuthJson, uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const albaran = String(req.body.albaran || '');
  const usuario = String(req.body.usuario || '');
  const contenedor = String(req.body.contenedor || '');

  res.json(await controller.expediciones.quitarContenedor(idplanigrid, albaran, usuario, contenedor));
});

// POST /api/cdmuelles/select-ubicaciones.php
router.post('/api/cdmuelles/select-ubicaciones.php', requireAuthJson, uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  const almacen = String(req.session.almacen || '');

  res.json(await controller.expediciones.selectUbicaciones(id, almacen));
});

// POST /api/cdmuelles/enviar-datos-cdpq.php
router.post('/api/cdmuelles/enviar-datos-cdpq.php', requireAuthJson, uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  const bultos = String(req.body.bultos || '');
  const usuario = String(req.body.usuario || '');

  res.json(await controller.expediciones.enviarDatosCdpq(id, bultos, usuario));
});

module.exports = router;
