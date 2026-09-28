<?php

namespace App\Modules\Cdmuelles;

use App\Config\Database;
use App\Config\DeliveryOrderApi;

final class ExpedicionesController
{
    private ExpedicionesRepository $repository;

    public function __construct()
    {
        $this->repository = new ExpedicionesRepository(Database::connection());
    }

    /**
     * Contenedores esperados de un albarán, consultados al API de Whales
     * (deliveryOrder) para verificarlos por escaneo en vez del +/- manual.
     * Se marca cuáles ya están verificados (guardado en planigrid_cdmuelles,
     * compartido entre dispositivos) para que abrir la misma C/D desde otro
     * dispositivo no permita volver a escanear uno ya confirmado.
     *
     * @return array{status:string, containers?: array<int, array{container:string, reference:string, quantity:string, verificado:bool}>, message?:string}
     */
    public function contenedoresAlbaran(string $idplanigrid, string $albaran): array
    {
        $propietario = $this->repository->propietario($idplanigrid, $albaran);

        if ($propietario === null) {
            return ['status' => 'error', 'message' => 'No se encontró la C/D.'];
        }

        try {
            $containers = DeliveryOrderApi::contenedoresDelPedido($propietario, $albaran);

            // Whales devuelve una fila por cada línea de referencia dentro del
            // contenedor (un mismo contenedor/pallet puede llevar varias
            // referencias distintas), no una fila por contenedor físico. Se
            // deduplica aquí por "container" para que un único escaneo se
            // pinte una sola vez, en vez de una vez por línea.
            $containersUnicos = [];
            foreach ($containers as $c) {
                $containersUnicos[$c['container']] ??= $c;
            }
            $containers = array_values($containersUnicos);

            $verificados = array_column($this->repository->contenedoresVerificados($idplanigrid, $albaran), 'contenedor');

            $containers = array_map(static function (array $c) use ($verificados): array {
                $c['verificado'] = in_array($c['container'], $verificados, true);
                return $c;
            }, $containers);

            return ['status' => 'success', 'containers' => $containers];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Solo los contenedores ya verificados de un albarán (sin llamar a
     * Whales) — pensado para refrescar antes de cada escaneo y así detectar
     * lo que haya verificado otro dispositivo, sin el coste de repetir la
     * consulta al API externo cada vez.
     *
     * @return array{status:string, verificados?: string[]}
     */
    public function contenedoresVerificados(string $idplanigrid, string $albaran): array
    {
        $verificados = array_column($this->repository->contenedoresVerificados($idplanigrid, $albaran), 'contenedor');

        return ['status' => 'success', 'verificados' => $verificados];
    }

    /** @return array{status:string, message?:string} */
    public function incrementarBultos(string $idplanigrid, string $albaran, string $usuario, ?string $playa, ?string $contenedor = null): array
    {
        if (!empty($contenedor)) {
            // Doble comprobación en servidor (no solo en el navegador): evita
            // contar dos veces el mismo contenedor si dos dispositivos lo
            // escanean casi a la vez, antes de que a ninguno le diera tiempo
            // a refrescar la lista.
            $yaVerificados = array_column($this->repository->contenedoresVerificados($idplanigrid, $albaran), 'contenedor');
            if (in_array($contenedor, $yaVerificados, true)) {
                return ['status' => 'error', 'message' => 'Ese contenedor ya fue verificado (probablemente desde otro dispositivo).'];
            }
        }

        $reabrirCarga = $this->repository->fechaFinCd($idplanigrid);

        try {
            $this->repository->incrementarBulto($idplanigrid, $albaran, $usuario, $playa !== '' ? $playa : null, $reabrirCarga, $contenedor !== '' ? $contenedor : null);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /** @return array{status:string, message?:string} */
    public function decrementarBultos(string $idplanigrid, string $albaran, string $usuario): array
    {
        $reabrirCarga = $this->repository->fechaFinCd($idplanigrid);

        try {
            $this->repository->decrementarBulto($idplanigrid, $albaran, $usuario, $reabrirCarga);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /** @return array{status:string, message?:string} */
    public function quitarContenedor(string $idplanigrid, string $albaran, string $usuario, string $contenedor): array
    {
        $reabrirCarga = $this->repository->fechaFinCd($idplanigrid);

        try {
            $this->repository->quitarContenedor($idplanigrid, $albaran, $usuario, $contenedor, $reabrirCarga);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /** @return array<int, array{ubicacion: mixed}> */
    public function selectUbicaciones(string $idplanigrid, string $almacen): array
    {
        return $this->repository->ubicaciones($idplanigrid, $almacen);
    }

    /** @return array{resultado:string} */
    public function enviarDatosCdpq(string $id, string $bultos, string $usuario): array
    {
        if ($this->repository->contarExpedicionesSinBultos($id) > 0) {
            return ['resultado' => 'NoCerrado'];
        }

        $totalBultos = $this->repository->totalBultosExpediciones($id);

        if ((string) $totalBultos !== $bultos) {
            $this->repository->logDiscrepanciaPq($usuario, $bultos, $id);
            return ['resultado' => 'Discrepancia'];
        }

        try {
            $this->repository->eliminarBultosPq($id, $usuario);
        } catch (\Throwable $e) {
            return ['resultado' => 'error_delete'];
        }

        foreach ($this->repository->pedidosDistintos($id) as $pedido) {
            $maxBulto = $this->repository->bultosDelPedido($id, $pedido);

            for ($i = 1; $i <= $maxBulto; $i++) {
                try {
                    $this->repository->insertarBultoPq($id, $pedido, $i, $usuario);
                } catch (\Throwable $e) {
                    return ['resultado' => 'error_insert'];
                }
            }
        }

        try {
            $this->repository->finalizarPorPq($id, $usuario);
        } catch (\Throwable $e) {
            return ['resultado' => 'error_log'];
        }

        return ['resultado' => 'correcto'];
    }
}
