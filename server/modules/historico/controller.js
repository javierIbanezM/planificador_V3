'use strict';

const database = require('../../config/database');
const HistoricoRepository = require('./repository');

/** Controlador del módulo Histórico. Réplica de src/Modules/Historico/HistoricoController.php. */
class HistoricoController {
  async repository() {
    return new HistoricoRepository(await database.connection());
  }

  async planigrid(almacen, todo = false) {
    const repository = await this.repository();
    const filas = await repository.planigrid(almacen, todo);

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
      rango: fila.rango ?? '',
      precinto: fila.precinto ?? '',
      hora_programada: fila.hora_programada ?? '',
      h_llegada: fila.h_llegada ?? '',
      H_Reg_Muelle: fila['H.Reg.Muelle'],
      T_M_Asig: fila['T.M. Asig'],
      h_salida: fila.h_salida,
      EstadoCarga: fila.EstadoCarga ?? '',
      colorestadocarga: fila.colorestadocarga,
    }));
  }
}

module.exports = new HistoricoController();
