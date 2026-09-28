<?php

namespace App\Modules\Planificador;

use App\Config\Database;

final class PlanificadorController
{
    private PlanificadorRepository $repository;

    public function __construct()
    {
        $this->repository = new PlanificadorRepository(Database::connection());
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function planigrid(string $almacen): array
    {
        $filas = $this->repository->planigrid($almacen);

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
                'hora_programada' => $fila['hora_programada'] ?? '',
                'h_llegada' => $fila['h_llegada'] ?? '',
                'bultos' => $fila['bultos'] ?? '',
                'estado' => $fila['estado'],
                'EstadoCarga' => $fila['EstadoCarga'] ?? '',
                'rango' => $fila['rango'] ?? 'N/A',
                'precinto' => $fila['precinto'] ?? 'N/A',
                'peligrosidad' => $fila['peligrosidad'] ?? '',
                'colorestadocarga' => $fila['colorestadocarga'],
            ];
        }

        return $data;
    }

    /**
     * @return array{status:string, Notificacion:string, Asunto:string, Message:string}
     */
    public function agruparcd(string $selectedRows, string $usuario): array
    {
        $exito = $this->repository->agruparcd($selectedRows, $usuario);

        if ($exito) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Operación exitosa', 'Message' => 'Se agrupó correctamente la selección.'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error', 'Message' => 'Ha habido algún error, contactar con el desarrollador.'];
    }
}
