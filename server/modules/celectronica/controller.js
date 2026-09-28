'use strict';

const fs = require('fs');
const path = require('path');
const database = require('../../config/database');
const appConfig = require('../../config/appConfig');
const FirmaRepository = require('./repository');

/**
 * Controlador del módulo Celectronica (tablet de firma ADR). Réplica de
 * src/Modules/Celectronica/FirmaController.php.
 */
class FirmaController {
  async repository() {
    return new FirmaRepository(await database.connection());
  }

  /** @returns {Promise<Array<{muelle: unknown, color: unknown}>>} */
  async mostrarMuellesAdr(almacen) {
    const repository = await this.repository();
    const filas = await repository.muellesPendientesFirma(almacen);
    return filas.map((fila) => ({ muelle: fila.muelle, color: fila.coloresvisorcd }));
  }

  /** @returns {Promise<Array<{id: unknown, consignacion: unknown, peligrosidad: unknown}>>} */
  async mostrarOrdenes(almacen, muelle) {
    const repository = await this.repository();
    return repository.ordenesPendientesFirma(almacen, muelle);
  }

  /**
   * Migrado de funcion=entrafirma: carga los datos del conductor/orden en
   * sesión para que firma.php (firma.ejs) los muestre en la página
   * siguiente.
   */
  async entrarFirma(req, id) {
    const repository = await this.repository();
    const datos = await repository.datosParaFirma(id);

    if (datos === null) {
      return { status: 'error', message: 'No se encontraron datos' };
    }

    req.session.conductorDni = datos.conductorDni;
    req.session.conductorNombre = datos.conductorNombre;
    req.session.conductorApellidos = datos.conductorApellidos;
    req.session.consignacion = datos.consignacion;
    req.session.idplanigrid = datos.id;

    return { status: 'success' };
  }

  /**
   * Migrado de funcion=guardarFirma: decodifica el PNG base64 del pad de
   * firma y lo guarda bajo appConfig.uploadsFirmasPath(), igual que el
   * original guardaba bajo $ruta_upload_firmas. Sin resolución de
   * colisiones: si se firma dos veces la misma orden, se sobreescribe el
   * fichero anterior (comportamiento original, no se cambia).
   */
  async guardarFirma(req, firmaBase64) {
    if (!req.session || !req.session.idplanigrid) {
      return { status: 'error', message: 'No hay una orden seleccionada para firmar' };
    }

    // Igual que el original: primero quita el prefijo data URI y, ojo, luego
    // sustituye los espacios por "+" (un base64 URL-encoded pierde el "+" al
    // pasar por form-urlencoded, y vuelve como espacio).
    let datos = firmaBase64.split('data:image/png;base64,').join('');
    datos = datos.replace(/ /g, '+');
    const firmaData = Buffer.from(datos, 'base64');

    const ahora = new Date();
    const anio = String(ahora.getFullYear());
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    const rutaEscritura = path.join(appConfig.uploadsFirmasPath(), anio, mes, dia) + path.sep;
    const rutaLectura = `${appConfig.uploadsFirmasAlias()}${anio}/${mes}/${dia}/`;

    fs.mkdirSync(rutaEscritura, { recursive: true });

    const idplanigrid = String(req.session.idplanigrid);
    const fichero = `FirmaPeligrosidad_${idplanigrid}.png`;
    const rutaCompleta = path.join(rutaEscritura, fichero);

    try {
      fs.writeFileSync(rutaCompleta, firmaData);
    } catch (err) {
      return { status: 'error', message: 'No se pudo guardar la firma en el servidor' };
    }

    try {
      const repository = await this.repository();
      await repository.registrarFirma(idplanigrid, rutaLectura, fichero, rutaEscritura);
    } catch (err) {
      return { status: 'error', message: 'No se pudo guardar la firma en el servidor' };
    }

    return { status: 'success', ruta: rutaCompleta };
  }
}

module.exports = new FirmaController();
