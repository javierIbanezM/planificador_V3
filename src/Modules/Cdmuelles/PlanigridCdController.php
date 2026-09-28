<?php

namespace App\Modules\Cdmuelles;

use App\Config\Database;

final class PlanigridCdController
{
    private PlanigridCdRepository $repository;

    public function __construct()
    {
        $this->repository = new PlanigridCdRepository(Database::connection());
    }

    /** @return array{status:string, message?:string} */
    public function guardarGranel(string $idplanigrid, string $granel, ?string $palets): array
    {
        try {
            $this->repository->guardarGranel(
                $idplanigrid,
                $granel === '1',
                $palets !== null && $palets !== '' ? (int) $palets : null
            );
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /** @return array<int, array{muelle:mixed, color:mixed, empezado:string}> */
    public function mostrarMuelles(string $almacen): array
    {
        return array_map(static function (array $fila): array {
            return [
                'muelle' => $fila['muelle'],
                'color' => $fila['coloresvisorcd'],
                'empezado' => $fila['fechainforme'] !== null ? '*' : '',
            ];
        }, $this->repository->muellesOcupados($almacen));
    }

    /** @return array<int, array{id:mixed, consignacion:mixed, estadocarga:mixed, usuarios:mixed, color:mixed}> */
    public function mostrarTablaOrdenes(string $almacen, string $muelle): array
    {
        return array_map(static function (array $fila): array {
            return [
                'id' => $fila['id'],
                'consignacion' => $fila['consignacion'],
                'estadocarga' => $fila['EstadoCarga'],
                'usuarios' => $fila['OperariosInvolucrados'] ?? '',
                'color' => $fila['color'],
            ];
        }, $this->repository->tablaOrdenes($almacen, $muelle));
    }

    /** @return array{status:string, estado?:mixed, inout?:mixed} */
    public function consultaEstado(string $id): array
    {
        $fila = $this->repository->consultaEstado($id);

        if ($fila === null) {
            return ['status' => 'failure'];
        }

        return ['status' => 'success', 'estado' => $fila['estado'], 'inout' => $fila['inout']];
    }

    /** @return array{status:string} */
    public function cambiaEstado(string $estado, string $id): array
    {
        try {
            $this->repository->cambiaEstado($estado, $id);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'failure'];
        }
    }

    /** @return array<int, array{status:string, message:string}> */
    public function atrasEstadoCdmuelles(string $id, string $descripcion): array
    {
        $this->repository->atrasEstadoCdmuelles($id, $descripcion);

        return [['status' => 'success', 'message' => 'Se ha reseteado el estado']];
    }

    /** @return array<int, array<string, mixed>> */
    public function entrarOrden1(string $id): array
    {
        return array_map(static function (array $fila): array {
            return [
                'inout' => $fila['inout'] === 'IN' ? 'descarga' : 'carga',
                'idplanigrid' => $fila['idplanigrid'],
                'id' => $fila['id'],
                'campohtml' => $fila['campohtml'],
                'tipo' => $fila['tipo'],
                'value' => $fila['value'] ?? '',
                'precintocentralita' => $fila['precintocentralita'] ?? '',
                'rango' => $fila['rango'] ?? '',
                'sonda' => $fila['sonda'] ?? '',
                'seccion' => $fila['seccion'] ?? '',
            ];
        }, $this->repository->entrarOrden1($id));
    }

    /** @return array<int, array<string, mixed>> */
    public function mostrarAlbaranes(string $id): array
    {
        return array_map(static function (array $fila): array {
            return [
                'idplanigrid' => $fila['idplanigrid'],
                'albaran' => $fila['albaran'],
                'bultos' => $fila['bultos'] ?? '',
                'bultoscargados' => $fila['bultoscargados'] ?? '0',
                // El original leía $mostrar['fechafinCD'], una columna que
                // esta consulta nunca selecciona: siempre valía '' en
                // producción. Se conserva el mismo valor por compatibilidad.
                'fechafincd' => '',
                'inout' => $fila['inout'],
                'estadocdmuelles' => $fila['estadocdmuelles'],
            ];
        }, $this->repository->mostrarAlbaranes($id));
    }

    /** @return array<int, array<string, mixed>> */
    public function observaciones(string $id): array
    {
        return array_map(static function (array $fila): array {
            return [
                'id' => $fila['id'],
                'consignación' => $fila['consignación'],
                'manipulado' => $fila['manipulado'] ?? '',
                'referencia' => $fila['referencia'] ?? '',
                'Observación_Planificador' => $fila['Observación_Planificador'] ?? '',
                'matriculatractora' => $fila['matriculatractora'] ?? '',
                'matricularemolque' => $fila['matricularemolque'] ?? '',
                'playa' => $fila['playa'] ?? '',
            ];
        }, $this->repository->observaciones($id));
    }

    /** @return array{status:string} */
    public function finalizarCarga(string $idplanigrid, string $usuario): array
    {
        try {
            $this->repository->finalizarCarga($idplanigrid, $usuario);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error'];
        }
    }
}
