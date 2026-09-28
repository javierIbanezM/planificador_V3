<?php

namespace App\Modules\Historico;

use App\Config\Database;

final class HistoricoController
{
    private HistoricoRepository $repository;

    public function __construct()
    {
        $this->repository = new HistoricoRepository(Database::connection());
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function planigrid(string $almacen, bool $todo = false): array
    {
        $filas = $this->repository->planigrid($almacen, $todo);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'in-out' => $fila['in-out'],
                'id' => $fila['id'],
                'Tipo_de_carga' => $fila['Tipo_de_carga'],
                'propietario' => $fila['propietario'],
                'consignacion' => $fila['consignacion'],
                'fecha_prevista' => $fila['fecha_prevista'],
                'muelle' => $fila['muelle'] ?? '',
                'Mreservado' => $fila['Mreservado'] ?? '',
                'Observaciones' => $fila['Observaciones'] ?? '',
                'Transportista' => $fila['Transportista'],
                'OrdenCompra' => $fila['OrdenCompra'] ?? '',
                'rango' => $fila['rango'] ?? '',
                'precinto' => $fila['precinto'] ?? '',
                'hora_programada' => $fila['hora_programada'] ?? '',
                'h_llegada' => $fila['h_llegada'] ?? '',
                'H_Reg_Muelle' => $fila['H.Reg.Muelle'],
                'T_M_Asig' => $fila['T.M. Asig'],
                'h_salida' => $fila['h_salida'],
                'EstadoCarga' => $fila['EstadoCarga'] ?? '',
                'colorestadocarga' => $fila['colorestadocarga'],
            ];
        }

        return $data;
    }
}
