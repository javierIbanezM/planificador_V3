<?php

namespace App\Modules\Celectronica;

use App\Config\AppConfig;
use App\Config\Database;

final class FirmaController
{
    private FirmaRepository $repository;

    public function __construct()
    {
        $this->repository = new FirmaRepository(Database::connection());
    }

    /** @return array<int, array{muelle:mixed, color:mixed}> */
    public function mostrarMuellesAdr(string $almacen): array
    {
        return array_map(static function (array $fila): array {
            return ['muelle' => $fila['muelle'], 'color' => $fila['coloresvisorcd']];
        }, $this->repository->muellesPendientesFirma($almacen));
    }

    /** @return array<int, array{id:mixed, consignacion:mixed, peligrosidad:mixed}> */
    public function mostrarOrdenes(string $almacen, string $muelle): array
    {
        return $this->repository->ordenesPendientesFirma($almacen, $muelle);
    }

    /**
     * Migrado de funcion=entrafirma: carga los datos del conductor/orden en
     * sesión para que firma.php los muestre en la página siguiente.
     *
     * @return array{status:string, message?:string}
     */
    public function entrarFirma(string $id): array
    {
        $datos = $this->repository->datosParaFirma($id);

        if ($datos === null) {
            return ['status' => 'error', 'message' => 'No se encontraron datos'];
        }

        $_SESSION['conductorDni'] = $datos['conductorDni'];
        $_SESSION['conductorNombre'] = $datos['conductorNombre'];
        $_SESSION['conductorApellidos'] = $datos['conductorApellidos'];
        $_SESSION['consignacion'] = $datos['consignacion'];
        $_SESSION['idplanigrid'] = $datos['id'];

        return ['status' => 'success'];
    }

    /**
     * Migrado de funcion=guardarFirma: decodifica el PNG base64 del pad de
     * firma y lo guarda bajo AppConfig::uploadsFirmasPath(), igual que el
     * original guardaba bajo $ruta_upload_firmas.
     *
     * @return array{status:string, message?:string, ruta?:string}
     */
    public function guardarFirma(string $firmaBase64): array
    {
        if (!isset($_SESSION['idplanigrid'])) {
            return ['status' => 'error', 'message' => 'No hay una orden seleccionada para firmar'];
        }

        $firmaBase64 = str_replace('data:image/png;base64,', '', $firmaBase64);
        $firmaBase64 = str_replace(' ', '+', $firmaBase64);
        $firmaData = base64_decode($firmaBase64);

        $fecha = date('Y/m/d');
        [$anio, $mes, $dia] = explode('/', $fecha);
        $mes = str_pad($mes, 2, '0', STR_PAD_LEFT);
        $dia = str_pad($dia, 2, '0', STR_PAD_LEFT);

        $rutaEscritura = AppConfig::uploadsFirmasPath() . "$anio/$mes/$dia/";
        $rutaLectura = AppConfig::uploadsFirmasAlias() . "$anio/$mes/$dia/";

        if (!is_dir($rutaEscritura)) {
            mkdir($rutaEscritura, 0755, true);
        }

        $idplanigrid = (string) $_SESSION['idplanigrid'];
        $fichero = 'FirmaPeligrosidad_' . $idplanigrid . '.png';
        $rutaCompleta = $rutaEscritura . $fichero;

        if (file_put_contents($rutaCompleta, $firmaData) === false) {
            return ['status' => 'error', 'message' => 'No se pudo guardar la firma en el servidor'];
        }

        try {
            $this->repository->registrarFirma($idplanigrid, $rutaLectura, $fichero, $rutaEscritura);
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'No se pudo guardar la firma en el servidor'];
        }

        return ['status' => 'success', 'ruta' => $rutaCompleta];
    }
}
