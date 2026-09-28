<?php

namespace App\Modules\Shared;

use App\Config\Database;

final class MuellesEstadoController
{
    public function estado(string $almacen): array
    {
        $repository = new MuellesEstadoRepository(Database::connection());
        $filas = $repository->estadoPorAlmacen($almacen);

        $totalOcupados = 0;
        $totalEmpezados = 0;
        $totalFinalizados = 0;
        $resultado = [];

        foreach ($filas as $fila) {
            if ($fila['muelles_ocupados'] !== null) {
                $totalOcupados++;
            }
            if ($fila['empezado'] !== null) {
                $totalEmpezados++;
            }
            if ($fila['finalizado'] !== null) {
                $totalFinalizados++;
            }

            $resultado[] = [
                'muelle' => $fila['muelle'],
                'muelles_ocupados' => $fila['muelles_ocupados'],
                'habilitado' => $fila['habilitado'],
                'coloresvisorcd' => $fila['coloresvisorcd'],
                'empezado' => $fila['empezado'] !== null ? '*' : '',
                'total_muelles_ocupados' => $totalOcupados,
                'total_muelles_empezados' => $totalEmpezados,
                'total_muelles_finalizados' => $totalFinalizados,
                'cdsinmuelle' => $fila['cdsinmuelle'],
            ];
        }

        return $resultado;
    }
}
