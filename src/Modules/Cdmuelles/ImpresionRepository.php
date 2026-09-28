<?php

namespace App\Modules\Cdmuelles;

use App\Data\Repository;

/**
 * Impresoras e impresión de etiquetas del kiosco PDA. Migrado de
 * cdmuelles/functions.php: SelectImpresoras e imprimirinformes.
 */
final class ImpresionRepository extends Repository
{
    /** @return array<int, array{impresora:mixed, descripcion:mixed}> */
    public function impresorasActivas(string $almacen): array
    {
        $sql = 'SELECT impresora, descripcion
                FROM impresoras
                WHERE almacen = ? and activa = 1';

        return $this->fetchAll($sql, [$almacen]);
    }

    public function valorEtiquetaRotulada(string $idplanigrid): ?string
    {
        $sql = 'SELECT
        pid.value
        FROM planigrid_inf_data AS pid
        INNER JOIN informes_objects as ino ON ino.id = idinfobjects
        WHERE idplanigrid = ? and ino.idvariableaccion = 1';

        $fila = $this->fetchOne($sql, [$idplanigrid]);
        return $fila['value'] ?? null;
    }

    public function logImpresion(string $usuario, string $informe, string $impresora, string $idplanigrid): void
    {
        $sql = "INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Enviado Informe: '+?+' a la impresora: '+?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())";

        $this->execute($sql, [$usuario, $informe, $impresora, $idplanigrid]);
    }
}
