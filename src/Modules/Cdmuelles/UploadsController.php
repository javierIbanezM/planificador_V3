<?php

namespace App\Modules\Cdmuelles;

use App\Config\AppConfig;
use App\Config\Database;

final class UploadsController
{
    private UploadsRepository $repository;

    public function __construct()
    {
        $this->repository = new UploadsRepository(Database::connection());
    }

    /**
     * Migrado de funcion=up_img. $files es la estructura cruda de
     * $_FILES['image'] (subida múltiple vía <input name="image[]" multiple>).
     *
     * NOTA DE MIGRACIÓN: el original recorría solo
     * `count($files['name']) / 2` ficheros (p.ej. con 2 fotos subidas solo
     * procesaba la primera, con 4 solo procesaba 2) — un bug de división
     * que descartaba silenciosamente entre la mitad y la totalidad de las
     * fotos en subidas múltiples. Aquí se recorren todos los ficheros
     * recibidos; ver informe de migración.
     *
     * @param array{name: array<int,string>, tmp_name: array<int,string>} $files
     * @return array<int, array{status:string, message:string}>
     */
    public function subirImagenes(string $id, string $usuario, string $descripcion, array $files): array
    {
        $fecha = date('Y/m/d');
        [$anio, $mes, $dia] = explode('/', $fecha);
        $mes = str_pad($mes, 2, '0', STR_PAD_LEFT);
        $dia = str_pad($dia, 2, '0', STR_PAD_LEFT);

        $rutaEscritura = AppConfig::uploadsCdmuellesPath() . "$anio/$mes/$dia/";
        $rutaLectura = AppConfig::uploadsCdmuellesAlias() . "$anio/$mes/$dia/";

        if (!is_dir($rutaEscritura)) {
            mkdir($rutaEscritura, 0755, true);
        }

        $response = [];
        $total = count($files['name']);

        for ($i = 0; $i < $total; $i++) {
            $nombreArchivo = $files['name'][$i];
            $extension = pathinfo($nombreArchivo, PATHINFO_EXTENSION);

            $fichero = "IMG_{$id}_" . ($i + 1) . ".$extension";
            $rutaCompleta = $rutaEscritura . $fichero;

            while (file_exists($rutaCompleta)) {
                preg_match('/(\d+)\.(\w+)$/', $fichero, $matches);
                $sufijoActual = ((int) $matches[1]) + 1;
                $fichero = "IMG_{$id}_{$sufijoActual}.$extension";
                $rutaCompleta = $rutaEscritura . $fichero;
            }

            if (!move_uploaded_file($files['tmp_name'][$i], $rutaCompleta)) {
                $response[] = ['status' => 'error', 'message' => "No se pudo guardar el archivo: $nombreArchivo"];
                continue;
            }

            $this->repository->registrarImagen($id, $rutaLectura, $fichero, $usuario, $extension, $descripcion, $rutaEscritura);
            $this->repository->avanzarEstadoTrasFoto($id, $descripcion);

            $response[] = ['status' => 'success', 'message' => "Archivo guardado con éxito: $nombreArchivo"];
        }

        return $response;
    }

    /** @return array<int, array{id:mixed, status:string, rutafichero:mixed, descripcion:mixed}> */
    public function mostrarImagenesOrden(string $id): array
    {
        $filas = $this->repository->imagenesDeOrden($id);
        $status = count($filas) > 0 ? 'SIFOTO' : 'NOFOTO';

        return array_map(static fn(array $fila): array => [
            'id' => $fila['id'],
            'status' => $status,
            'rutafichero' => $fila['rutafichero'],
            'descripcion' => $fila['descripcion'],
        ], $filas);
    }

    /** @return array{status:string, message:string} */
    public function eliminarFoto(string $idfoto, string $usuario, string $idplanigrid): array
    {
        $rutafichero = $this->repository->eliminarFoto($idfoto, $usuario, $idplanigrid);

        if ($rutafichero !== null && @unlink($rutafichero)) {
            return ['status' => 'success', 'message' => 'Archivo eliminado correctamente.'];
        }

        return ['status' => 'failure', 'message' => 'No se pudo eliminar el archivo.'];
    }
}
