'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const controller = require('./controller');

const router = express.Router();

function carpetaFechaHoy() {
  const ahora = new Date();
  return {
    anio: String(ahora.getFullYear()),
    mes: String(ahora.getMonth() + 1).padStart(2, '0'),
    dia: String(ahora.getDate()).padStart(2, '0'),
  };
}

/**
 * Réplica de ConsignacionController::subirImagenes / ConsignacionRepository
 * (originalmente funcion=up_img_ofi, migrado de Resources/PHP/comunes.php,
 * usado solo desde la galería de este modal). Genera el mismo patrón de
 * nombre "IMG_{idplanigrid}_{n}.ext" con resolución de colisión comprobando
 * existencia en disco, dentro de una carpeta por fecha YYYY/MM/DD/ bajo
 * appConfig.uploadsCdmuellesPath(). La ruta que se guarda en BD (ver
 * controller.subirImagenes) es appConfig.uploadsCdmuellesAlias() + la
 * relativa YYYY/MM/DD/ (la ruta pública servida por el alias estático
 * montado en server/app.js), no la física.
 */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const { anio, mes, dia } = carpetaFechaHoy();
      const carpetaFisica = path.join(appConfig.uploadsCdmuellesPath(), anio, mes, dia) + path.sep;
      fs.mkdirSync(carpetaFisica, { recursive: true });

      req._subidaImagenes = req._subidaImagenes || { anio, mes, dia, carpetaFisica };
      cb(null, carpetaFisica);
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    try {
      const idplanigrid = String((req.session && req.session.idplanigrid) || '');
      const extension = path.extname(file.originalname).replace(/^\./, '');
      const carpetaFisica = req._subidaImagenes.carpetaFisica;

      req._imgUploadIndice = (req._imgUploadIndice || 0) + 1;
      let sufijo = req._imgUploadIndice;
      let fichero = `IMG_${idplanigrid}_${sufijo}.${extension}`;

      while (fs.existsSync(path.join(carpetaFisica, fichero))) {
        sufijo += 1;
        fichero = `IMG_${idplanigrid}_${sufijo}.${extension}`;
      }

      file._nombreGenerado = fichero;
      file._extension = extension;
      cb(null, fichero);
    } catch (err) {
      cb(err);
    }
  },
});

const upload = multer({ storage });

// POST /api/consignacion.php — réplica de public/api/consignacion.php: mismo
// dispatcher `funcion=<accion>` que usaba el PHP ($_POST['funcion']). El
// cliente (comunes.js + JS inline del modal) siempre envía la petición como
// multipart/form-data (new FormData()), incluso para acciones sin ficheros,
// así que se aplica multer.array('image[]') a TODA la ruta: para el resto de
// acciones simplemente no llegan ficheros y req.files queda vacío.
router.post(
  '/api/consignacion.php',
  auth.requireLoginApi(),
  (req, res, next) => {
    upload.array('image[]')(req, res, (err) => {
      if (err) {
        console.error('Error al procesar la subida en /api/consignacion.php:', err.message);
        res.status(400).json({ status: 'error', mensaje: 'Error al procesar el fichero subido' });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const funcion = String(req.body.funcion || '');
    const usuario = String(req.session.usuario || '');
    const almacen = String(req.session.almacen || '');

    // Igual que en el original: 'dblclick_cab' fija el idplanigrid "activo"
    // en sesión; las demás acciones (salvo eliminarFoto/cambiotemprango, que
    // ya reciben su propio id) operan sobre ese mismo idplanigrid.
    // OJO: la clave de sesión NO puede llamarse "id" — express-session
    // reserva `session.id` como el identificador interno de la propia
    // sesión (getter de solo lectura); asignarle un valor lanza
    // "Cannot assign to read only property 'id'" y tumba el proceso entero
    // (el PHP original usaba `$_SESSION['id']`, una clave de array sin
    // ningún significado especial ahí, así que este choque es propio de la
    // migración a Node).
    if (funcion === 'dblclick_cab') {
      req.session.idplanigrid = String(req.body.id || '');
    }

    const idplanigrid = String(req.session.idplanigrid || '');

    try {
      switch (funcion) {
        case 'alertamail':
          res.json(await controller.alertamail(usuario, idplanigrid));
          return;

        case 'dblclick_cab':
          res.json(await controller.cabecera(idplanigrid));
          return;

        case 'dblclick_datos':
          // No usar idplanigrid de sesión aquí: dblclick_cab y dblclick_datos
          // se disparan en paralelo desde el cliente (ver comunes.js), y si
          // esta petición llega antes de que dblclick_cab termine de
          // actualizar req.session.idplanigrid, se devolvían los datos del
          // registro anterior aunque el propio formulario ya llevara el id
          // correcto. Se usa ese id explícito en vez del de sesión.
          res.json(await controller.datos(String(req.body.id || idplanigrid)));
          return;

        case 'datosquizcalidad':
          res.json(await controller.datosQuizCalidad(idplanigrid));
          return;

        case 'selecttemprango':
          res.json(await controller.selectTempRango(idplanigrid));
          return;

        case 'logsdblclickconsignacion':
          res.json(await controller.logs(idplanigrid));
          return;

        case 'eliminarFoto':
          res.json(await controller.eliminarFoto(String(req.body.idfoto || ''), usuario, idplanigrid));
          return;

        case 'Desactalertamail':
          res.json(await controller.desactivarAlertaMail(usuario, idplanigrid));
          return;

        case 'Actalertamail':
          res.json(await controller.activarAlertaMail(usuario, idplanigrid));
          return;

        case 'desagruparcd':
          res.json(await controller.desagruparCd(idplanigrid, usuario));
          return;

        case 'EliminarCD':
          res.json(controller.eliminarCd());
          return;

        case 'EliminarDatosCD':
          res.json(controller.eliminarDatosCd());
          return;

        case 'cambiosonda':
          res.json(await controller.cambiarSonda(idplanigrid, String(req.body.estado || ''), usuario));
          return;

        case 'cambiodatalogger':
          res.json(await controller.cambiarDatalogger(idplanigrid, String(req.body.estado || ''), usuario));
          return;

        case 'eliminamuelleasignado':
          res.json(await controller.eliminarMuelleAsignado(idplanigrid, usuario));
          return;

        case 'cambiotemprango': {
          const idParam = String(req.body.id || idplanigrid);
          const temprangoRaw = req.body.temprango;
          const temprango = temprangoRaw !== undefined && temprangoRaw !== '' ? String(temprangoRaw) : null;
          res.json(await controller.cambiarTempRango(temprango, idParam, usuario, String(req.body.text || '')));
          return;
        }

        case 'desasignarsalida':
          res.json(await controller.desasignarSalida(idplanigrid, usuario));
          return;

        case 'asigsalida':
          res.json(await controller.asignarSalida(idplanigrid, usuario));
          return;

        case 'desasignarllegada':
          res.json(await controller.desasignarLlegada(idplanigrid, usuario));
          return;

        case 'asigllegada':
          res.json(await controller.asignarLlegada(idplanigrid, usuario));
          return;

        case 'guardarcabeceramodal':
          res.json(
            await controller.guardarCabecera(
              {
                precinto: String(req.body.precinto || ''),
                observacion: String(req.body.observacion || ''),
                hLlegada: String(req.body.hLlegada || ''),
                hSalida: String(req.body.hSalida || ''),
                muelle: String(req.body.muelle || ''),
                muelleReservado: String(req.body.muelleReservado || ''),
              },
              idplanigrid,
              usuario,
              almacen
            )
          );
          return;

        case 'informecargadescarga':
          res.json(await controller.informeCargaDescarga(idplanigrid));
          return;

        case 'galeriaconsignacion':
          res.json(await controller.galeria(idplanigrid));
          return;

        case 'up_img_ofi': {
          const descripcion = String(req.body.descripcion || '');
          const { anio, mes, dia } = req._subidaImagenes || carpetaFechaHoy();
          const rutaPublicaRelativa = `${anio}/${mes}/${dia}/`;
          const rutaLectura = appConfig.uploadsCdmuellesAlias() + rutaPublicaRelativa;
          const rutaFisica = req._subidaImagenes
            ? req._subidaImagenes.carpetaFisica
            : path.join(appConfig.uploadsCdmuellesPath(), rutaPublicaRelativa) + path.sep;

          const archivos = (req.files || []).map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            ruta: rutaLectura,
            rutaFisica,
            extension: file._extension || path.extname(file.originalname).replace(/^\./, ''),
          }));

          res.json(await controller.subirImagenes(archivos, idplanigrid, usuario, descripcion));
          return;
        }

        default:
          res.status(404).json({ status: 'error', mensaje: 'Función no reconocida' });
      }
    } catch (err) {
      console.error(`Error en /api/consignacion.php (funcion=${funcion}):`, err);
      res.status(500).json({ status: 'error', mensaje: 'Error interno del servidor' });
    }
  }
);

module.exports = router;
