<?php

namespace App\Modules\Celectronica;

use App\Data\Repository;

/**
 * Firma electrónica ADR (tablet en el muelle). Migrado de
 * celectronica/functions.php: mostrarmuellesADR, mostrarOrdenes, entrafirma
 * y guardarFirma. Las consultas ya usaban parámetros ligados en el
 * original; se mantienen literales.
 */
final class FirmaRepository extends Repository
{
    /** @return array<int, array{muelle:mixed, coloresvisorcd:mixed}> */
    public function muellesPendientesFirma(string $almacen): array
    {
        $sql = "SELECT m.muelle,
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
        ORDER BY m.muelle ASC";

        return $this->fetchAll($sql, [$almacen, $almacen]);
    }

    /** @return array<int, array{id:mixed, consignacion:mixed, peligrosidad:mixed}> */
    public function ordenesPendientesFirma(string $almacen, string $muelle): array
    {
        $sql = "SELECT
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
        AND mas.muelleasign = ?";

        return $this->fetchAll($sql, [$almacen, $muelle]);
    }

    public function datosParaFirma(string $id): ?array
    {
        $sql = "SELECT
        r.conductorDni,
        r.conductorNombre,
        r.conductorApellidos,
        pg.consignacion,
        pg.id
        FROM dbo.planigrid AS pg
        LEFT JOIN dbo.rutas AS r ON r.propietario = pg.propietario
        AND (r.consignacion = pg.consignacion
        OR r.consignacion IN (SELECT ID FROM dbo.SplitString(pg.agrupacion_referencias, ',')))
        WHERE pg.id = ?";

        return $this->fetchOne($sql, [$id]);
    }

    public function registrarFirma(
        string $idplanigrid,
        string $rutaLectura,
        string $fichero,
        string $rutaEscritura
    ): void {
        $sql = "INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Firma de peligrosidad ADR', 'INSERT', 'idplanigrid', ?, SYSDATETIME())
         ";

        $this->execute($sql, [
            $idplanigrid, $rutaLectura, $fichero, 'TabletCentralita', '.png', 'FIRMAIMG', 'FIRMAADR', $rutaEscritura,
            'TabletCentralita', $idplanigrid,
        ]);
    }
}
