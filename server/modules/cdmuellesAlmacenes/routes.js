'use strict';

const path = require('path');
const express = require('express');
const multer = require('multer');

const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

// memoryStorage: el campo "image[]" viaja ANTES que los campos de texto (id,
// usuario, descripcion) en el FormData del cliente (ver cdmuelles-fotos.js/
// cdmuelles-calidad.js), así que no se puede resolver el nombre final del
// fichero dentro del storage engine de multer (req.body todavía no estaría
// completo). Se guarda en memoria y se escribe a disco en el controlador,
// una vez que multer ya terminó de parsear todo el body — ver
// controller.js#subirImagenes.
const upload = multer({ storage: multer.memoryStorage() });

// Recursos estáticos del kiosco (lector de códigos de barras y PDF de
// ayuda), servidos por public/cdmuelles/resources/**, referenciados por el
// cliente con rutas relativas ("./resources/...", "./CheckCalidadAyuda.pdf")
// desde /cdmuelles/cargadescarga.php — ver cdmuelles-calidad.js/
// cdmuelles-fotos.js. No se sirve todo public/cdmuelles/ como estático para
// no exponer el código fuente PHP (index.php/cargadescarga.php) que convive
// físicamente en ese mismo directorio.
router.use('/cdmuelles/resources', express.static(path.join(__dirname, '..', '..', '..', 'public', 'cdmuelles', 'resources')));

router.get('/cdmuelles/CheckCalidadAyuda.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', '..', 'public', 'cdmuelles', 'CheckCalidadAyuda.pdf'));
});

// GET /cdmuelles/index.php — réplica de public/cdmuelles/index.php (selector de almacén).
router.get(
  '/cdmuelles/index.php',
  auth.requireLogin('cdmuelles', `${appConfig.baseUrl()}login.php`),
  (req, res) => {
    if (req.session.almacen) {
      res.redirect(`${appConfig.baseUrl()}cdmuelles/cargadescarga.php`);
      return;
    }

    res.render('pages/cdmuelles/index', {
      baseUrl: appConfig.baseUrl(),
    });
  }
);

// GET /cdmuelles/cargadescarga.php — réplica de public/cdmuelles/cargadescarga.php.
// Orden EXACTO del original: 1) si llega ?almacen=, se guarda en sesión
// ANTES de comprobar login; 2) requireLogin; 3) si sigue sin almacén en
// sesión, redirige a index.php.
router.get(
  '/cdmuelles/cargadescarga.php',
  (req, res, next) => {
    if (typeof req.query.almacen !== 'undefined') {
      req.session.almacen = String(req.query.almacen);
    }
    next();
  },
  auth.requireLogin('cdmuelles', `${appConfig.baseUrl()}login.php`),
  (req, res) => {
    if (!req.session.almacen) {
      res.redirect(`${appConfig.baseUrl()}cdmuelles/index.php`);
      return;
    }

    res.render('pages/cdmuelles/cargadescarga', {
      baseUrl: appConfig.baseUrl(),
      titulo: 'Carga Descarga',
      usuario: req.session.usuario,
      almacen: req.session.almacen,
    });
  }
);

// Los endpoints de abajo (salvo subir-imagen.php, que ya usa su propio
// upload.array) llegan como multipart/form-data (fetch + FormData) desde
// cdmuelles-ordenes.js/cdmuelles-fotos.js/seleccion-almacen.js aunque no
// lleven ficheros — hace falta multer para que req.body se rellene igual
// que hacía $_POST en PHP.
const uploadNone = upload.none();

// POST /api/cdmuelles/cargar-almacenes.php — réplica de public/api/cdmuelles/cargar-almacenes.php.
router.post('/api/cdmuelles/cargar-almacenes.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res, next) => {
  try {
    const almacenes = await controller.cargarAlmacenes();
    res.json({ status: 'success', almacenes });
  } catch (err) {
    next(err);
  }
});

// POST /api/cdmuelles/cerrar-sesion.php — réplica de public/api/cdmuelles/cerrar-sesion.php.
router.post('/api/cdmuelles/cerrar-sesion.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res, next) => {
  try {
    res.json(await controller.cerrarSesion(req));
  } catch (err) {
    next(err);
  }
});

// POST /api/cdmuelles/variable-sesion.php — réplica de public/api/cdmuelles/variable-sesion.php.
router.post('/api/cdmuelles/variable-sesion.php', auth.requireLoginApi('No autenticado'), uploadNone, (req, res) => {
  const opcion = String(req.body.opcion || '');
  const valor = String(req.body.valor || '');
  res.json(controller.asignarVariableSesion(req, opcion, valor));
});

// POST /api/cdmuelles/subir-imagen.php — réplica de public/api/cdmuelles/subir-imagen.php.
router.post(
  '/api/cdmuelles/subir-imagen.php',
  auth.requireLoginApi('No autenticado'),
  upload.array('image[]', 20),
  async (req, res, next) => {
    try {
      const id = String(req.body.id || '');
      const usuario = String(req.body.usuario || '');
      const descripcion = String(req.body.descripcion || '');
      const files = req.files || [];

      if (id === '' || files.length === 0) {
        res.json([]);
        return;
      }

      res.json(await controller.subirImagenes(id, usuario, descripcion, files));
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/cdmuelles/mostrar-imagenes-orden.php — réplica de public/api/cdmuelles/mostrar-imagenes-orden.php.
router.post('/api/cdmuelles/mostrar-imagenes-orden.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res, next) => {
  try {
    const id = String(req.body.id || '');
    res.json(await controller.mostrarImagenesOrden(id));
  } catch (err) {
    next(err);
  }
});

// POST /api/cdmuelles/eliminar-foto.php — réplica de public/api/cdmuelles/eliminar-foto.php.
router.post('/api/cdmuelles/eliminar-foto.php', auth.requireLoginApi('No autenticado'), uploadNone, async (req, res, next) => {
  try {
    const idfoto = String(req.body.idfoto || '');
    const usuario = String(req.body.usuario || '');
    const idplanigrid = String(req.body.idplanigrid || '');
    res.json(await controller.eliminarFoto(idfoto, usuario, idplanigrid));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
