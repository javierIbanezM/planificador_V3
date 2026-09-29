'use strict';

const Repository = require('../../data/repository');
const { bultosEfectivos } = require('../../data/sqlFragments');

/**
 * Migrado de src/Modules/Consignacion/ConsignacionRepository.php (a su vez
 * migrado de Resources/PHP/Modal_Consignacion.php). Todo el SQL usaba ya
 * sentencias preparadas en el original salvo dblclick_cab, que interpolaba
 * "WHERE pg.id = '$_SESSION[id]'" directamente: aquí se liga como parámetro,
 * igual que en el PHP ya migrado.
 *
 * Varios métodos del original usaban $this->db->prepare($sql)->execute($params)
 * en vez del helper heredado Repository::execute(), para poder devolver
 * directamente el booleano de éxito/fracaso de PDOStatement::execute() (con
 * PDO en modo silencioso, sin lanzar excepción en error SQL). mssql/tedious
 * SÍ lanza excepción ante un error SQL, así que aquí se envuelve esa misma
 * semántica con try/catch en `ejecutarBooleano()`: nunca tumba la petición,
 * solo devuelve false, igual que el comportamiento observado en el PHP.
 */
class ConsignacionRepository extends Repository {
  async ejecutarBooleano(sqlText, params = []) {
    try {
      await this.query(sqlText, params);
      return true;
    } catch (err) {
      console.error('Error SQL en ConsignacionRepository:', err.message);
      return false;
    }
  }

  async alertamail(usuario, idplanigrid) {
    const sql = `SELECT
            CASE
                WHEN CHARINDEX((SELECT TOP 1 correo FROM usuarios WHERE nombre = ?), alertamail) > 0
                THEN 1
                ELSE 0
            END as resultado
            FROM [Planificador].[dbo].[planigrid]
            WHERE id = ?`;

    return this.fetchOne(sql, [usuario, idplanigrid]);
  }

  async cabecera(idplanigrid) {
    const sql = `SELECT pg.[in-out] AS INOUT,
            CASE WHEN mas.muelleasign IS NULL THEN '0' ELSE mas.muelleasign END AS muelleasign,
            CASE WHEN mrs.muellesreserv IS NULL THEN '0' ELSE muellesreserv END AS muellesreserv,
            pg.prueba as prueba,
            pg.sonda,
            pg.datalogger,
            CASE WHEN pg.[in-out] = 'OUT' THEN MAX(epc.fechatransporte)
              WHEN pg.[in-out] = 'IN' THEN pg.fechaprevista END AS 'horaprogramada',
            pg.fechallegada AS fechallegada,
            pg.fechasalida AS fechasalida,
            pg.id,
            pg.precinto as precinto,
            CONCAT((SELECT
                    COUNT(bulto) as bultos
              FROM [Planificador].[dbo].[planigrid_cdmuelles]
              where idplanigrid = pg.id
              GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(${bultosEfectivos('epc.')}))
            as bultos,
            ecd.Estado as estadocdmuelles
            FROM planigrid AS pg
            LEFT JOIN muellesasignados AS mas ON mas.idplanigrid = pg.id
            LEFT JOIN muellesreservados AS mrs ON mrs.idplanigrid = pg.id
            LEFT JOIN expediciones AS epc ON epc.idplanigrid = pg.id
            LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
            LEFT JOIN estados_cdmuelles as ecd ON ecd.idestado = pg.estadocdmuelles
            WHERE pg.id = ?
            GROUP BY pg.[in-out], mas.muelleasign, mrs.muellesreserv, pg.prueba, pg.fechaprevista, pg.fechallegada,
            pg.fechasalida, pg.id, pg.precinto, ecd.Estado, pg.sonda, pg.datalogger`;

    return this.fetchAll(sql, [idplanigrid]);
  }

  async datos(idplanigrid) {
    const sql = `SELECT
            exp.id,
            propietario,
            pedido,
            consignacion,
            transportista,
            CASE
            WHEN estado = -3 THEN 'Desconsignado'
            WHEN estado = 0 THEN 'Pend. Gen'
            WHEN estado = 1 THEN 'Creación'
            WHEN estado = 2 THEN 'Expedición'
            WHEN estado = 4 THEN 'Cerrado'
            WHEN estado = 5 THEN 'Asignado Gen.'
            WHEN estado = 6 THEN 'En Ruta'
            WHEN estado = 7 THEN 'Pend. Faltas Gen.'
            WHEN estado = 8 THEN 'Asignado Faltas'
            WHEN estado = 9 THEN 'Anulado'
            WHEN estado = 15 THEN 'Bloqueado'
            ELSE 'En Proceso' END as 'estado',
            playa,
            CAST((ISNULL(COUNT(pcd.bulto),'')) as varchar)+'/'+CAST(ISNULL(${bultosEfectivos()}, '') as varchar) as bultos,
            CASE
            WHEN [numSerieExpedicion] IS NULL THEN '0'
            ELSE [numSerieExpedicion] END as albaranenvio,
            peligrosidad
            FROM Planificador.dbo.expediciones as exp
            LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = exp.idplanigrid and pcd.pedidoalbaran = exp.pedido
            WHERE exp.idplanigrid = ?
            AND exp.estado NOT IN (-3, 9)
            GROUP BY exp.id,
            exp.propietario,
            exp.pedido,
            exp.consignacion,
            exp.transportista,
            exp.estado,
            exp.playa,
            exp.bultos,
            exp.palets,
            exp.numSerieExpedicion,
            exp.peligrosidad

            UNION ALL

            SELECT
            pre.id,
            pg.propietario,
            albaran,
            pg.consignacion as consignacion,
            pg.transportista,
            CASE
            WHEN estado = -1 THEN 'CREACION'
            WHEN estado = 0 THEN 'IMPORTADO'
            WHEN estado = 1 THEN 'PENDIENTE'
            WHEN estado = 2 THEN 'FINALIZADO'
            WHEN estado = 3 THEN 'DISCREPANCIA'
            WHEN estado = 4 THEN 'RECEPCIONADO'
            WHEN estado = 5 THEN 'CANCELADO'
            WHEN estado = 6 THEN 'BLOQUEADO'
            ELSE 'DESCONOCIDO'
            END as estado,
            (SELECT dbo.fn_DistinctWords(STRING_AGG(pcd.ubicacion, ' '))) as playa,
            CAST(ISNULL(COUNT(pcd.bulto),'') As varchar) as bultos,
            '0' as albaranenvio,
            pg.peligrosidad as peligrosidad
            FROM Planificador.dbo.preavisos as pre
            INNER JOIN planigrid as pg ON pg.id = pre.idplanigrid
            LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = pre.idplanigrid and pcd.pedidoalbaran = pre.albaran
            WHERE pre.idplanigrid = ?
            GROUP BY pre.id,
            pg.propietario,
            pre.albaran,
            pg.consignacion,
            pg.transportista,
            pre.estado,
            pg.peligrosidad`;

    return this.fetchAll(sql, [idplanigrid, idplanigrid]);
  }

  async datosQuizCalidad(idplanigrid) {
    const sql = `SELECT
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

    return this.fetchAll(sql, [idplanigrid, idplanigrid]);
  }

  async selectTempRango(idplanigrid) {
    const sql = `SELECT DISTINCT
          tr.id,
          tr.rango,
          pg.idtemprango as aux,
          pg.sonda
        FROM temperaturasrangos  as tr LEFT JOIN
        planigrid as pg ON pg.idtemprango = tr.id AND (pg.id = ? or pg.id is null)
        LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id
        LEFT JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme`;

    return this.fetchAll(sql, [idplanigrid]);
  }

  async logs(idplanigrid) {
    const sql = `SELECT
          id,
          fecha,
          usuario,
          descripcion,
          instruccion
        FROM logs
        WHERE referencia = ? and tiporeferencia = 'idplanigrid'
        ORDER BY fecha ASC`;

    return this.fetchAll(sql, [idplanigrid]);
  }

  async fotoRuta(idfoto) {
    return this.fetchOne(
      'SELECT CONCAT(rutafisica, fichero) as rutafichero FROM planigrid_cdmuelles_uploads WHERE id = ?',
      [idfoto]
    );
  }

  async eliminarFoto(idfoto, usuario, idplanigrid) {
    const sql = `DELETE planigrid_cdmuelles_uploads where id = ?

            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Eliminada foto id: '+CONVERT(varchar(10), ?), 'DELETE', 'idplanigrid', ?)`;

    await this.execute(sql, [idfoto, usuario, idfoto, idplanigrid]);
  }

  async correoUsuario(usuario) {
    const fila = await this.fetchOne('SELECT TOP 1 correo FROM usuarios WHERE nombre = ?', [usuario]);
    return fila ? fila.correo : null;
  }

  async desactivarAlertaMail(correo, idplanigrid) {
    const sql = `UPDATE planigrid
              SET alertamail = REPLACE(alertamail, ? + ';', '')
              WHERE id = ?`;

    return (await this.execute(sql, [correo, idplanigrid])) >= 0;
  }

  async activarAlertaMail(usuario, idplanigrid) {
    const sql = `UPDATE planigrid
          SET alertamail = CONCAT(COALESCE(alertamail, ''),
                                  CASE
                                      WHEN alertamail IS NULL OR alertamail = '' THEN ''
                                      ELSE ';'
                                  END,
                                  (SELECT TOP 1 correo FROM usuarios WHERE nombre = ?))+';'
          WHERE id = ?`;

    return (await this.execute(sql, [usuario, idplanigrid])) >= 0;
  }

  /**
   * spDesagruparPreExp comprueba que la selección sea "Completa" (que
   * @PListOfIDs incluya TODAS las expediciones/preavisos del grupo, no un
   * subconjunto) y, si no lo es, aborta sin avisar (solo hace PRINT +
   * RETURN, sin lanzar ningún error SQL) — así que en vez de confiar en
   * que el llamante mande la lista correcta, se calcula aquí mismo
   * leyendo directamente qué expediciones/preavisos cuelgan ahora mismo
   * de $idplanigrid, garantizando siempre una selección completa.
   */
  async idsParaDesagrupar(idplanigrid) {
    const inout = await this.fetchOne('SELECT [in-out] as inout FROM planigrid WHERE id = ?', [idplanigrid]);

    if (inout === null) {
      return [];
    }

    const tabla = inout.inout === 'IN' ? 'preavisos' : 'expediciones';

    return this.fetchAll(`SELECT id FROM ${tabla} WHERE idplanigrid = ?`, [idplanigrid]);
  }

  /**
   * Al desagrupar del todo, spDesagruparPreExp BORRA la fila de
   * planigrid del grupo (ver bloque final "si se ha quedado solo, lo
   * eliminamos"). Como el procedimiento no devuelve ningún estado de
   * éxito/fallo real, se comprueba aquí si esa fila sigue existiendo
   * después: si ha desaparecido, desagrupó de verdad; si sigue ahí, no
   * hizo nada (selección incompleta, grupo inválido, etc.).
   */
  async desagruparCd(idplanigrid, usuario, plataforma = 'Ordenador') {
    const idsParaDesagrupar = await this.idsParaDesagrupar(idplanigrid);

    if (idsParaDesagrupar.length === 0) {
      return false;
    }

    const selectedRows = idsParaDesagrupar.map((fila) => fila.id).join(',');

    const sql = `EXEC [dbo].[spDesagruparPreExp]
          @PListOfIDs = ?,
          @pIdplanigrid = ?,
          @usuario = ?,
          @plataforma = ?`;

    await this.query(sql, [selectedRows, idplanigrid, usuario, plataforma]);

    const siguenExistiendo = await this.fetchOne('SELECT id FROM planigrid WHERE id = ?', [idplanigrid]);

    return siguenExistiendo === null;
  }

  async cambiarSonda(idplanigrid, activar, usuario) {
    const sql = activar
      ? `UPDATE planigrid SET sonda = 1 WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Activada sonda en CD', 'INSERT', 'idplanigrid', ?)`
      : `UPDATE planigrid SET sonda = NULL WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Desactivada sonda en CD', 'INSERT', 'idplanigrid', ?)`;

    return this.ejecutarBooleano(sql, [idplanigrid, usuario, idplanigrid]);
  }

  async cambiarDatalogger(idplanigrid, activar, usuario) {
    const sql = activar
      ? `UPDATE planigrid SET datalogger = 1 WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Activado datalogger en CD', 'INSERT', 'idplanigrid', ?)`
      : `UPDATE planigrid SET datalogger = NULL WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Desactivado datalogger en CD', 'INSERT', 'idplanigrid', ?)`;

    return this.ejecutarBooleano(sql, [idplanigrid, usuario, idplanigrid]);
  }

  async muelleAsignado(idplanigrid) {
    return this.fetchOne('SELECT muelleasign FROM muellesasignados WHERE idplanigrid = ?', [idplanigrid]);
  }

  async eliminarMuelleAsignado(idplanigrid, usuario, muelleAnterior) {
    const sql = `DELETE muellesasignados where idplanigrid = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Muelle Eliminado: ' + CAST(? as varchar(3)), 'DELETE', 'idplanigrid', ?)`;

    return this.ejecutarBooleano(sql, [idplanigrid, usuario, muelleAnterior, idplanigrid]);
  }

  async rangoActual(idplanigrid) {
    const sql = `SELECT
          pg.idtemprango,
          COALESCE(tr.rango, 'Sin Temperatura')
          as rango
          FROM planigrid as pg
          LEFT join temperaturasrangos as tr ON tr.id = pg.idtemprango
          WHERE pg.id = ?`;

    return this.fetchOne(sql, [idplanigrid]);
  }

  async cambiarTempRango(temprango, idplanigrid, usuario, rangoAnterior, textoNuevo) {
    const sql = `UPDATE planigrid set idtemprango = ? WHERE id = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Cambio Rango de Temperatura, anterior: '+ ? +', nuevo: '+ ?+'', 'INSERT', 'idplanigrid', ?)`;

    return this.ejecutarBooleano(sql, [temprango, idplanigrid, usuario, rangoAnterior, textoNuevo, idplanigrid]);
  }

  async fechaSalida(idplanigrid) {
    return this.fetchOne('SELECT fechasalida from planigrid WHERE id = ?', [idplanigrid]);
  }

  async desasignarSalida(idplanigrid, usuario, fechaSalidaAnterior) {
    const sql = `UPDATE planigrid SET fechasalida = NULL WHERE id = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha salida eliminada: ' + CONVERT(VARCHAR, ?, 103) + ' ' + CONVERT(VARCHAR(5), ?, 108), 'DELETE', 'idplanigrid', ?)
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'DesasigSalida'`;

    return this.ejecutarBooleano(sql, [
      idplanigrid,
      usuario,
      fechaSalidaAnterior,
      fechaSalidaAnterior,
      idplanigrid,
      idplanigrid,
      usuario,
    ]);
  }

  async estadoParaAsignarSalida(idplanigrid) {
    const sql = `SELECT
          MIN(orden) as EstadoMin,
          MAX(orden) as EstadoMax,
          pg.estadocdmuelles,
          MAX(l.fecha) as fechafirmapeligrosidad,
          pg.peligrosidad,
          pg.[in-out] as inout
          FROM estados_cdmuelles as ecd
          LEFT JOIN planigrid as pg ON pg.id = ?
          LEFT JOIN logs as l ON l.referencia = pg.id and l.tiporeferencia = 'idplanigrid'
          AND l.descripcion = 'Firma de peligrosidad ADR'
          GROUP BY pg.estadocdmuelles, pg.peligrosidad, pg.[in-out]`;

    return this.fetchOne(sql, [idplanigrid]);
  }

  async asignarSalida(idplanigrid, usuario) {
    const sql = `UPDATE planigrid SET fechasalida = SYSDATETIME() WHERE id = ?
                  INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
                  VALUES (SYSDATETIME(), ?, 'Fecha salida insertada: ' + CONVERT(VARCHAR, SYSDATETIME(), 103) + ' ' + CONVERT(VARCHAR(5), SYSDATETIME(), 108), 'INSERT', 'idplanigrid', ?)
                  EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'AsigSalida'`;

    return this.ejecutarBooleano(sql, [idplanigrid, usuario, idplanigrid, idplanigrid, usuario]);
  }

  async fechaLlegada(idplanigrid) {
    return this.fetchOne('SELECT fechallegada from planigrid WHERE id = ?', [idplanigrid]);
  }

  async desasignarLlegada(idplanigrid, usuario, fechaLlegadaAnterior) {
    const sql = `UPDATE planigrid SET fechallegada = NULL WHERE id = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha llegada eliminada: ' + CONVERT(VARCHAR, ?, 103) + ' ' + CONVERT(VARCHAR(5), ?, 108), 'DELETE', 'idplanigrid', ?)
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'DesasigLlegada'`;

    return this.ejecutarBooleano(sql, [
      idplanigrid,
      usuario,
      fechaLlegadaAnterior,
      fechaLlegadaAnterior,
      idplanigrid,
      idplanigrid,
      usuario,
    ]);
  }

  async asignarLlegada(idplanigrid, usuario) {
    const sql = `UPDATE planigrid SET fechallegada = SYSDATETIME() WHERE id = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha llegada insertada: ' + CONVERT(VARCHAR, SYSDATETIME(), 103) + ' ' + CONVERT(VARCHAR(5), SYSDATETIME(), 108), 'INSERT', 'idplanigrid', ?);
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'AsigLlegada'`;

    return this.ejecutarBooleano(sql, [idplanigrid, usuario, idplanigrid, idplanigrid, usuario]);
  }

  async valoresCabeceraOriginal(idplanigrid) {
    const sql = `SELECT pg.precinto, pg.prueba, pg.fechallegada, pg.fechasalida, mas.muelleasign, mer.muellesreserv, ecd.Estado, pg.idtemprango
          FROM planigrid AS pg
        LEFT JOIN estados_cdmuelles as ecd ON ecd.idestado = pg.estadocdmuelles
        LEFT JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
        LEFT JOIN muellesreservados as mer ON mer.idplanigrid = pg.id
          Where pg.id = ?`;

    return this.fetchOne(sql, [idplanigrid]);
  }

  async actualizarCabecera(sqlText, params) {
    return this.ejecutarBooleano(sqlText, params);
  }

  async muelleHabilitado(almacen, muelle) {
    return this.fetchOne(
      'SELECT [muelle], [habilitado] FROM [Planificador].[dbo].[muelles] WHERE almacen = ? and muelle = ?',
      [almacen, muelle]
    );
  }

  async muellePermitidoRangoTemp(idtemprango, muelle) {
    const sql =
      'SELECT mtr.idmuelle FROM muellestemprango as mtr INNER JOIN muelles as m ON m.id = mtr.idmuelle WHERE idtemprango = ? and muelle = ?';

    return this.fetchOne(sql, [idtemprango, muelle]);
  }

  async actualizarMuelleAsignado(muelle, idplanigrid) {
    return (
      (await this.execute('UPDATE muellesasignados SET muelleasign = ?, fecharegistro = SYSDATETIME() WHERE idplanigrid = ?', [
        muelle,
        idplanigrid,
      ])) >= 0
    );
  }

  async insertarMuelleAsignado(muelle, idplanigrid) {
    return (
      (await this.execute('INSERT INTO muellesasignados (muelleasign, fecharegistro, idplanigrid) VALUES (?, SYSDATETIME(), ?)', [
        muelle,
        idplanigrid,
      ])) >= 0
    );
  }

  async eliminarMuellesAsignadosPorIdplanigrid(idplanigrid) {
    return (await this.execute('DELETE FROM muellesasignados WHERE idplanigrid = ?', [idplanigrid])) >= 0;
  }

  async actualizarMuelleReservado(muelleReservado, idplanigrid) {
    return (
      (await this.execute(
        'UPDATE muellesreservados SET muellesreserv = ?, fecharegistro = SYSDATETIME() WHERE idplanigrid = ?',
        [muelleReservado, idplanigrid]
      )) >= 0
    );
  }

  async insertarMuelleReservado(muelleReservado, idplanigrid) {
    return (
      (await this.execute(
        'INSERT INTO muellesreservados (muellesreserv, fecharegistro, idplanigrid) VALUES (?, SYSDATETIME(), ?)',
        [muelleReservado, idplanigrid]
      )) >= 0
    );
  }

  async eliminarMuelleReservado(idplanigrid) {
    return (await this.execute('DELETE FROM [muellesreservados] WHERE idplanigrid = ?', [idplanigrid])) >= 0;
  }

  async registrarCambioLog(usuario, descripcion, instruccion, tiporeferencia, referencia) {
    const sql = `INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
               VALUES (SYSDATETIME(), ?, ?, ?, ?, ?)`;

    await this.execute(sql, [usuario, descripcion, instruccion, tiporeferencia, referencia]);
  }

  async informeCargaDescarga(idplanigrid) {
    // pg es la UNION de planigrid + planigrid_H (misma razón que en
    // HistoricoRepository: el id puede corresponder a una consignación ya
    // archivada, y el botón "Informe C/D" debe poder resolverla igual).
    const sql = `SELECT
          pg.[in-out]
          ,i.Informe as informe
          ,pg.[versioninforme]
        FROM (
          SELECT * FROM [Planificador].[dbo].planigrid
          UNION ALL
          SELECT * FROM [Planificador].[dbo].planigrid_H
        ) as pg INNER JOIN
        informes as i on I.idinforme = pg.idinforme and i.version = pg.versioninforme
        WHERE pg.id = ?`;

    return this.fetchOne(sql, [idplanigrid]);
  }

  async galeria(idplanigrid) {
    const sql = `SELECT concat(CASE when left(ruta, 1) = 'u' THEN 'cdmuelles/' else '' END,ruta, fichero) as rutafichero, extension, descripcion, id
            FROM planigrid_cdmuelles_uploads
            WHERE idplanigrid = ? and tipo = 'IMG'
            ORDER BY CASE descripcion
        WHEN 'INICIAL' THEN 1
        WHEN 'TRANSCURSO' THEN 2
        WHEN 'FINAL' THEN 3
        WHEN 'EXTRA' THEN 4
        ELSE 5
    END`;

    return this.fetchAll(sql, [idplanigrid]);
  }

  async insertarSubidaImagen(idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutaFisica) {
    const sql = `INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Subida de imagen '+?+'', 'INSERT', 'idplanigrid', ?, SYSDATETIME())`;

    return this.ejecutarBooleano(sql, [
      idplanigrid,
      ruta,
      fichero,
      usuario,
      extension,
      tipo,
      descripcion,
      rutaFisica,
      usuario,
      descripcion,
      idplanigrid,
    ]);
  }

  async actualizarEstadoCdMuellesPorSubida(idplanigrid, estado, marcarFinCd = false) {
    if (marcarFinCd) {
      return (await this.execute('UPDATE PLANIGRID set estadocdmuelles = ?, fechafinCD = SYSDATETIME() WHERE id = ?', [
        estado,
        idplanigrid,
      ])) >= 0;
    }

    return (await this.execute('UPDATE planigrid set estadocdmuelles = ? WHERE id = ?', [estado, idplanigrid])) >= 0;
  }
}

module.exports = ConsignacionRepository;
