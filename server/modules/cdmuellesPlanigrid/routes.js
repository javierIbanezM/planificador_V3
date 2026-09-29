'use strict';

const express = require('express');
const multer = require('multer');
const auth = require('../../config/auth');
const planigridController = require('./planigridController');
const impresionController = require('./impresionController');

const router = express.Router();

// cdmuelles-ordenes.js/cdmuelles-fotos.js envían todos estos endpoints como
// multipart/form-data (fetch + FormData) aunque no llevan ficheros — hace
// falta multer para que req.body se rellene igual que hacía $_POST en PHP.
// Se aplica por-ruta (no con router.use) porque este router se monta en la
// raíz junto a otros routers de cdmuelles que comparten el mismo prefijo
// '/api/cdmuelles': un router.use(prefijo, fn) aquí también interceptaría
// (y consumiría el stream de) peticiones que en realidad pertenecen a esos
// otros routers.
const uploadNone = multer().none();

// POST /api/cdmuelles/mostrar-muelles.php — réplica de public/api/cdmuelles/mostrar-muelles.php.
router.post('/api/cdmuelles/mostrar-muelles.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const almacen = String(req.body.almacen || '');
  res.json(await planigridController.mostrarMuelles(almacen));
});

// POST /api/cdmuelles/mostrar-tabla-ordenes.php — réplica de public/api/cdmuelles/mostrar-tabla-ordenes.php.
router.post('/api/cdmuelles/mostrar-tabla-ordenes.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const almacen = String(req.body.almacen || '');
  const muelle = String(req.body.muelle || '');
  res.json(await planigridController.mostrarTablaOrdenes(almacen, muelle));
});

// POST /api/cdmuelles/consultar-estado.php — réplica de public/api/cdmuelles/consultar-estado.php.
router.post('/api/cdmuelles/consultar-estado.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  res.json(await planigridController.consultaEstado(id));
});

// POST /api/cdmuelles/cambiar-estado.php — réplica de public/api/cdmuelles/cambiar-estado.php.
router.post('/api/cdmuelles/cambiar-estado.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const estado = String(req.body.estado || '');
  const id = String(req.body.id || '');
  res.json(await planigridController.cambiaEstado(estado, id));
});

// POST /api/cdmuelles/atras-estado.php — réplica de public/api/cdmuelles/atras-estado.php.
router.post('/api/cdmuelles/atras-estado.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  const descripcion = String(req.body.descripcion || '');
  res.json(await planigridController.atrasEstadoCdmuelles(id, descripcion));
});

// POST /api/cdmuelles/entrar-orden1.php — réplica de public/api/cdmuelles/entrar-orden1.php.
router.post('/api/cdmuelles/entrar-orden1.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  res.json(await planigridController.entrarOrden1(id));
});

// POST /api/cdmuelles/mostrar-albaranes.php — réplica de public/api/cdmuelles/mostrar-albaranes.php.
router.post('/api/cdmuelles/mostrar-albaranes.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  res.json(await planigridController.mostrarAlbaranes(id));
});

// POST /api/cdmuelles/observaciones.php — réplica de public/api/cdmuelles/observaciones.php.
router.post('/api/cdmuelles/observaciones.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const id = String(req.body.id || '');
  res.json(await planigridController.observaciones(id));
});

// POST /api/cdmuelles/finalizar-carga.php — réplica de public/api/cdmuelles/finalizar-carga.php.
router.post('/api/cdmuelles/finalizar-carga.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const usuario = String(req.body.usuario || req.session.usuario || '');
  res.json(await planigridController.finalizarCarga(idplanigrid, usuario));
});

// POST /api/cdmuelles/guardar-granel.php — réplica de public/api/cdmuelles/guardar-granel.php.
router.post('/api/cdmuelles/guardar-granel.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const idplanigrid = String(req.body.idplanigrid || '');
  const granel = String(req.body.granel || '');
  const palets = req.body.palets !== undefined ? String(req.body.palets) : null;
  res.json(await planigridController.guardarGranel(idplanigrid, granel, palets));
});

// POST /api/cdmuelles/select-impresoras.php — réplica de public/api/cdmuelles/select-impresoras.php.
router.post('/api/cdmuelles/select-impresoras.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const almacen = String(req.session.almacen || '');
  res.json(await impresionController.selectImpresoras(almacen));
});

// POST /api/cdmuelles/imprimir-informes.php — réplica de public/api/cdmuelles/imprimir-informes.php.
router.post('/api/cdmuelles/imprimir-informes.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res) => {
  const informe = String(req.body.informe || '');
  const impresora = req.body.impresora !== undefined ? String(req.body.impresora) : null;
  const almacen = String(req.body.almacen || req.session.almacen || '');
  const usuario = String(req.body.usuario || req.session.usuario || '');
  const idplanigrid = String(req.body.idplanigrid || '');

  await impresionController.imprimirInformes(informe, impresora, almacen, usuario, idplanigrid);

  // El original no generaba ninguna salida en esta acción (sin
  // header/json_encode); se añade una respuesta mínima para que el
  // response.json() del cliente no falle silenciosamente contra un cuerpo
  // vacío.
  res.json({ status: 'ok' });
});

module.exports = router;
