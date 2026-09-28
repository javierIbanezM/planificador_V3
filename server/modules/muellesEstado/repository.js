'use strict';

const Repository = require('../../data/repository');

/**
 * Estado en vivo de los muelles de un almacén, usado por el header de
 * cargas/descargas. Réplica de
 * src/Modules/Shared/MuellesEstadoRepository.php.
 */
class MuellesEstadoRepository extends Repository {
  async estadoPorAlmacen(almacen) {
    const sqlText = `WITH CTE_MuellesAsignados AS (
            SELECT
                muelleasign,
                COUNT(*) AS muelles_ocupados,
                CASE
                    WHEN DATEADD(SECOND, DATEDIFF(SECOND, mas.fecharegistro, GETDATE()), 0) >= DATEADD(MINUTE, 90, 0) THEN '4'
                    WHEN DATEADD(SECOND, DATEDIFF(SECOND, mas.fecharegistro, GETDATE()), 0) >= DATEADD(HOUR, 1, 0) THEN '3'
                    WHEN DATEADD(SECOND, DATEDIFF(SECOND, mas.fecharegistro, GETDATE()), 0) >= DATEADD(MINUTE, 30, 0) THEN '2'
                    ELSE '1'
                END AS coloresvisorcd,
                pg.fechainforme,
                pg.fechafinCD
            FROM muellesasignados AS mas
            INNER JOIN planigrid AS pg ON mas.idplanigrid = pg.id
            WHERE pg.fechallegada IS NOT NULL
                AND pg.fechasalida IS NULL
                AND pg.almacen = ?
                AND pg.eliminado IS NULL
            GROUP BY muelleasign, mas.fecharegistro, pg.fechainforme, pg.fechafinCD
        ),
        CTE_CDSinMuelle AS (
            SELECT COUNT(pg2.id) AS cdsinmuelle
            FROM planigrid AS pg2
            LEFT JOIN muellesasignados AS mas ON mas.idplanigrid = pg2.id
            WHERE pg2.fechallegada IS NOT NULL
                AND pg2.fechasalida IS NULL
                AND mas.muelleasign IS NULL
                AND pg2.eliminado IS NULL
                AND pg2.almacen = ?
        )
        SELECT
            m.muelle,
            COALESCE(mas.muelles_ocupados, NULL) AS muelles_ocupados,
            m.habilitado,
            COALESCE(MAX(mas.coloresvisorcd), '0') AS coloresvisorcd,
            MAX(mas.fechainforme) AS empezado,
            MAX(mas.fechafincd) AS finalizado,
            cds.cdsinmuelle
        FROM muelles AS m
        LEFT JOIN CTE_MuellesAsignados AS mas ON m.muelle = mas.muelleasign
        CROSS JOIN CTE_CDSinMuelle AS cds
        WHERE m.almacen = ?
        GROUP BY m.muelle, mas.muelles_ocupados, m.habilitado, cds.cdsinmuelle
        ORDER BY m.muelle ASC`;

    return this.fetchAll(sqlText, [almacen, almacen, almacen]);
  }
}

module.exports = MuellesEstadoRepository;
