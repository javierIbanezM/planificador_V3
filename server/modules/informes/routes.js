'use strict';

const express = require('express');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

const requireLogin = auth.requireLogin('Planificador', `${appConfig.baseUrl()}login.php`);

/** Envía el PDF (Buffer) con el Content-Disposition que pida ?salida (I=inline, D=descarga; igual que TCPDF Output()). */
function enviarPdf(res, buffer, nombreFichero, salida) {
  const disposicion = salida === 'D' ? 'attachment' : 'inline';
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `${disposicion}; filename="${nombreFichero}"`);
  // El visor de PDF del navegador cachea agresivamente por URL; al ser una
  // URL estática (sin query string por idplanigrid) reutiliza el PDF viejo
  // aunque el servidor ya genere uno corregido. Se fuerza a no cachear.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.send(buffer);
}

// GET /informes/hoja-carga-1.php — réplica de public/informes/hoja-carga-1.php.
router.get('/informes/hoja-carga-1.php', requireLogin, async (req, res, next) => {
  try {
    const idPlanigrid = Number(req.session.idplanigrid || 0);
    const buffer = await controller.pdfHojaCarga1(idPlanigrid);
    enviarPdf(res, buffer, 'HOJA DE CARGA.pdf', 'I');
  } catch (err) {
    next(err);
  }
});

// GET /informes/hoja-carga-2.php — réplica de public/informes/hoja-carga-2.php.
router.get('/informes/hoja-carga-2.php', requireLogin, async (req, res, next) => {
  try {
    const idPlanigrid = Number(req.session.idplanigrid || 0);
    const buffer = await controller.pdfHojaCarga2(idPlanigrid);
    enviarPdf(res, buffer, 'HOJA DE CARGA.pdf', 'I');
  } catch (err) {
    next(err);
  }
});

// GET /informes/hoja-descarga-1.php — réplica de public/informes/hoja-descarga-1.php.
router.get('/informes/hoja-descarga-1.php', requireLogin, async (req, res, next) => {
  try {
    const idPlanigrid = Number(req.session.idplanigrid || 0);
    const buffer = await controller.pdfHojaDescarga1(idPlanigrid);
    enviarPdf(res, buffer, 'Hoja de Descarga.pdf', 'I');
  } catch (err) {
    next(err);
  }
});

// GET /informes/etiqueta-generica.php — réplica de public/informes/etiqueta-generica.php.
// Acepta uno o varios idplanigrid separados por coma vía ?idplanigrid=1,2,3
// (una página A6 por id); si no se indica, usa req.session.idplanigrid.
router.get('/informes/etiqueta-generica.php', requireLogin, async (req, res, next) => {
  try {
    const idsPlanigrid = req.query.idplanigrid
      ? String(req.query.idplanigrid)
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => Number.isFinite(v))
      : [Number(req.session.idplanigrid || 0)];

    const salida = typeof req.query.salida === 'string' ? req.query.salida : 'I';

    const { buffer, referencia } = await controller.pdfEtiquetaGenerica(idsPlanigrid);
    enviarPdf(res, buffer, `${referencia || 'etiqueta'}_Etiqueta_Generica_Info.pdf`, salida);
  } catch (err) {
    next(err);
  }
});

// GET /informes/etiqueta-rotin.php — réplica de public/informes/etiqueta-rotin.php.
router.get('/informes/etiqueta-rotin.php', requireLogin, async (req, res, next) => {
  try {
    const idPlanigrid = req.query.idplanigrid ? parseInt(req.query.idplanigrid, 10) : Number(req.session.idplanigrid || 0);
    const salida = typeof req.query.salida === 'string' ? req.query.salida : 'I';

    const { buffer, referencia } = await controller.pdfEtiquetaRotin(idPlanigrid);
    enviarPdf(res, buffer, `${referencia || 'etiqueta'}_EtiquetaRotIN.pdf`, salida);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
