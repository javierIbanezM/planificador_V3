'use strict';

const Repository = require('../../data/repository');

/**
 * Firma electrónica ADR (tablet en el muelle). Réplica de
 * src/Modules/Celectronica/FirmaRepository.php: muellesPendientesFirma,
 * ordenesPendientesFirma, datosParaFirma y registrarFirma. Mismo SQL literal
 * que el original, con parámetros posicionales "?".
 */
class FirmaRepository extends Repository {
  /** @returns {Promise<Array<{muelle: unknown, coloresvisorcd: unknown}>>} */
  async muellesPendientesFirma(almacen) {
    const sqlText = `SELECT m.muelle,
        CASE
        WHEN max(coloresvisorcd) is null then '0'
        else MAX(coloresvisorcd) end as coloresvisorcd
        FROM muelles AS m
        LEFT JOIN (
            SELECT muelleasign, COUNT(*) AS muelles_ocupados,
            CASE
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) >= '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN '4'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) >= '02' THEN '4'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) = '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) <= '29' THEN '3'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) = '00' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN '2'
            ELSE '1'
            END as coloresvisorcd
            FROM muellesasignados AS mas
            INNER JOIN planigrid AS pg ON mas.idplanigrid = pg.id
            WHERE pg.fechallegada IS NOT NULL AND pg.fechasalida IS NULL AND pg.almacen = ? AND pg.eliminado IS NULL and pg.peligrosidad is not null
            GROUP BY muelleasign, mas.fecharegistro
        ) AS mas ON m.muelle = mas.muelleasign
        WHERE m.almacen = ? and mas.muelles_ocupados is not null
        GROUP BY m.muelle
        ORDER BY m.muelle ASC`;

    return this.fetchAll(sqlText, [almacen, almacen]);
  }

  /** @returns {Promise<Array<{id: unknown, consignacion: unknown, peligrosidad: unknown}>>} */
  async ordenesPendientesFirma(almacen, muelle) {
    const sqlText = `SELECT
        pg.consignacion,
        pg.peligrosidad,
        pg.id

        FROM muellesasignados AS mas
        INNER JOIN planigrid AS pg ON mas.idplanigrid = pg.id
        WHERE pg.fechallegada IS NOT NULL
        AND pg.fechasalida IS NULL
        AND pg.almacen = ?
        AND pg.eliminado IS NULL
        and pg.peligrosidad is not null
        AND mas.muelleasign = ?`;

    return this.fetchAll(sqlText, [almacen, muelle]);
  }

  async datosParaFirma(id) {
    const sqlText = `SELECT
        r.conductorDni,
        r.conductorNombre,
        r.conductorApellidos,
        pg.consignacion,
        pg.id
        FROM dbo.planigrid AS pg
        LEFT JOIN dbo.rutas AS r ON r.propietario = pg.propietario
        AND (r.consignacion = pg.consignacion
        OR r.consignacion IN (SELECT ID FROM dbo.SplitString(pg.agrupacion_referencias, ',')))
        WHERE pg.id = ?`;

    return this.fetchOne(sqlText, [id]);
  }

  async registrarFirma(idplanigrid, rutaLectura, fichero, rutaEscritura) {
    const sqlText = `INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Firma de peligrosidad ADR', 'INSERT', 'idplanigrid', ?, SYSDATETIME())
         `;

    return this.execute(sqlText, [
      idplanigrid, rutaLectura, fichero, 'TabletCentralita', '.png', 'FIRMAIMG', 'FIRMAADR', rutaEscritura,
      'TabletCentralita', idplanigrid,
    ]);
  }
}

module.exports = FirmaRepository;
