<?php

namespace App\Modules\Cdmuelles;

use App\Data\Repository;

/**
 * Migrado de cdmuelles/functions.php (funcion=cargaralmacenes).
 */
final class AlmacenesRepository extends Repository
{
    /** @return string[] */
    public function activos(): array
    {
        $filas = $this->fetchAll('SELECT almacen FROM almacenes WHERE status = 1');
        return array_map(static fn(array $fila): string => (string) $fila['almacen'], $filas);
    }
}
