'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo (capa de datos) del módulo Auth. Comprobación de acceso por PIN.
 * Réplica literal de src/Modules/Auth/AuthRepository.php: PIN en texto
 * plano comparado contra usuarios.pin, sin hash y sin límite de intentos —
 * comportamiento mantenido tal cual a petición expresa, no modificar.
 */
class AuthRepository extends Repository {
  async loginDesktop(pin, nombre, permiso) {
    const sqlText = `SELECT
                b.nombre,
                b.rango_usuario,
                b.rol_usuario,
                rp.rango as rango_minimo,
                CASE WHEN rango_usuario >= rp.rango THEN 'SI' ELSE 'NO' END AS Acceso
            FROM (
                SELECT u.nombre, MAX(r.rango) as rango_usuario, r.rol as rol_usuario
                FROM usuarios as u
                INNER JOIN roles as r ON r.rol = u.rol
                WHERE u.pin = ? and u.nombre = ?
                GROUP BY u.nombre, r.rol
            ) as b
            LEFT JOIN roles_permisos as rp ON rp.permiso = ?
            ORDER BY rango_usuario DESC`;

    return this.fetchAcceso(sqlText, [pin, nombre, permiso]);
  }

  async loginPda(pin, permiso) {
    const sqlText = `SELECT
                b.nombre,
                b.rango_usuario,
                b.rol_usuario,
                rp.rango as rango_minimo,
                CASE WHEN rango_usuario >= rp.rango THEN 'SI' ELSE 'NO' END AS Acceso
            FROM (
                SELECT u.nombre, MAX(r.rango) as rango_usuario, r.rol as rol_usuario
                FROM usuarios as u
                INNER JOIN roles as r ON r.rol = u.rol
                WHERE u.pin = ?
                GROUP BY u.nombre, r.rol
            ) as b
            LEFT JOIN roles_permisos as rp ON rp.permiso = ?
            ORDER BY rango_usuario DESC`;

    return this.fetchAcceso(sqlText, [pin, permiso]);
  }

  async fetchAcceso(sqlText, params) {
    const fila = await this.fetchOne(sqlText, params);
    return !fila || fila.nombre === null ? null : fila;
  }
}

module.exports = AuthRepository;
