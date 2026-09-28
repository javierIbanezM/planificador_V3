<?php

namespace App\Modules\VisorAlmacen;

use App\Config\Database;

final class VisorAlmacenController
{
    private VisorAlmacenRepository $repository;

    public function __construct()
    {
        $this->repository = new VisorAlmacenRepository(Database::connection());
    }

    public function consigEnLaNave(string $almacen): array
    {
        $filas = $this->repository->consigEnLaNave($almacen);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'id' => $fila['id'],
                'coloresvisorcd' => $fila['coloresvisorcd'],
                'Tcarga' => $fila['Tcarga'],
                'Muelle' => $fila['Muelle'] ?? '',
                'Playa' => $fila['playa'] ?? '',
                'propietario' => $fila['propietario'],
                'consignacion' => $fila['consignacion'],
                'Observaciones' => $fila['Observaciones'] ?? '',
                'transportista' => $fila['transportista'],
                'temperatura' => $fila['temperatura'] ?? 'N/A',
                'precinto' => isset($fila['precinto']) && $fila['precinto'] !== null ? 'SI' : 'N/A',
                'peligrosidad' => $fila['peligrosidad'] ?? '',
                'fechaprevista' => $fila['fechaprevista'],
                'fechallegada' => $fila['fechallegada'],
                'Asign. m' => $fila['Asign. m'] ?? '',
                'T. M. Asig' => $fila['T. M. Asig'],
                'estado' => $fila['estado'],
                'estadocd' => $fila['estadocd'] ?? '',
            ];
        }

        return $data;
    }

    public function consigNoPreparadas(string $almacen): array
    {
        $filas = $this->repository->consigNoPreparadas($almacen);

        return $this->mapConsignacionesSimples($filas);
    }

    public function consigPreparadas(string $almacen): array
    {
        $filas = $this->repository->consigPreparadas($almacen);

        return $this->mapConsignacionesSimples($filas);
    }

    private function mapConsignacionesSimples(array $filas): array
    {
        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'id' => $fila['id'],
                'colores' => $fila['colores'],
                'propietario' => $fila['propietario'],
                'consignacion' => $fila['consignacion'],
                'estado' => $fila['estado'],
                'fecha_prevista' => $fila['fecha_prevista'],
                'hora_programada' => $fila['hora_programada'],
            ];
        }

        return $data;
    }

    public function preavisosSinRecepcionar(string $almacen): array
    {
        $filas = $this->repository->preavisosSinRecepcionar($almacen);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'propietario' => $fila['propietario'],
                'albaran' => $fila['albaran'],
                'ubicacion' => $fila['ubicacion'],
                'fechafinalizado' => $fila['fechafinalizado'],
                'tiemposinrecepcionar' => $fila['tiemposinrecepcionar'],
                'minutossinrecepcionar' => $fila['minutossinrecepcionar'],
                'id' => $fila['id'],
                'colores' => $fila['colores'],
                'estado' => $fila['estado'],
                'bultosdescargados' => $fila['bultosdescargados'] ?? '',
            ];
        }

        return $data;
    }

    public function preavisosPorLlegar(string $almacen): array
    {
        $filas = $this->repository->preavisosPorLlegar($almacen);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'propietario' => $fila['propietario'],
                'albaran' => $fila['albaran'],
                'transportista' => $fila['transportista'],
                'progr' => $fila['Progr'],
                'id' => $fila['id'],
                'colores' => $fila['colores'],
            ];
        }

        return $data;
    }
}
