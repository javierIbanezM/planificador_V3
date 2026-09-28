<?php

namespace App\Modules\Muelles;

use App\Config\Database;

final class MuellesController
{
    private MuellesRepository $repository;

    public function __construct()
    {
        $this->repository = new MuellesRepository(Database::connection());
    }

    private function formatFecha(mixed $valor): string
    {
        if ($valor === null || $valor === '') {
            return '';
        }

        $timestamp = is_string($valor) ? strtotime($valor) : false;

        return $timestamp !== false ? date('d-m-y H:i', $timestamp) : '';
    }

    public function infoMuelle(string $muelle, string $almacen): array
    {
        $filas = $this->repository->infoMuelle($muelle, $almacen);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'id' => $fila['id'],
                'inout' => $fila['inout'],
                'propietario' => $fila['propietario'],
                'consignacion' => $fila['consignacion'],
                'fechallegada' => $this->formatFecha($fila['fechallegada']),
                'fechasalida' => $this->formatFecha($fila['fechasalida']),
                'muellereserv' => $fila['muellesreserv'] ?? '',
            ];
        }

        return $data;
    }

    public function infoMuelleReserva(string $muelle, string $almacen): array
    {
        $filas = $this->repository->infoMuelleReserva($muelle, $almacen);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'id' => $fila['id'],
                'inout' => $fila['inout'],
                'propietario' => $fila['propietario'],
                'consignacion' => $fila['consignacion'],
                'transportista' => $fila['transportista'],
                'fechaprevista' => $this->formatFecha($fila['fechaprevista']),
            ];
        }

        return $data;
    }

    public function logsMuelle(string $almacen, string $muelle): array
    {
        return $this->repository->logsMuelle($almacen, $muelle);
    }

    public function consultaMuelleActivo(string $muelle, string $almacen): array
    {
        $fila = $this->repository->consultaMuelleActivo($muelle, $almacen);

        if ($fila === null) {
            return [];
        }

        return ['muelle' => $fila['muelle'], 'habilitado' => $fila['habilitado']];
    }

    public function activarMuelle(string $muelle, string $almacen, string $usuario): array
    {
        if ($this->repository->activarMuelle($muelle, $almacen, $usuario)) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Operación exitosa', 'Message' => 'Se habilitó el muelle correctamente.'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error en la Operación', 'Message' => 'Ha habido un error en habilitar el muelle.'];
    }

    public function desactivarMuelle(string $muelle, string $almacen, string $usuario): array
    {
        if ($this->repository->desactivarMuelle($muelle, $almacen, $usuario)) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Operación exitosa', 'Message' => 'Se deshabilitó el muelle correctamente.'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error en la Operación', 'Message' => 'Ha habido un error en deshabilitar el muelle.'];
    }
}
