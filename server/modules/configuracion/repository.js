'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo del módulo Configuración. Réplica de
 * src/Modules/Configuracion/ConfiguracionRepository.php (a su vez migrado de
 * Resources/PHP/Configuración.php). El SQL original ya usaba sentencias
 * preparadas en todos los casos.
 */
class ConfiguracionRepository extends Repository {
  async crearAlmacen(almacen, descripcion, direccion, cp, poblacion, pais, direccionCarga, usuario) {
    const sqlText = `INSERT INTO almacenes (almacen, descripcion, direccion, cp, poblacion, pais, direccioncarga, status)
        VALUES( ?, ?, ?, ?, ?, ?, ?, 0);
        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se crea el almacén:'+?+
                                      ', Descripción: '+?+
                                      ', Dirección: '+?+
                                      ', CP: '+?+
                                      ', Población: '+?+
                                      ', País: '+?+
                                      ', Dirección Carga: '+?
                                      ,'INSERT', 'ConfigALM', NULL);`;

    await this.execute(sqlText, [
      almacen, descripcion, direccion, cp, poblacion, pais, direccionCarga,
      usuario, almacen, descripcion, direccion, cp, poblacion, pais, direccionCarga,
    ]);

    return true;
  }

  async eliminarAlmacen(almacen, usuario) {
    const sqlText = `DELETE FROM almacenes WHERE almacen = ?;
        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se eliminó almacén:'+?,'INSERT', 'ConfigALM', NULL);`;

    const filasAfectadas = await this.execute(sqlText, [almacen, usuario, almacen]);
    return Boolean(filasAfectadas);
  }

  async maestroAlmacenes() {
    const sqlText = `SELECT DISTINCT a.almacen, a.descripcion, a.direccion, a.cp, a.poblacion, a.pais, a.direccioncarga, a.status,
    CASE WHEN p.almacen IS NULL THEN 'Eliminable' ELSE 'No eliminable' END AS eliminable
    FROM almacenes a
    LEFT JOIN planigrid p ON a.almacen = p.almacen
    ORDER BY a.almacen`;

    return this.fetchAll(sqlText);
  }

  async logsMaestro(maestro) {
    const sqlText = `SELECT
        fecha,
        descripcion,
        usuario,
        instruccion
        FROM logs
        WHERE tiporeferencia like ?
        ORDER BY fecha DESC`;

    return this.fetchAll(sqlText, [maestro]);
  }

  async maestroVariablesDelSistema() {
    const sqlText = `SELECT
      [Nombre],
      [Descripción],
      [Activo],
      [Valor],
      [Tipo]
        FROM Configuración`;

    return this.fetchAll(sqlText);
  }

  async maestroAutomatizaciones() {
    return this.fetchAll('Select nombre, descripcion, activo, valor, tipo FROM funcionesautomaticas');
  }
}

module.exports = ConfiguracionRepository;
