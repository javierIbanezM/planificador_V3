<?php

namespace App\Modules\Muelles;

use App\Data\Repository;

/**
 * Migrado de Resources/PHP/Modal_Muelles.php (modal de doble-click sobre un
 * muelle en el header). El SQL original ya usaba parámetros ligados.
 */
final class MuellesRepository extends Repository
{
    public function infoMuelle(string $muelle, string $almacen): array
    {
        $sql = "SELECT TOP (100)
        pg.id,
      pg.[in-out] as inout,
        pg.propietario,
        pg.consignacion,
        pg.fechallegada,
        pg.fechasalida,
        mrs.muellesreserv
    FROM [Planificador].[dbo].[planigrid] AS pg
    INNER JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
    LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
    WHERE mas.muelleasign = ? and pg.almacen = ?
    ORDER BY fechallegada desc";

        return $this->fetchAll($sql, [$muelle, $almacen]);
    }

    public function infoMuelleReserva(string $muelle, string $almacen): array
    {
        $sql = "SELECT TOP (100)
        pg.id,
      pg.[in-out] as inout,
        pg.propietario,
        pg.consignacion,
        pg.transportista,
        pg.fechaprevista
    FROM [Planificador].[dbo].[planigrid] AS pg
    LEFT JOIN muellesreservados as mrs ON mrs.idplanigrid = pg.id
    WHERE mrs.muellesreserv = ? and pg.almacen = ? and fechallegada is null and fechasalida is null and pg.eliminado is null
    ORDER BY fechaprevista";

        return $this->fetchAll($sql, [$muelle, $almacen]);
    }

    public function logsMuelle(string $almacen, string $muelle): array
    {
        $sql = "SELECT
        FORMAT(fecha, 'dd-MM-yy HH:mm') as fecha,
        descripcion,
        usuario,
        instruccion
      FROM [Planificador].[dbo].[logs]
      WHERE tiporeferencia = 'ConfigMuelle' and referencia = ?+?";

        return $this->fetchAll($sql, [$almacen, $muelle]);
    }

    public function consultaMuelleActivo(string $muelle, string $almacen): ?array
    {
        return $this->fetchOne('SELECT muelle, habilitado FROM muelles WHERE muelle = ? and almacen = ?', [$muelle, $almacen]);
    }

    public function activarMuelle(string $muelle, string $almacen, string $usuario): bool
    {
        $sql = "UPDATE muelles set habilitado = 1 where muelle = ? and almacen = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se habilita el Muelle: '+?+' desde la página principal'
                                      ,'UPDATE', 'ConfigMuelle', ?+?);";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$muelle, $almacen, $usuario, $muelle, $almacen, $muelle]);
    }

    public function desactivarMuelle(string $muelle, string $almacen, string $usuario): bool
    {
        $sql = "UPDATE muelles set habilitado = 0 where muelle = ? and almacen = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se deshabilita el Muelle: '+?+' desde la página principal'
                                      ,'UPDATE', 'ConfigMuelle', ?+?);";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$muelle, $almacen, $usuario, $muelle, $almacen, $muelle]);
    }
}
