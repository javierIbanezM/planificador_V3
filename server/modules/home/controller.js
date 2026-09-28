'use strict';

const database = require('../../config/database');
const HomeRepository = require('./repository');

/** Controlador del módulo Home. Réplica de src/Modules/Home/HomeController.php. */
class HomeController {
  async repository() {
    return new HomeRepository(await database.connection());
  }

  async almacenes() {
    const repository = await this.repository();
    return repository.almacenes();
  }

  /**
   * Corrige el hallazgo de seguridad del original: valida que el almacén
   * exista (y esté activo) antes de aceptar guardarlo en sesión.
   */
  async seleccionarAlmacen(almacen) {
    if (almacen === '') {
      return false;
    }
    const repository = await this.repository();
    return repository.existeAlmacenActivo(almacen);
  }
}

module.exports = new HomeController();
