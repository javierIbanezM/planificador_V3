'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo del selector de almacén del kiosco cdmuelles. Réplica de
 * src/Modules/Cdmuelles/AlmacenesRepository.php (migrado a su vez de
 * cdmuelles/functions.php, funcion=cargaralmacenes).
 */
class AlmacenesRepository extends Repository {
  /** @returns {Promise<string[]>} */
  async activos() {
    const filas = await this.fetchAll('SELECT almacen FROM almacenes WHERE status = 1');
    return filas.map((fila) => String(fila.almacen));
  }
}

module.exports = AlmacenesRepository;
