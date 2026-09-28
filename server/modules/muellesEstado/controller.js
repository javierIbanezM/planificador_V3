'use strict';

const database = require('../../config/database');
const MuellesEstadoRepository = require('./repository');

/**
 * Controlador de estado en vivo de muelles. Réplica de
 * src/Modules/Shared/MuellesEstadoController.php.
 */
class MuellesEstadoController {
  async repository() {
    return new MuellesEstadoRepository(await database.connection());
  }

  async estado(almacen) {
    const repository = await this.repository();
    const filas = await repository.estadoPorAlmacen(almacen);

    let totalOcupados = 0;
    let totalEmpezados = 0;
    let totalFinalizados = 0;
    const resultado = [];

    filas.forEach((fila) => {
      if (fila.muelles_ocupados !== null) {
        totalOcupados++;
      }
      if (fila.empezado !== null) {
        totalEmpezados++;
      }
      if (fila.finalizado !== null) {
        totalFinalizados++;
      }

      resultado.push({
        muelle: fila.muelle,
        muelles_ocupados: fila.muelles_ocupados,
        habilitado: fila.habilitado,
        coloresvisorcd: fila.coloresvisorcd,
        empezado: fila.empezado !== null ? '*' : '',
        total_muelles_ocupados: totalOcupados,
        total_muelles_empezados: totalEmpezados,
        total_muelles_finalizados: totalFinalizados,
        cdsinmuelle: fila.cdsinmuelle,
      });
    });

    return resultado;
  }
}

module.exports = new MuellesEstadoController();
