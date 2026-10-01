'use strict';

const database = require('../../config/database');
const PlanificadorRepository = require('./repository');

/** Controlador del módulo Planificador. Réplica de src/Modules/Planificador/PlanificadorController.php. */
class PlanificadorController {
  async repository() {
    return new PlanificadorRepository(await database.connection());
  }

  async planigrid(almacen) {
    const repository = await this.repository();
    const filas = await repository.planigrid(almacen);

    return filas.map((fila) => ({
      'in-out': fila['in-out'],
      id: fila.id,
      Tipo_de_carga: fila.Tipo_de_carga,
      propietario: fila.propietario,
      consignacion: fila.consignacion,
      fecha_prevista: fila.fecha_prevista,
      muelle: fila.muelle ?? '',
      Mreservado: fila.Mreservado ?? '',
      Observaciones: fila.Observaciones ?? '',
      Transportista: fila.Transportista,
      OrdenCompra: fila.OrdenCompra ?? '',
      hora_programada: fila.hora_programada ?? '',
      h_llegada: fila.h_llegada ?? '',
      bultos: fila.bultos ?? '',
      estado: fila.estado,
      EstadoCarga: fila.EstadoCarga ?? '',
      rango: fila.rango ?? 'N/A',
      precinto: fila.precinto ?? 'N/A',
      peligrosidad: fila.peligrosidad ?? '',
      colorestadocarga: fila.colorestadocarga,
    }));
  }

  async posiblesReruteos(almacen) {
    const repository = await this.repository();
    const filas = await repository.posiblesReruteos(almacen);

    return filas.map((fila) => ({
      idplanigridNuevo: fila.idplanigridNuevo,
      consignacionNueva: fila.consignacionNueva,
      idplanigridAntiguo: fila.idplanigridAntiguo,
      consignacionAntigua: fila.consignacionAntigua,
      finalizadoEl: repository.formatearFecha(fila.finalizadoEl, 'd/m/Y H:i'),
      muelleAntiguo: fila.muelleAntiguo,
      propietario: fila.propietario,
      transportista: fila.transportista,
    }));
  }

  async fusionarReruteo(idAntiguo, idNuevo, usuario) {
    const repository = await this.repository();

    try {
      await repository.fusionarReruteo(idAntiguo, idNuevo, usuario);
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: 'Fusión completada',
        Message: `Se movió el trabajo (fotos, bultos, quiz) de la C/D ${idAntiguo} a la C/D ${idNuevo}.`,
      };
    } catch (err) {
      return { status: 'error', Notificacion: 'error', Asunto: 'Error', Message: err.message };
    }
  }

  async agruparcd(selectedRows, usuario) {
    const repository = await this.repository();
    const exito = await repository.agruparcd(selectedRows, usuario);

    if (exito) {
      return { status: 'success', Notificacion: 'correcto', Asunto: 'Operación exitosa', Message: 'Se agrupó correctamente la selección.' };
    }

    return { status: 'error', Notificacion: 'error', Asunto: 'Error', Message: 'Ha habido algún error, contactar con el desarrollador.' };
  }
}

module.exports = new PlanificadorController();
