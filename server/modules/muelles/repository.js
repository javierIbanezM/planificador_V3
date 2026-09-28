'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo del módulo Muelles (modal de info de muelle, doble-click sobre un
 * muelle en el header). Réplica de src/Modules/Muelles/MuellesRepository.php.
 */
class MuellesRepository extends Repository {
  async infoMuelle(muelle, almacen) {
    const sqlText = `SELECT TOP (100)
        pg.id,
      pg.[in-out] as inout,
        pg.propietario,
        pg.consignacion,
        pg.fechallegada,
        pg.fechasalida,
        mrs.muellesreserv
    FROM [Planificador].[dbo].[planigrid] AS pg
    INNER JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
    LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
    WHERE mas.muelleasign = ? and pg.almacen = ?
    ORDER BY fechallegada desc`;

    return this.fetchAll(sqlText, [muelle, almacen]);
  }

  async infoMuelleReserva(muelle, almacen) {
    const sqlText = `SELECT TOP (100)
        pg.id,
      pg.[in-out] as inout,
        pg.propietario,
        pg.consignacion,
        pg.transportista,
        pg.fechaprevista
    FROM [Planificador].[dbo].[planigrid] AS pg
    LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
    WHERE mrs.muellesreserv = ? and pg.almacen = ? and fechallegada is null and fechasalida is null and pg.eliminado is null
    ORDER BY fechaprevista`;

    return this.fetchAll(sqlText, [muelle, almacen]);
  }

  async logsMuelle(almacen, muelle) {
    const sqlText = `SELECT
        FORMAT(fecha, 'dd-MM-yy HH:mm') as fecha,
        descripcion,
        usuario,
        instruccion
      FROM [Planificador].[dbo].[logs]
      WHERE tiporeferencia = 'ConfigMuelle' and referencia = ?+?`;

    return this.fetchAll(sqlText, [almacen, muelle]);
  }

  async consultaMuelleActivo(muelle, almacen) {
    return this.fetchOne('SELECT muelle, habilitado FROM muelles WHERE muelle = ? and almacen = ?', [muelle, almacen]);
  }

  async activarMuelle(muelle, almacen, usuario) {
    const sqlText = `UPDATE muelles set habilitado = 1 where muelle = ? and almacen = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se habilita el Muelle: '+?+' desde la página principal'
                                      ,'UPDATE', 'ConfigMuelle', ?+?);`;

    const filasAfectadas = await this.execute(sqlText, [muelle, almacen, usuario, muelle, almacen, muelle]);
    return Boolean(filasAfectadas);
  }

  async desactivarMuelle(muelle, almacen, usuario) {
    const sqlText = `UPDATE muelles set habilitado = 0 where muelle = ? and almacen = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se deshabilita el Muelle: '+?+' desde la página principal'
                                      ,'UPDATE', 'ConfigMuelle', ?+?);`;

    const filasAfectadas = await this.execute(sqlText, [muelle, almacen, usuario, muelle, almacen, muelle]);
    return Boolean(filasAfectadas);
  }
}

module.exports = MuellesRepository;
