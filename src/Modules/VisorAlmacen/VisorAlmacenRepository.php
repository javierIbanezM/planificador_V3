<?php

namespace App\Modules\VisorAlmacen;

use App\Data\Repository;

/**
 * Migrado de Resources/PHP/Visor de almacén.php. La consulta de
 * 'visordealmacen_consigenlanave' interpolaba '$_SESSION[almacen]'
 * directamente en el SQL, y las de 'visordealmacen_consignopreparadas' /
 * 'visordealmacen_consigpreparadas' interpolaban el almacén dentro del
 * texto de un EXEC; aquí las tres van parametrizadas.
 */
final class VisorAlmacenRepository extends Repository
{
    public function consigEnLaNave(string $almacen): array
    {
        $sql = "SELECT DISTINCT
CASE
WHEN pg.[in-out] = 'OUT' THEN ts.tipo_de_carga
WHEN pg.[in-out] = 'IN' THEN 'Preaviso'
END as 'Tcarga',
pg.[in-out] as 'C/D',
ma.muelleasign as Muelle,
CASE
    WHEN pg.[in-out] = 'OUT' THEN (SELECT dbo.fn_DistinctWords(STRING_AGG(epc.playa, ' ')))
    WHEN pg.[in-out] = 'IN' THEN (SELECT dbo.fn_DistinctWords(
                                        (SELECT STRING_agg(ubicacion, ' ')
                                         FROM [Planificador].[dbo].[planigrid_cdmuelles]
                                         WHERE idplanigrid = pg.id)))
END as playa,

TRIM(pg.propietario) as propietario,
CASE
WHEN pg.[in-out] = 'OUT' THEN pg.consignacion
WHEN pg.agrupacion is not null THEN pg.consignacion
WHEN pg.[in-out] = 'IN' THEN CONCAT('Preaviso: ',pre.albaran)
END as consignacion,
CONVERT(VARCHAR(254),TRIM(pg.prueba)) as Observaciones,
pg.transportista as 'transportista',
ttr.rango as temperatura,
precinto,
pg.peligrosidad ,
CASE
WHEN PG.[in-out] = 'IN' THEN CONVERT(char(5),pg.fechaprevista, 108)
ELSE CONVERT(char(5), MAX(EPC.fechatransporte), 108) END as fechaprevista,
CONVERT(char(5), pg.fechallegada, 108) as fechallegada,
CONVERT(char(5), ma.fecharegistro, 108) as 'Asign. m',
CASE
WHEN ma.fecharegistro is null THEN ''
ELSE CONCAT(SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),1,2),' h ',
			SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),4,2),' m')
END as 'T. M. Asig',
CASE
WHEN pg.[in-out] = 'OUT' THEN pp.estado
WHEN pg.[in-out] = 'IN' THEN 'Preaviso'
END AS estado,
pg.id,
 CONCAT((SELECT
		COUNT(bulto) as bultos
  FROM [Planificador].[dbo].[planigrid_cdmuelles]
  where idplanigrid = pg.id
  GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(epc.bultos))
    as estadocd,
CASE
WHEN pg.estadocdmuelles = 7 THEN 'V'
WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),1,2) >= '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN 'R'
WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),1,2) >= '02' THEN 'R'
WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),1,2) = '01' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),4,2) <= '29' THEN 'N'
WHEN SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),1,2) = '00' and SUBSTRING(CONVERT(varchar, dateadd(second, datediff(second, ma.fecharegistro, GETDATE()), 0), 108),4,2) >= '30' THEN 'A'
ELSE 'B'
END as coloresvisorcd
FROM planigrid as pg
LEFT JOIN muellesasignados as ma ON ma.idplanigrid = pg.id
LEFT join muelles as m ON m.almacen = pg.almacen and m.muelle = ma.muelleasign
INNER JOIN transportistas as ts ON ts.transportista = pg.transportista
LEFT JOIN PorcentajePedidos as pp ON pp.idplanigrid = pg.id
LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id
LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
LEFT JOIN temperaturasrangos as ttr ON ttr.id = pg.idtemprango
WHERE pg.almacen = ? and pg.eliminado is null
AND pg.fechasalida IS NULL
AND pg.fechallegada IS NOT NULL
AND pg.id NOT IN ('129632')
GROUP BY pg.[in-out], ts.tipo_de_carga, ma.muelleasign, pg.propietario, pg.consignacion, pg.prueba, pg.transportista, ma.fecharegistro,
pg.fechallegada, pg.fechaprevista, pp.estado, pg.id, pre.albaran, ttr.rango, pg.precinto, pg.peligrosidad, pg.agrupacion, pg.estadocdmuelles
ORDER BY ma.muelleasign DESC";

        return $this->fetchAll($sql, [$almacen]);
    }

    public function consigNoPreparadas(string $almacen): array
    {
        $sql = "exec spSelectVisorNoPreparadoSaleHoy ?";

        return $this->fetchAll($sql, [$almacen]);
    }

    public function consigPreparadas(string $almacen): array
    {
        $sql = "exec spSelectVisorPreparado ?";

        return $this->fetchAll($sql, [$almacen]);
    }

    public function preavisosSinRecepcionar(string $almacen): array
    {
        $sql = "SELECT
propietario,
albaran,
ubicacion,
fechafinalizado,
tiemposinrecepcionar,
minutossinrecepcionar,
id,
CASE
	WHEN CONVERT(date, fechafinalizado) <> CONVERT(date, sysdatetime()) THEN 'R'
	WHEN minutossinrecepcionar > 700 THEN 'N'
	WHEN minutossinrecepcionar > 360 THEN 'A'
	ELSE 'B'
END as colores,
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
bultosdescargados

FROM(SELECT
		pg.propietario,
		pre.albaran,
		(SELECT dbo.fn_DistinctWords(STRING_AGG(pcd.ubicacion, ' '))) as ubicacion,
		FORMAT(pg.fechafinCD, 'dd-MM-yy hh:mm') as fechafinalizado,
		CAST(DATEDIFF(minute, pg.fechafinCD, SYSDATETIME()) / 60 AS VARCHAR(10)) + ':' +
		RIGHT('0' + CAST(DATEDIFF(minute, pg.fechafinCD, SYSDATETIME()) % 60 AS VARCHAR(2)), 2) As tiemposinrecepcionar,
		DATEDIFF(MINUTE, pg.fechafinCD, SYSDATETIME()) as minutossinrecepcionar,
		pg.id,
		pre.estado,
		COUNT(pcd.bulto) as bultosdescargados
	FROM planigrid as pg
	INNER JOIN preavisos as pre ON pre.idplanigrid = pg.id
	LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = pg.id
	WHERE pg.[in-out] = 'IN' and pre.fechaaccioncierreok is null and pg.eliminado is null and pg.fechasalida is not null
	and pg.almacen = ? and pg.fechafinCD is not null
	AND pre.estado NOT IN ('-3', '5', '2')
	GROUP BY pg.propietario, pre.albaran, pg.fechafinCD, pg.id, pre.estado)a


WHERE ubicacion is not null and fechafinalizado is not null and tiemposinrecepcionar is not null
ORDER BY minutossinrecepcionar DESC";

        return $this->fetchAll($sql, [$almacen]);
    }

    public function preavisosPorLlegar(string $almacen): array
    {
        $sql = "SELECT
pg.propietario,
pre.albaran,
pg.transportista,
FORMAT(pg.fechaprevista, 'HH:mm') Progr,
pg.id,
CASE
	WHEN pg.fechallegada IS not null THEN 'V'
	WHEN DATEDIFF(minute, sysdatetime(), pg.fechaprevista) <=0 THEN 'A'
	ELSE 'B'
END as colores
FROM planigrid as pg
INNER JOIN preavisos as pre ON pre.idplanigrid = pg.id
WHERE CONVERT(date, pg.fechaprevista) = CONVERT(date, sysdatetime()) and pg.almacen = ? and pg.fechafincd is null
ORDER BY FORMAT(pg.fechaprevista, 'HH:mm') asc";

        return $this->fetchAll($sql, [$almacen]);
    }
}
