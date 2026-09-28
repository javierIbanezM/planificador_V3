'use strict';

const fs = require('fs');
const path = require('path');

const database = require('../../config/database');
const appConfig = require('../../config/appConfig');
const auth = require('../../config/auth');
const AlmacenesRepository = require('./almacenesRepository');
const UploadsRepository = require('./uploadsRepository');

/**
 * Lista blanca de claves de sesión aceptables desde el cliente vía
 * variable-sesion.php. El original (AsigVariablesession en
 * cdmuelles/functions.php) aceptaba cualquier clave enviada por el cliente
 * ($_SESSION[$_POST['opcion']] = $_POST['valor']); aquí se restringe a
 * 'almacen' — ver comentario completo en SesionController.php.
 */
const CLAVES_SESION_PERMITIDAS = ['almacen'];

/**
 * Controlador combinado de Almacenes + Sesión + Uploads del kiosco
 * cdmuelles. Réplica de src/Modules/Cdmuelles/{AlmacenesController,
 * SesionController,UploadsController}.php.
 */
class CdmuellesAlmacenesController {
  async almacenesRepository() {
    return new AlmacenesRepository(await database.connection());
  }

  async uploadsRepository() {
    return new UploadsRepository(await database.connection());
  }

  // --- Almacenes (réplica de AlmacenesController::cargarAlmacenes) ---
  async cargarAlmacenes() {
    const repository = await this.almacenesRepository();
    return repository.activos();
  }

  // --- Sesión (réplica de SesionController::cerrarSesion) ---
  async cerrarSesion(req) {
    const almacen = req.session ? req.session.almacen ?? null : null;
    await auth.logout(req);
    return { almacen };
  }

  // --- Sesión (réplica de SesionController::asignarVariableSesion) ---
  asignarVariableSesion(req, opcion, valor) {
    if (!CLAVES_SESION_PERMITIDAS.includes(opcion)) {
      return { status: 'ignorado' };
    }
    req.session[opcion] = valor;
    return { status: 'success' };
  }

  /**
   * Réplica de UploadsController::subirImagenes (funcion=up_img). A
   * diferencia del original en PHP no se procesan los ficheros en
   * multer.diskStorage (el campo "image[]" viaja ANTES que "id" en el
   * FormData del cliente — ver cdmuelles-fotos.js/cdmuelles-calidad.js — así
   * que "id" no estaría disponible todavía al invocarse el callback de
   * nombre de fichero de multer): se usa multer.memoryStorage() en
   * routes.js y aquí, con req.body ya completo, se escribe cada fichero a
   * disco replicando el mismo bucle de resolución de colisión de nombre que
   * el PHP original.
   */
  async subirImagenes(id, usuario, descripcion, files) {
    const fecha = new Date();
    const anio = String(fecha.getFullYear());
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    const rutaEscritura = path.join(appConfig.uploadsCdmuellesPath(), anio, mes, dia) + path.sep;
    const rutaLectura = `${appConfig.uploadsCdmuellesAlias()}${anio}/${mes}/${dia}/`;

    fs.mkdirSync(rutaEscritura, { recursive: true });

    const repository = await this.uploadsRepository();
    const response = [];

    for (let i = 0; i < files.length; i++) {
      const nombreArchivo = files[i].originalname;
      const extension = path.extname(nombreArchivo).replace(/^\./, '');

      let fichero = `IMG_${id}_${i + 1}.${extension}`;
      let rutaCompleta = path.join(rutaEscritura, fichero);

      while (fs.existsSync(rutaCompleta)) {
        const coincidencia = fichero.match(/(\d+)\.(\w+)$/);
        const sufijoActual = parseInt(coincidencia[1], 10) + 1;
        fichero = `IMG_${id}_${sufijoActual}.${extension}`;
        rutaCompleta = path.join(rutaEscritura, fichero);
      }

      try {
        fs.writeFileSync(rutaCompleta, files[i].buffer);
      } catch (err) {
        response.push({ status: 'error', message: `No se pudo guardar el archivo: ${nombreArchivo}` });
        continue;
      }

      await repository.registrarImagen(id, rutaLectura, fichero, usuario, extension, descripcion, rutaEscritura);
      await repository.avanzarEstadoTrasFoto(id, descripcion);

      response.push({ status: 'success', message: `Archivo guardado con éxito: ${nombreArchivo}` });
    }

    return response;
  }

  // --- Réplica de UploadsController::mostrarImagenesOrden ---
  async mostrarImagenesOrden(id) {
    const repository = await this.uploadsRepository();
    const filas = await repository.imagenesDeOrden(id);
    const status = filas.length > 0 ? 'SIFOTO' : 'NOFOTO';

    return filas.map((fila) => ({
      id: fila.id,
      status,
      rutafichero: fila.rutafichero,
      descripcion: fila.descripcion,
    }));
  }

  // --- Réplica de UploadsController::eliminarFoto ---
  async eliminarFoto(idfoto, usuario, idplanigrid) {
    const repository = await this.uploadsRepository();
    const rutafichero = await repository.eliminarFoto(idfoto, usuario, idplanigrid);

    if (rutafichero) {
      try {
        fs.unlinkSync(rutafichero);
        return { status: 'success', message: 'Archivo eliminado correctamente.' };
      } catch (err) {
        // Igual que @unlink en PHP: fallo silencioso, se cae al "failure" de abajo.
      }
    }

    return { status: 'failure', message: 'No se pudo eliminar el archivo.' };
  }
}

module.exports = new CdmuellesAlmacenesController();
