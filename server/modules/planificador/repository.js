'use strict';

const Repository = require('../../data/repository');

/**
 * Modelo del módulo Planificador. Réplica de
 * src/Modules/Planificador/PlanificadorRepository.php (migrado a su vez de
 * Resources/PHP/Planificador.php, funciones planigrid, agruparcd). La
 * consulta original interpolaba $_SESSION[almacen] directamente en el SQL;
 * aquí se liga como parámetro (igual que en el PHP ya migrado).
 */
class PlanificadorRepository extends Repository {
  async planigrid(almacen) {
    const sqlText = `SELECT
drva.id,
drva.[in-out],
drva.Tipo_de_carga,
drva.propietario,
drva.consignacion,
drva.fecha_prevista,
drva.muelle,
drva.Mreservado,
drva.Observaciones,
drva.Transportista,
drva.OrdenCompra,
drva.hora_programada,
drva.h_llegada,
drva.bultos,
drva.estado,
drva.rango,
drva.precinto,
drva.peligrosidad,
drva.EstadoCarga,
CASE
	WHEN fechafincd is null THEN 'blanco'
	WHEN [in-out] = 'IN' THEN 'verde'
	WHEN left(estadocarga, charindex('/', EstadoCarga, 1)-1) = right(estadocarga, charindex('/', estadocarga,1)-1) and fechafincd is not NULL THEN 'verde'
	ELSE 'rojo'
END as colorestadocarga

FROM(
	SELECT
	pg.id,
	pg.[in-out],
	ts.tipo_de_carga as Tipo_de_carga,
	pg.propietario,
	CASE
		WHEN pg.consignacion IN ('Agrupación Expediciones', 'Agrupación Preavisos') AND pg.agrupacion_referencias IS NOT NULL
			THEN 'AG: ' + pg.agrupacion_referencias
		ELSE pg.consignacion
	END as consignacion,
	FORMAT(pg.fechaprevista, 'dd-MM-yy') as fecha_prevista,
	FORMAT(mas.muelleasign, '00') as muelle,
	FORMAT(mrs.muellesreserv, '00') AS Mreservado,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN CONCAT(ISNULL(tsl.temprango,''), ' ', ISNULL(TRIM(pg.prueba),''), ' ', ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(epc.playa, ' '))), ''))
		WHEN pg.[in-out] = 'IN' THEN CONCAT(ISNULL(TRIM(pg.prueba), ''), ' ', ISNULL(string_agg(pre.comentarioalbaran, ', '),''))
	END as Observaciones,
	ISNULL(pg.transportista,'')+CASE WHEN pg.servicelevel <> '' THEN ' - '+pg.servicelevel ELSE '' END as Transportista,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(epc.Purchase_Order, ''))),'')+' '+ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(epc.pedido, ''))),'')
		WHEN pg.[in-out] = 'IN' THEN ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(pre.ordencompra, ', '))),'')+' '+ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(pre.albaran,', '))),'')
	END as OrdenCompra,
	CONVERT(char(5), pg.fechaprevista, 108) as hora_programada,
	CONVERT(char(5), pg.fechallegada, 108) as h_llegada,
	CASE
		WHEN CASE
				WHEN pg.[in-out] = 'OUT' THEN SUM(ISNULL(NULLIF(epc.palets, 0), epc.bultos))
				WHEN pg.[in-out] = 'IN' THEN NULL
			 END = 0 THEN NULL
		ELSE CASE
				WHEN pg.[in-out] = 'OUT' THEN SUM(ISNULL(NULLIF(epc.palets, 0), epc.bultos))
				WHEN pg.[in-out] = 'IN' THEN NULL
			 END
	END as bultos,
	pp.estado,
	tr.rango,
	pg.precinto,
	pg.peligrosidad,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN CONCAT((SELECT COUNT(finalizado) FROM EstadoCargaDescarga WHERE idplanigrid = pg.id), '/', (SELECT COUNT(pedido) FROM expediciones WHERE idplanigrid = pg.id))
		WHEN pg.[in-out] = 'IN' THEN CONVERT(varchar(10), (SELECT COUNT(bulto) FROM planigrid_cdmuelles WHERE idplanigrid = pg.id))
	END as EstadoCarga,

	pg.fechafinCD
	FROM planigrid as pg
	LEFT JOIN transportistas as ts ON ts.transportista = pg.transportista
	LEFT JOIN transportistasServiceLevel as tsl ON ts.transportista = tsl.transportista and tsl.servicelevel = pg.servicelevel
	LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id
	LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
	LEFT JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
	LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
	LEFT JOIN PorcentajePedidos as pp ON pp.idplanigrid = pg.id
	LEFT JOIN temperaturasrangos as tr ON tr.id = pg.idtemprango
	WHERE pg.fechasalida IS NULL AND pg.almacen = ? and pg.eliminado is null
	AND (pg.[in-out] <> 'OUT' OR EXISTS (SELECT 1 FROM expediciones e2 WHERE e2.idplanigrid = pg.id AND e2.estado NOT IN (-3, 9)))
	GROUP BY pg.id, pg.[in-out], ts.tipo_de_carga, pg.propietario, pg.agrupacion, pg.consignacion, pg.agrupacion_referencias, pg.fechaprevista, mas.muelleasign,
	mrs.muellesreserv, tsl.TempRango, pg.prueba, pg.transportista, pg.servicelevel, pg.fechallegada, pp.estado, tr.rango, pg.precinto,
	pg.peligrosidad, pg.fechafinCD) as drva
ORDER BY drva.muelle DESC, drva.h_llegada DESC, drva.fecha_prevista ASC, drva.hora_programada ASC`;

    return this.fetchAll(sqlText, [almacen]);
  }

  async agruparcd(selectedRows, usuario, plataforma = 'Ordenador') {
    const sqlText = `EXEC [dbo].[spAgrupaPreExp]
                @PListOfIDs = ?,
                @usuario = ?,
                @plataforma = ?`;

    let exito = true;
    try {
      await this.query(sqlText, [selectedRows, usuario, plataforma]);
    } catch (err) {
      exito = false;
    }

    if (exito) {
      await this.corregirObservacionAgrupada(selectedRows);
    }

    return exito;
  }

  /**
   * spAgrupaPreExp deja en prueba (la Observación) la concatenación de los
   * pedidos originales, pero sin texto (solo "consignación: " vacío) salvo
   * casualidad, y sujeta al límite de 250 caracteres — así que aquí se
   * recalcula bien. Se listan TODAS las consignaciones agrupadas (tengan o
   * no observación escrita), cada una con su propio texto si lo tiene, para
   * no perder de vista ninguna de las rutas agrupadas. Esto se hace UNA VEZ,
   * justo al agrupar: si después alguien edita la Observación del grupo a
   * mano desde Planificador, esa edición manda y no se vuelve a pisar (a
   * diferencia de recalcularlo cada vez que se lee, que ignoraría cualquier
   * edición posterior).
   */
  async corregirObservacionAgrupada(selectedRows) {
    const padre = await this.fetchOne('SELECT id FROM planigrid WHERE agrupacion = ?', [selectedRows]);

    if (padre === null) {
      return;
    }

    const originales = await this.fetchAll(
      "SELECT consignacion, prueba FROM planigrid WHERE id IN (SELECT value FROM STRING_SPLIT(?, ','))",
      [selectedRows]
    );

    if (originales.length === 0) {
      return;
    }

    const partes = originales.map((fila) => {
      const texto = String(fila.prueba ?? '').trim();
      return `${String(fila.consignacion).trim()}: ${texto}`;
    });

    // La columna prueba es varchar(250); se recorta aquí en Node para no
    // depender de que SQL Server trunque en silencio.
    const observacion = partes.join(', ').slice(0, 250);

    await this.execute('UPDATE planigrid SET prueba = ? WHERE id = ?', [observacion, padre.id]);
  }
}

module.exports = PlanificadorRepository;
