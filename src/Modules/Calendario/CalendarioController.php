<?php

namespace App\Modules\Calendario;

use App\Config\Database;
use DateTime;

final class CalendarioController
{
    private CalendarioRepository $repository;

    public function __construct()
    {
        $this->repository = new CalendarioRepository(Database::connection());
    }

    private function mapFilas(array $filas): array
    {
        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'tramoh' => $fila['Tramoh'] ?? null,
                'Dia1' => $fila['Dia1'] ?? '',
                'Dia2' => $fila['Dia2'] ?? '',
                'Dia3' => $fila['Dia3'] ?? '',
                'Dia4' => $fila['Dia4'] ?? '',
                'Dia5' => $fila['Dia5'] ?? '',
                'Dia6' => $fila['Dia6'] ?? '',
                'Dia7' => $fila['Dia7'] ?? '',
            ];
        }

        return $data;
    }

    public function calendarioReal(string $almacen, string $fechaConsultada): array
    {
        $fecha = DateTime::createFromFormat('Y-m-d', $fechaConsultada);
        $filas = $this->repository->calendarioReal($almacen, $fecha !== false ? $fecha->format('Y-m-d') : $fechaConsultada);

        return $this->mapFilas($filas);
    }

    public function calendarioProgramado(string $almacen, string $fechaConsultada): array
    {
        $fecha = DateTime::createFromFormat('Y-m-d', $fechaConsultada);
        $fechaFormateada = $fecha !== false ? $fecha->format('d-m-Y') : $fechaConsultada;
        $filas = $this->repository->calendarioProgramado($almacen, $fechaFormateada);

        return $this->mapFilas($filas);
    }
}
