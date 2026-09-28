'use strict';

const database = require('../../config/database');
const auth = require('../../config/auth');
const AuthRepository = require('./repository');

/**
 * Controlador del módulo Auth. Réplica de
 * src/Modules/Auth/AuthController.php.
 */
class AuthController {
  async repository() {
    return new AuthRepository(await database.connection());
  }

  async loginDesktop(req, pin, nombre, entorno) {
    const repository = await this.repository();
    const resultado = await repository.loginDesktop(pin, nombre, 'Login' + entorno);
    return this.resolver(req, resultado);
  }

  async loginPda(req, pin, entorno) {
    const repository = await this.repository();
    const resultado = await repository.loginPda(pin, 'Login' + entorno);
    return this.resolver(req, resultado);
  }

  async resolver(req, resultado) {
    if (!resultado) {
      return { status: 'failure', mensaje: 'Usuario no existe' };
    }

    if (resultado.Acceso !== 'SI') {
      return { status: 'failure', mensaje: 'No tiene acceso a este entorno' };
    }

    await auth.login(req, resultado.nombre, { rol: resultado.rol_usuario });

    return {
      status: 'success',
      usuario: resultado.nombre,
      rol: resultado.rol_usuario,
    };
  }
}

module.exports = new AuthController();
