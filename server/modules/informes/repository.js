'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo de los informes PDF. Réplica de las consultas SQL de
 * src/Modules/Informes/{HojaCarga1Renderer,HojaCarga2Renderer,
 * HojaDescarga1Renderer,EtiquetaGenericaInfoRenderer,EtiquetaRotinRenderer}.php
 * — cada método porta literalmente el SQL del renderer PHP correspondiente
 * (mismo origen de columnas, mismos JOIN, mismas condiciones), sin
 * reinterpretar la lógica de negocio. Los bloques ADR/LQ interpolaban
 * `$mostrar['peligrosidad']` directamente en el SQL en el original; aquí van
 * siempre como parámetro ligado ("?").
 */
class InformesRepository extends Repository {
  // ---------------------------------------------------------------------
  // Comunes a Hoja_Carga_1 / Hoja_Carga_2 / Hoja_Descarga_1
  // ---------------------------------------------------------------------

  async finalizada(id) {
    const fila = await this.fetchOne('SELECT fechafincd as finalizada FROM planigrid where id = ?', [id]);
    return fila !== null && fila.finalizada !== null && fila.finalizada !== undefined;
  }

  async fechaInforme(id) {
    return this.fetchAll(
      `SELECT CONVERT(DATE, i.fecha) as fecha
FROM planigrid as pg INNER JOIN
Informes AS I ON i.idinforme = pg.idinforme and i.version = pg.versioninforme
WHERE pg.id = ?`,
      [id]
    );
  }

  async muelleAsignado(id) {
    return this.fetchAll('SELECT muelleasign FROM muellesasignados WHERE idplanigrid = ?', [id]);
  }

  async fechaLlegada(id) {
    return this.fetchAll('SELECT fechallegada FROM planigrid WHERE id = ?', [id]);
  }

  async checksCalidad(id) {
    return this.fetchAll(
      `SELECT
ino.campohtml,
pid.value
FROM [Planificador].[dbo].planigrid as pg INNER JOIN
informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme LEFT JOIN
planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
WHERE ino.tipo = 'quizcalidad' and pg.id = ?`,
      [id]
    );
  }

  async observacionCalidad(id) {
    const fila = await this.fetchOne(
      `SELECT
ISNULL(pid.value, '') + ' ' + ISNULL(pg.observacioncdmuelles, '') + ' ' + ISNULL(pg.observacioncdmuellesquizcalidad, '') as value
FROM [Planificador].[dbo].planigrid as pg INNER JOIN
informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme LEFT JOIN
planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
WHERE ino.tipo = 'quizcalidadobservacion' and pg.id = ?`,
      [id]
    );
    return fila || { value: '' };
  }

  async usuariosYTiempo(id) {
    const fila = await this.fetchOne(
      `SELECT
COALESCE ((
  SELECT STRING_AGG(operario, ', ')
  FROM (
    SELECT DISTINCT
    usuario as operario
    from logs
    where tiporeferencia = 'idplanigrid' and referencia = pg.id and usuario <> 'WEB'
  ) operarios_unicos
), '') AS operarios,
pg.fechainforme as fechainicio,
pg.fechafincd
FROM planigrid_cdmuelles as pcd RIGHT OUTER JOIN
planigrid as pg ON pg.id = pcd.idplanigrid
WHERE pg.id = ?
GROUP BY pg.fechainforme, pg.id, fechafincd`,
      [id]
    );
    return fila || {};
  }

  async pedidosCargados(id) {
    return this.fetchAll(
      `SELECT
pedido,
albaran,
CASE
WHEN (estado = 6 or estado = 4) and ((left(bulto,charindex('/', bulto)-1) <> right(bulto,CHARINDEX('/',bulto)-1))) THEN CONCAT('**',convert(varchar(10), bulto),'**')
WHEN (estado = 6 or estado = 4) THEN convert(varchar(10), bulto)
WHEN estado = -3 THEN 'Desconsignado'
WHEN estado = 9 THEN 'Anulado'
END as bulto
FROM(SELECT
pedido,
exp.numSerieExpedicion as albaran,
CONCAT(MAX(pcd.bulto), '/', bultos) as bulto,
estado
FROM expediciones as exp LEFT JOIN
planigrid_cdmuelles as pcd ON pcd.idplanigrid = exp.idplanigrid and pcd.pedidoalbaran = exp.pedido
WHERE exp.idplanigrid = ?
GROUP BY pedido, estado, bultos, numserieexpedicion)a`,
      [id]
    );
  }

  async imagenesGaleria(id) {
    return this.fetchAll(
      `SELECT
concat(rutafisica, fichero) as rutafichero,
extension,
descripcion
FROM planigrid_cdmuelles_uploads
WHERE idplanigrid = ? and tipo = 'IMG'
ORDER BY CASE descripcion
        WHEN 'INICIAL' THEN 1
        WHEN 'TRANSCURSO' THEN 2
        WHEN 'FINAL' THEN 3
        WHEN 'EXTRA' THEN 4
        ELSE 5
    END`,
      [id]
    );
  }

  async peligrosidad(id) {
    const fila = await this.fetchOne('SELECT peligrosidad FROM planigrid WHERE id = ?', [id]);
    return fila && fila.peligrosidad !== undefined ? fila.peligrosidad : null;
  }

  async operariosPlanigrid(id) {
    const fila = await this.fetchOne(
      `SELECT
COALESCE (
    (SELECT STRING_AGG(operario, ', ')
  FROM (
    SELECT DISTINCT
    usuario as operario
    from logs
    where tiporeferencia = 'idplanigrid' and referencia = pg.id and usuario <> 'WEB'
  ) operarios_unicos
), '') AS operarios
FROM planigrid as pg
WHERE pg.id = ?`,
      [id]
    );
    return fila ? fila.operarios || '' : '';
  }

  /** Firma del conductor para el bloque ADR (solo Hoja_Carga_1/2, no Hoja_Descarga_1). */
  async firmaAdr(id) {
    const fila = await this.fetchOne(
      `SELECT TOP 1
CONCAT(rutafisica, fichero) AS rutafichero
FROM
planigrid_cdmuelles_uploads
WHERE
idplanigrid = ?
AND tipo = 'FIRMAIMG'
AND descripcion = 'FIRMAADR'
ORDER BY
fecha DESC`,
      [id]
    );
    return fila ? fila.rutafichero || '' : '';
  }

  /**
   * Filas del checklist ADR/LQ (PREVIAS/DURANTE/FINAL), variante Hoja_Carga
   * (JOIN con informes_objects incluye "and ino.version = pg.versioninforme").
   */
  async filasSeccionCarga(id, peligrosidad, seccion) {
    return this.fetchAll(
      `SELECT
pg.[in-out] as inout,
pg.id as idplanigrid,
ino.id,
ino.campohtml,
ino.tipo,
pid.value,
pg.precinto as precintocentralita,
tmr.rango,
ino.seccion
FROM planigrid as pg
INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
WHERE pg.id = ? and tipo = ? and seccion = ?
ORDER BY
CASE
    WHEN ino.seccion IS NULL THEN 1
    WHEN ino.seccion = 'PREVIAS' THEN 2
    WHEN ino.seccion = 'DURANTE' THEN 3
    WHEN ino.seccion = 'FINAL' THEN 4
    ELSE 5
END,
ino.orden`,
      [id, peligrosidad, seccion]
    );
  }

  /**
   * Filas del checklist ADR/LQ, variante Hoja_Descarga_1: a diferencia de
   * Hoja_Carga, el JOIN con informes_objects NO incluye
   * "and ino.version = pg.versioninforme" (se mantiene igual, es el texto
   * tal cual del script original).
   */
  async filasSeccionDescarga(id, peligrosidad, seccion) {
    return this.fetchAll(
      `SELECT
pg.[in-out] as inout,
pg.id as idplanigrid,
ino.id,
ino.campohtml,
ino.tipo,
pid.value,
pg.precinto as precintocentralita,
tmr.rango,
ino.seccion
FROM planigrid as pg
INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme
LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
WHERE pg.id = ? and tipo = ? and seccion = ?
ORDER BY
CASE
    WHEN ino.seccion IS NULL THEN 1
    WHEN ino.seccion = 'PREVIAS' THEN 2
    WHEN ino.seccion = 'DURANTE' THEN 3
    WHEN ino.seccion = 'FINAL' THEN 4
    ELSE 5
END,
ino.orden`,
      [id, peligrosidad, seccion]
    );
  }

  // ---------------------------------------------------------------------
  // Hoja_Carga_1 / Hoja_Carga_2 (cabecera conductor/ruta)
  // ---------------------------------------------------------------------

  async cabeceraCarga1(id) {
    const fila = await this.fetchOne(
      `SELECT DISTINCT
    r.numeroruta,
    r.conductorDni,
    r.conductorNombre,
    r.conductorApellidos,
    r.matricularemolque,
    r.matriculaTractora,
    r.conductortelefono,
    a.poblacion,
    pg.transportista,
    pg.precinto,
    CASE
        WHEN (SELECT COUNT(DISTINCT destino) FROM expediciones WHERE idplanigrid = pg.id) > 1 THEN 'Multiples destinos'
        ELSE (SELECT TOP 1 destino FROM expediciones WHERE idplanigrid = pg.id)
    END AS destino
FROM dbo.planigrid AS pg
LEFT JOIN dbo.rutas AS r ON r.propietario = pg.propietario
    AND (r.consignacion = pg.consignacion
    OR r.consignacion IN (SELECT ID FROM dbo.SplitString(pg.agrupacion_referencias, ',')))
LEFT JOIN almacenes AS a ON a.almacen = pg.almacen
WHERE pg.id = ?;`,
      [id]
    );
    return fila || {};
  }

  async cabeceraCarga2(id) {
    const fila = await this.fetchOne(
      `SELECT DISTINCT
    pg.propietario,
    pg.consignacion,
    r.numeroruta,
    r.conductorDni,
    r.conductorNombre,
    r.conductorApellidos,
    r.matricularemolque,
    r.matriculaTractora,
    r.conductortelefono,
    a.poblacion,
    pg.transportista,
    pg.precinto,
    CASE
        WHEN (SELECT COUNT(DISTINCT destino) FROM expediciones WHERE idplanigrid = pg.id) > 1 THEN 'Multiples destinos'
        ELSE (SELECT TOP 1 destino FROM expediciones WHERE idplanigrid = pg.id)
    END AS destino
FROM dbo.planigrid AS pg
LEFT JOIN dbo.rutas AS r ON r.propietario = pg.propietario
    AND (r.consignacion = pg.consignacion
    OR r.consignacion IN (SELECT ID FROM dbo.SplitString(pg.agrupacion_referencias, ',')))
LEFT JOIN almacenes AS a ON a.almacen = pg.almacen
WHERE pg.id = ?;`,
      [id]
    );
    return fila || {};
  }

  async temperaturaCarga1(id) {
    const fila = await this.fetchOne(
      `SELECT DISTINCT
pg.idtemprango AS temp,
tr.rango AS rango,
pid.value,
CASE
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 1 AND CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'Si'
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 0 OR CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) NOT BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'No'
    ELSE NULL
END AS comparacion_temp

FROM dbo.planigrid AS pg
 INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
    LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
    LEFT JOIN temperaturasrangos as tr ON tr.id = pg.idtemprango
WHERE pg.id = ? and ino.tipo = 'temperatura'`,
      [id]
    );
    return fila || {};
  }

  // ---------------------------------------------------------------------
  // Hoja_Descarga_1 (cabecera preaviso/remitente)
  // ---------------------------------------------------------------------

  async cabeceraDescarga1(id) {
    const fila = await this.fetchOne(
      `SELECT
propietario,
CASE
	WHEN agrupacion IS not null THEN consignacion
	ELSE STRING_AGG(albaran, '')
END as albaran,
nombre,
apellidos,
dni,
matriculatractora,
matricularemolque,
telefono,
transportista,
precinto,
DA,
poblacion
FROM(
SELECT
pg.agrupacion,
pg.consignacion,
pg.propietario,
pre.albaran,
pre.nombre,
pre.apellidos,
pre.dni,
pre.matricula as matriculatractora,
pre.matricularemolque,
pre.telefono,
pre.transportista,
pg.precinto,
CASE
WHEN LEFT(pre.albaran, 3) = 'DVD' THEN 'SÍ'
ELSE 'NO'
END as DA,
a.poblacion as poblacion
FROM planigrid as pg INNER JOIN
almacenes as a ON a.almacen = pg.almacen LEFT JOIN
preavisos as pre ON pg.id = pre.idplanigrid
WHERE pre.idplanigrid = ?)a
GROUP BY propietario, nombre, apellidos, dni, matriculatractora, matricularemolque, telefono,
transportista, precinto, poblacion, da, a.agrupacion, a.consignacion
ORDER BY nombre desc`,
      [id]
    );
    return fila || {};
  }

  async temperaturaDescarga1(id) {
    const fila = await this.fetchOne(
      `SELECT
pre.transportista,
tr.rango as rango,
pid.value,
CASE
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 1 AND CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'Si'
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 0 OR CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) NOT BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'No'
    ELSE NULL
END AS comparacion_temp

FROM preavisos AS PRE
INNER JOIN planigrid as pg ON pg.id = pre.idplanigrid
INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
LEFT JOIN temperaturasrangos as tr ON tr.id = pg.idtemprango
WHERE pre.idplanigrid = ? and ino.tipo = 'temperatura'`,
      [id]
    );
    return fila || {};
  }

  async bultosDescarga1(id) {
    return this.fetchAll(
      `SELECT
pg.agrupacion,
pre.albaran,
MAX(pcd.bulto) as bultos,
(SELECT COUNT(bulto) FROM planigrid_cdmuelles WHERE idplanigrid = pg.id) as btotales
FROM preavisos as pre
INNER JOIN planigrid as pg ON pg.id = pre.idplanigrid
LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = pre.idplanigrid and pcd.pedidoalbaran = pre.albaran
WHERE pre.idplanigrid = ?
GROUP BY albaran, pg.agrupacion, pg.id`,
      [id]
    );
  }

  // ---------------------------------------------------------------------
  // Etiqueta Genérica / Etiqueta ROTIN
  // ---------------------------------------------------------------------

  async etiquetaGenericaData(id) {
    const fila = await this.fetchOne(
      `SELECT
pg.almacen,
pg.[in-out] as inout,
pg.propietario,
CASE
    WHEN pg.[in-out] = 'IN' THEN pre.albaran
    ELSE pg.consignacion
END as Referencia,
CASE
    WHEN pg.[in-out] = 'OUT' THEN TRIM(pg.prueba)
    ELSE CONCAT(TRIM(pg.prueba), ' ', pre.comentarioalbaran)
END as observacion,
mas.muelleasign as muelle,
COALESCE(
            (SELECT
                    STRING_AGG(operario, ', ')
                FROM (SELECT DISTINCT
                        usuario as operario
                        FROM logs
                        WHERE tiporeferencia = 'idplanigrid' AND referencia = pg.id AND usuario <> 'WEB'
                        ) operarios_unicos
            ),
    '') AS usuarios,
pg.fechainforme as horainicio,
CONCAT((SELECT
COUNT(bulto) as bultos
FROM [Planificador].[dbo].[planigrid_cdmuelles]
where idplanigrid = pg.id
GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(epc.bultos))
as bultos,
CASE
    WHEN pg.[in-out] = 'OUT' THEN (SELECT dbo.fn_DistinctWords(STRING_AGG(epc.playa, ' ')))
    WHEN pg.[in-out] = 'IN' THEN (SELECT dbo.fn_DistinctWords(
                                        (SELECT STRING_agg(ubicacion, ' ')
                                         FROM [Planificador].[dbo].[planigrid_cdmuelles]
                                         WHERE idplanigrid = pg.id)))
END as playa,
pg.fechafincd,
pg.granel,
pg.paletsaportados,
(SELECT
pid.value
FROM planigrid_inf_data AS pid
INNER JOIN informes_objects as ino ON ino.id = idinfobjects
WHERE idplanigrid = pg.id and ino.idvariableaccion = 1) as respuestarotura


FROM planigrid as pg
LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
LEFT JOIN muellesasignados  as mas ON mas.idplanigrid = pg.id
LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id and epc.bultos IS not null


WHERE pg.id = ?
GROUP BY pg.propietario,
pg.almacen,
pg.[in-out],
pre.albaran,
pg.consignacion,
pg.prueba,
mas.muelleasign,
pg.id,
pg.fechainforme,
epc.bultos,
pg.prueba,
pre.comentarioAlbaran,
pg.fechafincd,
pg.granel,
pg.paletsaportados`,
      [id]
    );
    return fila || {};
  }

  async etiquetaRotinData(id) {
    const fila = await this.fetchOne(
      `SELECT
pg.almacen,
pg.[in-out] as inout,
pg.propietario,
CASE
    WHEN pg.[in-out] = 'IN' THEN pre.albaran
    ELSE pg.consignacion
END as Referencia,
CASE
    WHEN pg.[in-out] = 'OUT' THEN TRIM(pg.prueba)
    ELSE CONCAT(TRIM(pg.prueba), ' ', pre.comentarioalbaran)
END as observacion,
mas.muelleasign as muelle,
COALESCE(
            (SELECT
                    STRING_AGG(operario, ', ')
                FROM (SELECT DISTINCT
                        usuario as operario
                        FROM logs
                        WHERE tiporeferencia = 'idplanigrid' AND referencia = pg.id AND usuario <> 'WEB'
                        ) operarios_unicos
            ),
    '') AS usuarios,
pg.fechainforme as horainicio,
CONCAT((SELECT
COUNT(bulto) as bultos
FROM [Planificador].[dbo].[planigrid_cdmuelles]
where idplanigrid = pg.id
GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(epc.bultos))
as bultos,
CASE
    WHEN pg.[in-out] = 'OUT' THEN (SELECT dbo.fn_DistinctWords(STRING_AGG(epc.playa, ' ')))
    WHEN pg.[in-out] = 'IN' THEN (SELECT dbo.fn_DistinctWords(
                                        (SELECT STRING_agg(ubicacion, ' ')
                                         FROM [Planificador].[dbo].[planigrid_cdmuelles]
                                         WHERE idplanigrid = pg.id)))
END as playa,
pg.fechafincd


FROM planigrid as pg
LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
LEFT JOIN muellesasignados  as mas ON mas.idplanigrid = pg.id
LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id and epc.bultos IS not null


WHERE pg.id = ?
GROUP BY pg.propietario,
pg.almacen,
pg.[in-out],
pre.albaran,
pg.consignacion,
pg.prueba,
mas.muelleasign,
pg.id,
pg.fechainforme,
epc.bultos,
pg.prueba,
pre.comentarioAlbaran,
pg.fechafincd`,
      [id]
    );
    return fila || {};
  }

  // ---------------------------------------------------------------------
  // Bin/informes/*-automate.js (proceso batch nocturno)
  // ---------------------------------------------------------------------

  /** Cargas (OUT) cuya fechafinCD fue "ayer", una fila por pedido. */
  async cargasParaAutomatizar() {
    return this.fetchAll(
      `SELECT
            pg.[id],
            exp.pedido,
            trze.propietario as propietario,
            'V:\\' + trze.propietario +'\\pedidos\\carga\\' as ruta,
            FORMAT(sysdatetime(), 'yyyyMMddhhmmss') + '_' + replace(pg.consignacion, '/', '-') +'.pdf' as nombrefichero
        FROM [Planificador].[dbo].[planigrid] as pg
        INNER JOIN PartnerWeb_v2.dbo.empresas as trze ON trze.propietario = pg.propietario
        INNER JOIN Planificador.dbo.expediciones as exp ON exp.idplanigrid = pg.id
        WHERE
            CONVERT(date, fechafinCD) = DATEADD(day, -1, CONVERT(date, SYSDATETIME()))
            AND pg.[in-out] = 'OUT'
        ORDER BY 2 ASC`
    );
  }

  /** Descargas (IN) cuya fechafinCD fue "ayer", una fila por albarán de preaviso. */
  async descargasParaAutomatizar() {
    return this.fetchAll(
      `SELECT
            pg.[id],
            pre.albaran,
            trze.propietario as propietario,
            'V:\\' + trze.propietario +'\\preavisos\\descarga\\' as ruta,
            FORMAT(sysdatetime(), 'yyyyMMddhhmmss') + '_' + replace(pg.consignacion, '/', '-') +'.pdf' as nombrefichero
        FROM [Planificador].[dbo].[planigrid] as pg
        INNER JOIN PartnerWeb_v2.dbo.empresas as trze ON trze.propietario = pg.propietario
        INNER JOIN preavisos as pre ON pre.idplanigrid = pg.id
        WHERE
        CONVERT(date, fechafinCD) = DATEADD(day, -1, CONVERT(date, SYSDATETIME()))
        AND pg.[in-out] = 'IN'
        ORDER BY 2 ASC`
    );
  }

  async existeDocPedido(pedido, propietario) {
    const fila = await this.fetchOne(
      'SELECT COUNT(*) AS total FROM PartnerWeb_v2.dbo.docsPedidos WHERE pedido = ? and propietario = ?',
      [pedido, propietario]
    );
    return fila && Number(fila.total) > 0;
  }

  async actualizarDocPedidoCarga(pedido, propietario, rutaCarga) {
    await this.execute(
      'UPDATE PartnerWeb_v2.dbo.docsPedidos SET carga = ? WHERE pedido = ? and propietario = ?',
      [rutaCarga, pedido, propietario]
    );
  }

  async insertarDocPedidoCarga(pedido, propietario, rutaCarga) {
    await this.execute(
      `INSERT INTO PartnerWeb_v2.dbo.docsPedidos
                      (pedido, propietario, albaranExpedicion, cmrSalida, packingListSalida, carga, albaranDest, temperaturaOUT, fecha)
                      VALUES (?, ?, NULL, NULL, NULL, ?, NULL, NULL, SYSDATETIME())`,
      [pedido, propietario, rutaCarga]
    );
  }

  async existeDocPreaviso(preaviso, propietario) {
    const fila = await this.fetchOne(
      'SELECT COUNT(*) AS total FROM PartnerWeb_v2.dbo.docsPreavisos WHERE preaviso = ? and propietario = ?',
      [preaviso, propietario]
    );
    return fila && Number(fila.total) > 0;
  }

  async actualizarDocPreavisoDescarga(preaviso, propietario, rutaDescarga) {
    await this.execute(
      'UPDATE PartnerWeb_v2.dbo.docsPreavisos SET descarga = ? WHERE preaviso = ? and propietario = ?',
      [rutaDescarga, preaviso, propietario]
    );
  }

  async insertarDocPreavisoDescarga(preaviso, propietario, rutaDescarga) {
    await this.execute(
      `INSERT INTO PartnerWeb_v2.dbo.docsPreavisos
                  (preaviso, propietario, albaranEntrega, calidad, cmrEntrada, packinglistEntrada, temperaturaIN, descarga, fecha)
                  VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, ?, SYSDATETIME())`,
      [preaviso, propietario, rutaDescarga]
    );
  }
}

module.exports = InformesRepository;
