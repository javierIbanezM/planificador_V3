'use strict';

const database = require('../../config/database');
const Repository = require('../../data/repository');
const MuellesRepository = require('./repository');

// Instancia auxiliar (sin pool) solo para reutilizar Repository.formatearFecha.
const formateador = new Repository(null);

/** Controlador del módulo Muelles. Réplica de src/Modules/Muelles/MuellesController.php. */
class MuellesController {
  async repository() {
    return new MuellesRepository(await database.connection());
  }

  formatFecha(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }

    return formateador.formatearFecha(valor, 'd-m-y H:i') || '';
  }

  async infoMuelle(muelle, almacen) {
    const repository = await this.repository();
    const filas = await repository.infoMuelle(muelle, almacen);

    return filas.map((fila) => ({
      id: fila.id,
      inout: fila.inout,
      propietario: fila.propietario,
      consignacion: fila.consignacion,
      fechallegada: this.formatFecha(fila.fechallegada),
      fechasalida: this.formatFecha(fila.fechasalida),
      muellereserv: fila.muellesreserv ?? '',
    }));
  }

  async infoMuelleReserva(muelle, almacen) {
    const repository = await this.repository();
    const filas = await repository.infoMuelleReserva(muelle, almacen);

    return filas.map((fila) => ({
      id: fila.id,
      inout: fila.inout,
      propietario: fila.propietario,
      consignacion: fila.consignacion,
      transportista: fila.transportista,
      fechaprevista: this.formatFecha(fila.fechaprevista),
    }));
  }

  async logsMuelle(almacen, muelle) {
    const repository = await this.repository();
    return repository.logsMuelle(almacen, muelle);
  }

  async consultaMuelleActivo(muelle, almacen) {
    const repository = await this.repository();
    const fila = await repository.consultaMuelleActivo(muelle, almacen);

    if (fila === null) {
      return [];
    }

    return { muelle: fila.muelle, habilitado: fila.habilitado };
  }

  async activarMuelle(muelle, almacen, usuario) {
    const repository = await this.repository();
    if (await repository.activarMuelle(muelle, almacen, usuario)) {
      return { status: 'success', Notificacion: 'correcto', Asunto: 'Operación exitosa', Message: 'Se habilitó el muelle correctamente.' };
    }

    return { status: 'error', Notificacion: 'error', Asunto: 'Error en la Operación', Message: 'Ha habido un error en habilitar el muelle.' };
  }

  async desactivarMuelle(muelle, almacen, usuario) {
    const repository = await this.repository();
    if (await repository.desactivarMuelle(muelle, almacen, usuario)) {
      return { status: 'success', Notificacion: 'correcto', Asunto: 'Operación exitosa', Message: 'Se deshabilitó el muelle correctamente.' };
    }

    return { status: 'error', Notificacion: 'error', Asunto: 'Error en la Operación', Message: 'Ha habido un error en deshabilitar el muelle.' };
  }
}

module.exports = new MuellesController();
