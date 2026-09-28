'use strict';

const Repository = require('../../data/repository');

/**
 * Estado de carga/descarga del kiosco PDA (planigrid + muellesasignados).
 * Réplica literal de src/Modules/Cdmuelles/PlanigridCdRepository.php
 * (migrado a su vez de cdmuelles/functions.php: mostrarmuelles,
 * mostrartablaOrdenes, consultaestado, cambiaestado, atrasestadocdmuelles,
 * entrarorden1, mostraralbaranes, Observaciones y finalizarcarga). Las
 * consultas se mantienen literales, solo cambia la forma de ejecutarlas
 * (mssql en lugar de PDO).
 */
class PlanigridCdRepository extends Repository {
  /**
   * Descarga a granel (solo entrada/IN): tras la foto final se pregunta
   * si la descarga fue a granel y, si es así, cuántos palets aportó.
   */
  async guardarGranel(idplanigrid, granel, palets) {
    await this.execute('UPDATE planigrid SET granel = ?, paletsaportados = ? WHERE id = ?', [
      granel ? 1 : 0,
      palets,
      idplanigrid,
    ]);
  }

  async muellesOcupados(almacen) {
    const sqlText = `SELECT m.muelle,
        CASE
        WHEN max(coloresvisorcd) is null then '0'
        else MAX(coloresvisorcd) end as coloresvisorcd,
        MIN(fechainforme) as fechainforme
        FROM muelles AS m
        LEFT JOIN (
            SELECT muelleasign, COUNT(*) AS muelles_ocupados,
            CASE
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) >= '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN '4'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) >= '02' THEN '4'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) = '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) <= '29' THEN '3'
            WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),1,2) = '00' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, mas.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN '2'
            ELSE '1'
            END as coloresvisorcd,
            pg.fechainforme
            FROM muellesasignados AS mas
            INNER JOIN planigrid AS pg ON mas.idplanigrid = pg.id
            WHERE pg.fechallegada IS NOT NULL
            AND pg.fechasalida IS NULL
            AND pg.almacen = ?
            AND pg.eliminado IS NULL
            GROUP BY muelleasign, mas.fecharegistro, fechainforme
        ) AS mas ON m.muelle = mas.muelleasign
        WHERE m.almacen = ? and mas.muelles_ocupados is not null
        GROUP BY m.muelle
        ORDER BY m.muelle ASC`;

    return this.fetchAll(sqlText, [almacen, almacen]);
  }

  async tablaOrdenes(almacen, muelle) {
    const sqlText = `SELECT
         id,
         SUBSTRING(consignacion,1,17) as consignacion,
         EstadoCarga,
         OperariosInvolucrados,
         fechafincd,
         CASE
         WHEN fechafincd is null THEN 'blanco'
         WHEN [in-out] = 'IN' THEN 'amarillo'
         WHEN left(estadocarga, charindex('/', EstadoCarga, 1)-1) = right(estadocarga, charindex('/', estadocarga,1)-1) and fechafincd is not NULL THEN 'verde'
         ELSE 'rojo'
         END as color
         FROM(
                SELECT DISTINCT
                pg.id,
                CASE
                WHEN pg.agrupacion is not null THEN pg.consignacion
                WHEN PG.[in-out] = 'IN' THEN CONCAT('Preaviso:', pre.albaran)
                WHEN pg.[in-out] = 'OUT' THEN pg.consignacion
                ELSE 'Desconocido'
                END as consignacion,
                CASE
                WHEN pg.[in-out] = 'OUT' THEN
            CONVERT(NVARCHAR, (SELECT COUNT(finalizado) FROM EstadoCargaDescarga WHERE idplanigrid = pg.id)) + '/' +
            CONVERT(NVARCHAR, (SELECT COUNT(pedido) FROM expediciones WHERE idplanigrid = pg.id AND estado NOT IN (-3, 9)))
                WHEN pg.[in-out] = 'IN' THEN
            CONVERT(NVARCHAR, (SELECT COUNT(bulto) FROM planigrid_cdmuelles WHERE idplanigrid = pg.id))
                END AS EstadoCarga,
                (SELECT STRING_AGG(operario, ', ') FROM (SELECT DISTINCT usuario AS operario FROM logs WHERE referencia = pg.id and tiporeferencia = 'idplanigrid' and usuario <> 'WEB') operarios_unicos) AS OperariosInvolucrados,
                pg.fechafinCD,
                pg.[in-out]
                FROM PLANIGRID as pg INNER JOIN
                muellesasignados as mas ON mas.idplanigrid = pg.id LEFT JOIN
                expediciones as exp ON exp.idplanigrid = pg.id LEFT JOIN
                preavisos as pre ON pre.idplanigrid = pg.id LEFT JOIN
                planigrid_cdmuelles as pcd ON pcd.idplanigrid = pg.id
                WHERE pg.fechallegada is not null and pg.fechasalida is null and pg.eliminado is null
                and pg.almacen = ?
                and mas.muelleasign = ?)drva
          ORDER BY consignacion`;

    return this.fetchAll(sqlText, [almacen, muelle]);
  }

  async consultaEstado(id) {
    const sqlText = `SELECT
        pg.[in-out] as inout,
        pg.id,
        ecd.estado,
        ecd.Descripcion
        FROM estados_cdmuelles as ecd INNER JOIN
        planigrid as pg ON pg.estadocdmuelles = ecd.idestado
        WHERE pg.id = ?`;

    return this.fetchOne(sqlText, [id]);
  }

  async cambiaEstado(estado, id) {
    return this.execute('UPDATE planigrid set estadocdmuelles = ? where id = ?', [estado, id]);
  }

  /**
   * Migrado literal del switch de cdmuelles/functions.php
   * (funcion=atrasestadocdmuelles) usado para "deshacer" un paso del
   * flujo (p.ej. al borrar la última foto subida).
   */
  async atrasEstadoCdmuelles(id, descripcion) {
    let sqlText = null;

    switch (descripcion) {
      case 'SONDA':
        sqlText = 'UPDATE planigrid SET estadocdmuelles = 8 WHERE id = ?';
        break;
      case 'DATALOGGER':
        sqlText = 'UPDATE planigrid SET estadocdmuelles = 10 WHERE id = ?';
        break;
      case 'PRECINTO':
        sqlText = 'UPDATE planigrid SET estadocdmuelles = 9 WHERE id = ?';
        break;
      case 'INICIAL':
        sqlText = 'UPDATE planigrid SET estadocdmuelles = 2 WHERE id = ?';
        break;
      case 'TRANSCURSO':
        sqlText = 'UPDATE planigrid set estadocdmuelles = 4 WHERE id = ?';
        break;
      case 'FINAL':
        sqlText = 'UPDATE PLANIGRID set estadocdmuelles = 6, fechafinCD = NULL WHERE id = ?';
        break;
      default:
        sqlText = null;
    }

    if (sqlText !== null) {
      await this.execute(sqlText, [id]);
    }
  }

  async entrarOrden1(id) {
    const sqlText = `SELECT
        *
        FROM(SELECT
            pg.[in-out] as inout,
            pg.id as idplanigrid,
            ino.id,
            ino.campohtml,
            ino.tipo,
            pid.value,
            pg.precinto as precintocentralita,
            tmr.rango,
            pg.sonda,
            ino.seccion,
            ino.orden
        FROM planigrid as pg
        INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
        LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
        LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
        WHERE pg.id = ? and (seccion <> 'CHOFER' OR seccion is null) and seccion is null

        UNION ALL

        SELECT
            pg.[in-out] as inout,
            pg.id as idplanigrid,
            ino.id,
            ino.campohtml,
            ino.tipo,
            pid.value,
            pg.precinto as precintocentralita,
            tmr.rango,
            pg.sonda,
            ino.seccion,
            ino.orden
        FROM planigrid as pg
        INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
        LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
        LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
        WHERE pg.id = ? and (seccion <> 'CHOFER' OR seccion is null) and seccion is not null and tipo = pg.peligrosidad

        )a


        ORDER BY
            CASE
                WHEN seccion IS NULL THEN 1
                WHEN seccion = 'PREVIAS' THEN 2
                WHEN seccion = 'DURANTE' THEN 3
                WHEN seccion = 'FINAL' THEN 4
                ELSE 5
            END,
            orden`;

    return this.fetchAll(sqlText, [id, id]);
  }

  async mostrarAlbaranes(id) {
    const sqlText = `SELECT DISTINCT
        CASE
            WHEN pg.agrupacion IS NOT NULL AND pg.[in-out] = 'IN' THEN pg.consignacion
            WHEN pg.[in-out] = 'OUT' THEN exp.pedido
            WHEN pg.[in-out] = 'IN' THEN pre.albaran
        END as albaran,
        CASE
            WHEN pg.[in-out] = 'IN' THEN NULL
            WHEN pg.agrupacion IS NOT NULL AND pg.[in-out] = 'OUT' THEN ISNULL(NULLIF(exp.palets, 0), exp.bultos)
            WHEN pg.[in-out] = 'OUT' THEN ISNULL(NULLIF(palets, 0), bultos)
        END bultos,
        MAX(pcd.bulto) AS bultoscargados,
        pg.id as idplanigrid,
        pg.[in-out] as inout,
        pg.estadocdmuelles
    FROM planigrid as pg
    LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
    LEFT JOIN expediciones as exp ON exp.idplanigrid = pg.id
    LEFT JOIN planigrid_cdmuelles as pcd
        ON
            (pg.agrupacion IS NOT NULL AND pg.[in-out] = 'IN' AND pg.consignacion = pcd.pedidoalbaran AND pg.id = pcd.idplanigrid)
            OR (pg.id = pcd.idplanigrid AND (pre.albaran = pcd.pedidoalbaran OR exp.pedido = pcd.pedidoalbaran))
    WHERE pg.id = ?
    AND (exp.estado IS NULL OR exp.estado NOT IN (-3, 9))
    GROUP BY pg.agrupacion, pg.consignacion, pg.[in-out], pg.id, pg.estadocdmuelles, pre.albaran, exp.bultos, exp.palets, EXP.pedido`;

    return this.fetchAll(sqlText, [id]);
  }

  async observaciones(id) {
    const sqlText = `SELECT
        pg.id,
        CASE
            WHEN pg.[in-out] = 'OUT' THEN pg.consignacion
            WHEN pg.[in-out] = 'IN' THEN 'Preaviso: '+pre.albaran
        END as consignación,
        CASE
            WHEN pg.[in-out] = 'OUT' THEN exp.manipulados
            WHEN pg.[in-out] = 'IN' THEN pre.comentarioalbaran
        END as manipulado,
        CASE
            WHEN pg.[in-out] = 'OUT' THEN exp.pedido
            WHEN pg.[in-out] = 'IN' THEN pre.albaran
        END as referencia,
        pg.prueba as Observación_Planificador,
        CASE
            WHEN pg.[in-out] = 'OUT' THEN r.matriculaTractora
            WHEN pg.[in-out] = 'IN' THEN pre.matriculatractora
        END as matriculatractora,
        CASE
            WHEN pg.[in-out] = 'OUT' THEN r.matricularemolque
            WHEN pg.[in-out] = 'IN' THEN pre.matricularemolque
        END as matricularemolque,
        exp.playa
        FROM planigrid as pg
        LEFT JOIN expediciones as exp ON exp.idplanigrid = pg.id
        LEFT JOIN rutas as r ON r.consignacion = pg.consignacion and r.propietario = pg.consignacion
        LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
        WHERE pg.id = ?`;

    return this.fetchAll(sqlText, [id]);
  }

  async finalizarCarga(idplanigrid, usuario) {
    const sqlText = `UPDATE planigrid set estadocdmuelles = 6 WHERE id = ?

        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se finaliza la CargaDescarga correctamente', 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;

    await this.execute(sqlText, [idplanigrid, usuario, idplanigrid]);
  }
}

module.exports = PlanigridCdRepository;
