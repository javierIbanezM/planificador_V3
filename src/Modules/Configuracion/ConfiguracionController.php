<?php

namespace App\Modules\Configuracion;

use App\Config\Database;

final class ConfiguracionController
{
    private ConfiguracionRepository $repository;

    public function __construct()
    {
        $this->repository = new ConfiguracionRepository(Database::connection());
    }

    public function crearAlmacen(array $datos, string $usuario): array
    {
        $exito = $this->repository->crearAlmacen(
            (string) ($datos['almacen'] ?? ''),
            (string) ($datos['descripcion'] ?? ''),
            (string) ($datos['direccion'] ?? ''),
            (string) ($datos['cp'] ?? ''),
            (string) ($datos['poblacion'] ?? ''),
            (string) ($datos['pais'] ?? ''),
            (string) ($datos['direccioncarga'] ?? ''),
            $usuario
        );

        return ['status' => $exito ? 'success' : 'error'];
    }

    public function eliminarAlmacen(string $almacen, string $usuario): array
    {
        $exito = $this->repository->eliminarAlmacen($almacen, $usuario);

        return ['status' => $exito ? 'success' : 'error'];
    }

    public function maestroAlmacenes(): array
    {
        $filas = $this->repository->maestroAlmacenes();

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'almacen' => $fila['almacen'] ?? '',
                'descripcion' => $fila['descripcion'] ?? '',
                'direccion' => $fila['direccion'] ?? '',
                'cp' => $fila['cp'] ?? '',
                'poblacion' => $fila['poblacion'] ?? '',
                'pais' => $fila['pais'] ?? '',
                'direccioncarga' => $fila['direccioncarga'] ?? '',
                'status' => $fila['status'] ?? '',
                'eliminable' => $fila['eliminable'] ?? '',
            ];
        }

        return $data;
    }

    public function logsMaestro(string $maestro): array
    {
        $filas = $this->repository->logsMaestro($maestro);

        $data = [];
        foreach ($filas as $fila) {
            $timestamp = is_string($fila['fecha'] ?? null) ? strtotime($fila['fecha']) : false;

            $data[] = [
                'fecha' => $timestamp !== false ? date('d-m-y H:i', $timestamp) : '',
                'descripcion' => $fila['descripcion'] ?? '',
                'usuario' => $fila['usuario'] ?? '',
                'instruccion' => $fila['instruccion'] ?? '',
            ];
        }

        return $data;
    }

    public function maestroVariablesDelSistema(): array
    {
        $filas = $this->repository->maestroVariablesDelSistema();

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'Nombre' => $fila['Nombre'],
                'Descripción' => $fila['Descripción'],
                'Activo' => $fila['Activo'],
                'Valor' => $fila['Valor'] ?? '',
                'Tipo' => $fila['Tipo'] ?? '',
            ];
        }

        return $data;
    }

    public function maestroAutomatizaciones(): array
    {
        $filas = $this->repository->maestroAutomatizaciones();

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'Nombre' => $fila['nombre'],
                'Descripción' => $fila['descripcion'],
                'Activo' => $fila['activo'],
                'Valor' => $fila['valor'] ?? '',
                'Tipo' => $fila['tipo'] ?? '',
            ];
        }

        return $data;
    }
}
