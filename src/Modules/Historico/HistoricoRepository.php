<?php

namespace App\Modules\Historico;

use App\Data\Repository;

/**
 * Módulo Histórico unificado. El proyecto original tenía dos versiones casi
 * idénticas (Resources/PHP/Histórico.php y Histórico2.php); se usa aquí la
 * consulta de Histórico2.php porque calcula 'consignacion' de forma más
 * completa (contempla pg.agrupacion), y porque el HTML/paginación se toma de
 * Historico.php (Histórico2.php había perdido el menú, la paginación y el
 * footer). Ver informe de migración para más detalle de la decisión.
 *
 * `pg` es la UNION de planigrid + planigrid_H: los registros se archivan a
 * planigrid_H pasado un tiempo (mutuamente excluyentes, nunca están en las
 * dos a la vez) y, al ser este un listado histórico, tiene que poder
 * mostrar también los ya archivados. Las tablas relacionadas (expediciones,
 * preavisos, muelles...) no tienen versión _H, se archiva solo planigrid.
 *
 * Los STRING_AGG llevan CAST(... AS VARCHAR(MAX)): sin él, SQL Server infiere
 * el tipo de salida del tamaño de la columna agregada (ej. VARCHAR(50)) y
 * falla a partir de 8000 bytes acumulados ("El resultado de agregación de
 * STRING_AGG ha superado el límite de 8000 bytes"). Con planigrid_H sumando
 * 120k+ filas de histórico, algún grupo supera ese límite; el CAST a
 * VARCHAR(MAX) lo evita.
 */
final class HistoricoRepository extends Repository
{
    public function planigrid(string $almacen, bool $todo = false): array
    {
        $sql = "SELECT
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
drva.precinto,
drva.rango,
drva.hora_programada,
drva.h_llegada,
drva.[H.Reg.Muelle],
drva.[T.M. Asig],
drva.h_salida,
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
		WHEN pg.agrupacion IS not null THEN pg.consignacion
		WHEN pg.[in-out] = 'OUT' THEN pg.consignacion
		WHEN pg.[in-out] = 'IN' THEN STRING_AGG(CAST(pre.albaran AS VARCHAR(MAX)), ', ')
	END as consignacion,
	FORMAT(pg.fechaprevista, 'dd-MM-yy') as fecha_prevista,
	FORMAT(mas.muelleasign, '00') as muelle,
	FORMAT(mrs.muellesreserv, '00') AS Mreservado,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN CONCAT(ISNULL(tsl.temprango,''), ' ', ISNULL(TRIM(pg.prueba),''), ' ', ISNULL((SELECT dbo.fn_DistinctWords(STRING_AGG(CAST(epc.playa AS VARCHAR(MAX)), ' '))), ''))
		WHEN pg.[in-out] = 'IN' THEN CONCAT(ISNULL(TRIM(pg.prueba), ''), ' ', ISNULL(string_agg(CAST(pre.comentarioalbaran AS VARCHAR(MAX)), ', '),''))
	END as Observaciones,
	ISNULL(pg.transportista,'')+CASE WHEN pg.servicelevel <> '' THEN ' - '+pg.servicelevel ELSE '' END as Transportista,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN ISNULL(STRING_AGG(CAST(epc.Purchase_Order AS VARCHAR(MAX)), ', '),'')+' '+ISNULL(STRING_AGG(CAST(epc.pedido AS VARCHAR(MAX)), ', '),'')
		WHEN pg.[in-out] = 'IN' THEN ISNULL(STRING_AGG(CAST(pre.ordencompra AS VARCHAR(MAX)), ', '),'')+' '+ISNULL(STRING_AGG(CAST(pre.albaran AS VARCHAR(MAX)),', '),'')
	END as OrdenCompra,
	pg.precinto,
	tr.rango,
	CONVERT(char(5), pg.fechaprevista, 108) as hora_programada,
	CONVERT(char(5), pg.fechallegada, 108) as h_llegada,
	FORMAT(mas.fecharegistro, 'HH:mm') as 'H.Reg.Muelle',
	CONVERT(varchar(5), DATEADD(minute, DATEDIFF(minute, mas.fecharegistro, pg.fechasalida), 0), 108)+' h' as 'T.M. Asig',
	FORMAT(pg.fechasalida, 'HH:mm') as h_salida,
	CASE
		WHEN pg.[in-out] = 'OUT' THEN CONCAT((SELECT COUNT(finalizado) FROM EstadoCargaDescarga WHERE idplanigrid = pg.id), '/', (SELECT COUNT(pedido) FROM expediciones WHERE idplanigrid = pg.id))
		WHEN pg.[in-out] = 'IN' THEN CONVERT(varchar(10), (SELECT COUNT(bulto) FROM planigrid_cdmuelles WHERE idplanigrid = pg.id))
	END as EstadoCarga,
	pg.fechafinCD,
	pg.fechasalida
	FROM (
		SELECT * FROM planigrid
		UNION ALL
		SELECT * FROM planigrid_H
	) as pg
	LEFT JOIN transportistas as ts ON ts.transportista = pg.transportista
	LEFT JOIN transportistasServiceLevel as tsl ON ts.transportista = tsl.transportista and tsl.servicelevel = pg.servicelevel
	LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id
	LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
	LEFT JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
	LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
	LEFT JOIN PorcentajePedidos as pp ON pp.idplanigrid = pg.id
	LEFT JOIN temperaturasrangos as tr ON tr.id = pg.idtemprango
	WHERE pg.fechasalida IS NOT NULL AND pg.almacen = ? and pg.eliminado is null
	GROUP BY pg.id, pg.[in-out], ts.tipo_de_carga, pg.propietario, pg.agrupacion, pg.consignacion,  pg.fechaprevista, mas.muelleasign,
	mrs.muellesreserv, tsl.TempRango, pg.prueba, pg.transportista, pg.servicelevel, pg.fechallegada, pp.estado, tr.rango, pg.precinto,
	pg.fechafinCD, mas.fecharegistro, pg.fechasalida) as drva
WHERE (? = 1 OR DATEDIFF(day, drva.fechasalida, SYSDATETIME()) < 90)
ORDER BY drva.fechasalida DESC";

        return $this->fetchAll($sql, [$almacen, $todo ? 1 : 0]);
    }
}
