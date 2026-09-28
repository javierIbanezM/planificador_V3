'use strict';

const database = require('../../config/database');
const VisorAlmacenRepository = require('./repository');

/**
 * Controlador del módulo VisorAlmacen (dashboard de planta). Réplica de
 * src/Modules/VisorAlmacen/VisorAlmacenController.php.
 */
class VisorAlmacenController {
  async repository() {
    return new VisorAlmacenRepository(await database.connection());
  }

  async consigEnLaNave(almacen) {
    const repository = await this.repository();
    const filas = await repository.consigEnLaNave(almacen);

    return filas.map((fila) => ({
      id: fila.id,
      coloresvisorcd: fila.coloresvisorcd,
      Tcarga: fila.Tcarga,
      Muelle: fila.Muelle ?? '',
      Playa: fila.playa ?? '',
      propietario: fila.propietario,
      consignacion: fila.consignacion,
      Observaciones: fila.Observaciones ?? '',
      transportista: fila.transportista,
      temperatura: fila.temperatura ?? 'N/A',
      precinto: fila.precinto !== undefined && fila.precinto !== null ? 'SI' : 'N/A',
      peligrosidad: fila.peligrosidad ?? '',
      fechaprevista: fila.fechaprevista,
      fechallegada: fila.fechallegada,
      'Asign. m': fila['Asign. m'] ?? '',
      'T. M. Asig': fila['T. M. Asig'],
      estado: fila.estado,
      estadocd: fila.estadocd ?? '',
    }));
  }

  async consigNoPreparadas(almacen) {
    const repository = await this.repository();
    const filas = await repository.consigNoPreparadas(almacen);

    return this.mapConsignacionesSimples(filas);
  }

  async consigPreparadas(almacen) {
    const repository = await this.repository();
    const filas = await repository.consigPreparadas(almacen);

    return this.mapConsignacionesSimples(filas);
  }

  mapConsignacionesSimples(filas) {
    return filas.map((fila) => ({
      id: fila.id,
      colores: fila.colores,
      propietario: fila.propietario,
      consignacion: fila.consignacion,
      estado: fila.estado,
      fecha_prevista: fila.fecha_prevista,
      hora_programada: fila.hora_programada,
    }));
  }

  async preavisosSinRecepcionar(almacen) {
    const repository = await this.repository();
    const filas = await repository.preavisosSinRecepcionar(almacen);

    return filas.map((fila) => ({
      propietario: fila.propietario,
      albaran: fila.albaran,
      ubicacion: fila.ubicacion,
      fechafinalizado: fila.fechafinalizado,
      tiemposinrecepcionar: fila.tiemposinrecepcionar,
      minutossinrecepcionar: fila.minutossinrecepcionar,
      id: fila.id,
      colores: fila.colores,
      estado: fila.estado,
      bultosdescargados: fila.bultosdescargados ?? '',
    }));
  }

  async preavisosPorLlegar(almacen) {
    const repository = await this.repository();
    const filas = await repository.preavisosPorLlegar(almacen);

    return filas.map((fila) => ({
      propietario: fila.propietario,
      albaran: fila.albaran,
      transportista: fila.transportista,
      progr: fila.Progr,
      id: fila.id,
      colores: fila.colores,
    }));
  }
}

module.exports = new VisorAlmacenController();
