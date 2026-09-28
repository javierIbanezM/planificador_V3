'use strict';

const Repository = require('../../data/repository');

/** Modelo del módulo Home (Visor Global). Réplica de src/Modules/Home/HomeRepository.php. */
class HomeRepository extends Repository {
  async almacenes() {
    const sqlText = `SELECT a.[almacen],
               concat(a.[direccion], ', ', a.cp, ', ', a.poblacion, ', ', a.pais) as direccion,
               CONCAT(
                 (SELECT COUNT(DISTINCT mas.muelleasign)
                  FROM muellesasignados as mas
                  INNER JOIN planigrid as pg
                    ON pg.id = mas.idplanigrid
                   AND pg.fechallegada is not null
                   AND fechasalida is null
                  WHERE pg.almacen = a.almacen
                    AND pg.eliminado is null),
                '/', COUNT(m.muelle)) as estadomuelles,
               (SELECT CASE WHEN COUNT(pg.id) = 0 THEN '' ELSE COUNT(pg.id) END as CDSinMuelles
                FROM planigrid as pg
                LEFT JOIN muellesasignados as mas
                  ON mas.idplanigrid = pg.id
                WHERE pg.fechallegada is not null
                  AND pg.fechasalida is null
                  AND muelleasign is null
                  AND pg.almacen = a.almacen
                  AND pg.eliminado is null) as CDSinMuelles
        FROM [Planificador].[dbo].[almacenes] as a
        LEFT JOIN muelles as m
          ON m.almacen = a.almacen
        WHERE a.status = 1
        GROUP BY a.almacen, a.direccion, a.cp, a.poblacion, a.pais`;

    return this.fetchAll(sqlText);
  }

  async existeAlmacenActivo(almacen) {
    const fila = await this.fetchOne(
      'SELECT TOP 1 almacen FROM almacenes WHERE almacen = ? AND status = 1',
      [almacen]
    );
    return fila !== null;
  }
}

module.exports = HomeRepository;
