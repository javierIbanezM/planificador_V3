<?php

namespace App\Modules\Consignacion;

use App\Config\AppConfig;
use App\Config\Database;

/**
 * Migrado de Resources/PHP/Modal_Consignacion.php (modal de doble-click sobre
 * una fila de Planificador/Histórico/Calendario). Cada acción del dispatcher
 * original ($_POST['funcion']) pasa a ser un método público de este
 * controlador, invocado desde public/api/consignacion.php.
 */
final class ConsignacionController
{
    private ConsignacionRepository $repository;

    public function __construct()
    {
        $this->repository = new ConsignacionRepository(Database::connection());
    }

    private function formatFecha(mixed $valor): string
    {
        if ($valor === null || $valor === '') {
            return '';
        }

        $timestamp = is_string($valor) ? strtotime($valor) : false;

        return $timestamp !== false ? date('d-m-y H:i', $timestamp) : '';
    }

    public function alertamail(string $usuario, string $idplanigrid): array
    {
        $fila = $this->repository->alertamail($usuario, $idplanigrid);

        if ($fila === null) {
            return ['status' => 'error'];
        }

        return ['status' => 'success', 'resultado' => (int) $fila['resultado']];
    }

    public function cabecera(string $idplanigrid): array
    {
        $filas = $this->repository->cabecera($idplanigrid);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'inout' => $fila['INOUT'],
                'id' => $idplanigrid,
                'muelle' => ($fila['muelleasign'] !== '0' && $fila['muelleasign'] !== null) ? $fila['muelleasign'] : '',
                'muellereserv' => ($fila['muellesreserv'] !== '0' && $fila['muellesreserv'] !== null) ? $fila['muellesreserv'] : '',
                'prueba' => $fila['prueba'] ?? '',
                'horaprogramada' => $this->formatFecha($fila['horaprogramada']),
                'fechallegada' => $this->formatFecha($fila['fechallegada']),
                'fechasalida' => $this->formatFecha($fila['fechasalida']),
                'precinto' => $fila['precinto'] ?? '',
                'bultos' => $fila['bultos'] ?? '',
                'estadocdmuelles' => $fila['estadocdmuelles'] ?? '',
                'sonda' => $fila['sonda'] ?? null,
                'datalogger' => $fila['datalogger'] ?? null,
            ];
        }

        return $data;
    }

    public function datos(string $idplanigrid): array
    {
        $filas = $this->repository->datos($idplanigrid);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'idplanigrid' => $idplanigrid,
                'id' => $fila['id'],
                'propietario' => $fila['propietario'],
                'pedido' => $fila['pedido'],
                'consignacion' => $fila['consignacion'],
                'transportista' => $fila['transportista'],
                'estado' => $fila['estado'],
                'peligrosidad' => $fila['peligrosidad'] ?? '',
                'playa' => $fila['playa'] ?? '',
                'bultos' => $fila['bultos'] ?? '',
            ];
        }

        return $data;
    }

    public function datosQuizCalidad(string $idplanigrid): array
    {
        $filas = $this->repository->datosQuizCalidad($idplanigrid);

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'inout' => $fila['inout'] === 'IN' ? 'descarga' : 'carga',
                'idplanigrid' => $fila['idplanigrid'],
                'id' => $fila['id'],
                'campohtml' => $fila['campohtml'],
                'tipo' => $fila['tipo'],
                'value' => $fila['value'] ?? 'Campo Vacío',
                'precintocentralita' => $fila['precintocentralita'] ?? '',
                'rango' => $fila['rango'] ?? '',
                'sonda' => $fila['sonda'] ?? '',
                'seccion' => $fila['seccion'] ?? '',
            ];
        }

        return $data;
    }

    public function selectTempRango(string $idplanigrid): array
    {
        return $this->repository->selectTempRango($idplanigrid);
    }

    public function logs(string $idplanigrid): ?array
    {
        $filas = $this->repository->logs($idplanigrid);

        if ($filas === []) {
            return null;
        }

        $data = [];
        foreach ($filas as $fila) {
            $data[] = [
                'id' => $fila['id'],
                'fecha' => $this->formatFecha($fila['fecha']),
                'usuario' => $fila['usuario'],
                'descripcion' => $fila['descripcion'],
                'instruccion' => $fila['instruccion'],
            ];
        }

        return $data;
    }

    public function eliminarFoto(string $idfoto, string $usuario, string $idplanigrid): array
    {
        $fila = $this->repository->fotoRuta($idfoto);

        if ($fila === null || empty($fila['rutafichero'])) {
            return ['status' => 'failure', 'message' => 'No se pudo eliminar el archivo.'];
        }

        $this->repository->eliminarFoto($idfoto, $usuario, $idplanigrid);

        if (is_file($fila['rutafichero']) && unlink($fila['rutafichero'])) {
            return ['status' => 'success', 'message' => 'Archivo eliminado correctamente.'];
        }

        return ['status' => 'failure', 'message' => 'No se pudo eliminar el archivo.'];
    }

    public function desactivarAlertaMail(string $usuario, string $idplanigrid): array
    {
        $correo = $this->repository->correoUsuario($usuario);

        if ($correo === null) {
            return ['status' => 'error', 'Message' => 'No se encontró el correo del usuario'];
        }

        if ($this->repository->desactivarAlertaMail($correo, $idplanigrid)) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Alerta de eventos desactivada', 'Message' => 'Se desactivó la alerta de eventos para el usuario actual'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Desactivar', 'Message' => 'Error al desactivar la alerta de eventos'];
    }

    public function activarAlertaMail(string $usuario, string $idplanigrid): array
    {
        if ($this->repository->activarAlertaMail($usuario, $idplanigrid)) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Alerta de eventos activada', 'Message' => 'Se activó la alerta de eventos para el usuario actual'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Activar', 'Message' => 'Error al activar la alerta de eventos'];
    }

    public function desagruparCd(string $idplanigrid, string $usuario): array
    {
        if ($this->repository->desagruparCd($idplanigrid, $usuario)) {
            return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Operación exitosa', 'Message' => 'Se desagrupó correctamente la selección.'];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error', 'Message' => 'No se pudo desagrupar: la C/D seleccionada no es una agrupación válida, o contactar con el desarrollador.'];
    }

    /**
     * En el original, EliminarCD y EliminarDatosCD construían un $sql = "" y
     * ejecutaban sqlsrv_query con él: la consulta vacía nunca puede tener
     * éxito, así que en la práctica ambas acciones eran no-op que siempre
     * devolvían la rama de error. Se preserva ese comportamiento (siempre
     * "activa alerta"... el mensaje original también era incoherente con el
     * nombre de la acción) sin intentar ejecutar una sentencia SQL vacía.
     */
    public function eliminarCd(): array
    {
        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Activar', 'Message' => 'Error al activar la alerta de eventos'];
    }

    public function eliminarDatosCd(): array
    {
        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Activar', 'Message' => 'Error al activar la alerta de eventos'];
    }

    public function cambiarSonda(string $idplanigrid, string $estado, string $usuario): array
    {
        $activar = $estado === 'activado';

        if ($this->repository->cambiarSonda($idplanigrid, $activar, $usuario)) {
            return [
                'status' => 'success',
                'Notificacion' => 'correcto',
                'Asunto' => $activar ? 'Sonda en C/D Activada' : 'Sonda en C/D Desactivada',
                'Message' => $activar ? 'Se activó la sonda en la C/D' : 'Se desactivó la sonda en la C/D',
            ];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Cambiar Estado', 'Message' => 'Error al cambiar el estado de la sonda en la C/D'];
    }

    public function cambiarDatalogger(string $idplanigrid, string $estado, string $usuario): array
    {
        $activar = $estado === 'activado';

        if ($this->repository->cambiarDatalogger($idplanigrid, $activar, $usuario)) {
            return [
                'status' => 'success',
                'Notificacion' => 'correcto',
                'Asunto' => $activar ? 'Datalogger en C/D Activado' : 'Datalogger en C/D Desactivado',
                'Message' => $activar ? 'Se activó el datalogger en la C/D' : 'Se desactivó el datalogger en la C/D',
            ];
        }

        return ['status' => 'error', 'Notificacion' => 'error', 'Asunto' => 'Error al Cambiar Estado', 'Message' => 'Error al cambiar el estado del datalogger en la C/D'];
    }

    public function eliminarMuelleAsignado(string $idplanigrid, string $usuario): array
    {
        $actual = $this->repository->muelleAsignado($idplanigrid);
        $muelleAnterior = $actual['muelleasign'] ?? null;

        if ($this->repository->eliminarMuelleAsignado($idplanigrid, $usuario, $muelleAnterior)) {
            return ['status' => 'success'];
        }

        return ['status' => 'error'];
    }

    public function cambiarTempRango(?string $temprango, string $idplanigrid, string $usuario, string $textoSeleccionado): array
    {
        $actual = $this->repository->rangoActual($idplanigrid);
        $rangoAnterior = $actual['rango'] ?? 'Sin Temperatura';

        $this->repository->cambiarTempRango($temprango, $idplanigrid, $usuario, $rangoAnterior, $textoSeleccionado);

        return ['status' => 'success'];
    }

    public function desasignarSalida(string $idplanigrid, string $usuario): array
    {
        $actual = $this->repository->fechaSalida($idplanigrid);
        $fechaAnterior = $actual['fechasalida'] ?? null;

        if ($this->repository->desasignarSalida($idplanigrid, $usuario, $fechaAnterior)) {
            return ['status' => 'success'];
        }

        return ['status' => 'Error', 'Asunto' => 'No se ejecutó correctamente la tarea', 'Message' => 'Ha habido un error, actualice y vuelva a ejecutar su acción.'];
    }

    public function asignarSalida(string $idplanigrid, string $usuario): array
    {
        $result = $this->repository->estadoParaAsignarSalida($idplanigrid);

        if ($result === null) {
            return ['status' => 'Error', 'Asunto' => 'No se ejecutó correctamente la tarea', 'Message' => 'Ha habido un error, actualice y vuelva a ejecutar su acción.'];
        }

        if (($result['peligrosidad'] ?? null) === 'ADR' && ($result['fechafirmapeligrosidad'] ?? null) === null && ($result['inout'] ?? null) === 'OUT') {
            return ['status' => 'Error', 'Notificacion' => 'error', 'Asunto' => 'Falta Firma de chófer ADR', 'Message' => 'No está firmado el documento de ADR por parte del chófer.'];
        }

        // Estados terminales reales de estadocdmuelles (ver
        // UploadsRepository::avanzarEstadoTrasFoto): 7 = Finalizada (sin
        // sonda/precinto/datalogger), 9 = con precinto, 10 = con
        // datalogger. El 8 (Fotografía Sonda) nunca es terminal. El chequeo
        // original comparaba contra MIN(orden)/MAX(orden) de TODA la tabla
        // estados_cdmuelles (1 y 10), rechazando en la práctica cualquier
        // C/D realmente finalizada sin datalogger (estado 7 o 9).
        if (in_array($result['estadocdmuelles'], [7, 9, 10], false)) {
            if ($this->repository->asignarSalida($idplanigrid, $usuario)) {
                return ['status' => 'success', 'Notificacion' => 'correcto', 'Asunto' => 'Operación exitosa', 'Message' => 'La salida se asignó correctamente.'];
            }

            return ['status' => 'Error', 'Notificacion' => 'error', 'Asunto' => 'No se ejecutó correctamente la tarea', 'Message' => 'Ha habido un error, actualice y vuelva a ejecutar su acción.'];
        }

        return ['status' => 'Error', 'Notificacion' => 'error', 'Asunto' => 'Error estado C/D no finalizado', 'Message' => 'El estado de la C/D está iniciada y NO finalizada'];
    }

    public function desasignarLlegada(string $idplanigrid, string $usuario): array
    {
        $actual = $this->repository->fechaLlegada($idplanigrid);
        $fechaAnterior = $actual['fechallegada'] ?? null;

        if ($this->repository->desasignarLlegada($idplanigrid, $usuario, $fechaAnterior)) {
            return ['status' => 'success'];
        }

        return ['status' => 'error'];
    }

    public function asignarLlegada(string $idplanigrid, string $usuario): array
    {
        if ($this->repository->asignarLlegada($idplanigrid, $usuario)) {
            return ['status' => 'success'];
        }

        return ['status' => 'error', 'message' => 'Error al ejecutar la consulta'];
    }

    /**
     * @param array{precinto?:string, observacion?:string, hLlegada?:string, hSalida?:string, muelle?:string, muelleReservado?:string} $datos
     */
    public function guardarCabecera(array $datos, string $idplanigrid, string $usuario, string $almacen): array
    {
        $precinto = !empty($datos['precinto']) ? $datos['precinto'] : null;
        $observacion = !empty($datos['observacion']) ? $datos['observacion'] : null;
        $hLlegada = $datos['hLlegada'] ?? '';
        $hSalida = $datos['hSalida'] ?? '';
        $muelle = $datos['muelle'] ?? '';
        $muelleReservado = $datos['muelleReservado'] ?? '';

        $valorOriginal = $this->repository->valoresCabeceraOriginal($idplanigrid);
        if ($valorOriginal === null) {
            return ['status' => 'error', 'Error' => 'No se encontró la C/D'];
        }

        $sets = [];
        $params = [];
        $descripciones = [];

        $fechaLlegadaOriginal = $this->formatFecha($valorOriginal['fechallegada']);
        $fechaSalidaOriginal = $this->formatFecha($valorOriginal['fechasalida']);

        if ($hLlegada !== '' && strtotime($hLlegada) !== false && $fechaLlegadaOriginal !== $hLlegada) {
            $sets[] = 'fechallegada = ?';
            $params[] = $hLlegada;
            $descripciones[] = 'Llegada Nuevo: "' . $hLlegada . '", Anterior: "' . $fechaLlegadaOriginal . '"';
        }

        if ($hSalida !== '' && strtotime($hSalida) !== false && $fechaSalidaOriginal !== $hSalida) {
            $sets[] = 'fechasalida = ?';
            $params[] = $hSalida;
            $descripciones[] = 'Salida Nuevo: "' . $hSalida . '", Anterior: "' . $fechaSalidaOriginal . '"';
        }

        if (($valorOriginal['prueba'] ?? '') != $observacion) {
            $sets[] = 'prueba = ?';
            $params[] = $observacion;
            $descripciones[] = 'Observación Nuevo: "' . $observacion . '", Anterior: "' . ($valorOriginal['prueba'] ?? '') . '"';
        }

        if (($valorOriginal['precinto'] ?? '') != $precinto) {
            $sets[] = 'precinto = ?';
            $params[] = $precinto;
            $descripciones[] = 'Precinto Nuevo: "' . $precinto . '", Anterior: "' . ($valorOriginal['precinto'] ?? '') . '"';
        }

        if ($sets !== []) {
            $sql = 'UPDATE planigrid SET ' . implode(', ', $sets) . ' WHERE id = ?';
            $params[] = $idplanigrid;
            $this->repository->actualizarCabecera($sql, $params);
        }

        $error = null;

        // Muelle asignado
        if ($hLlegada !== '' && strtotime($hLlegada) !== false && $muelle != ($valorOriginal['muelleasign'] ?? null)) {
            if ($muelle !== '') {
                $muelleFila = $this->repository->muelleHabilitado($almacen, $muelle);

                if (($muelleFila['habilitado'] ?? false)) {
                    $permitido = $this->repository->muellePermitidoRangoTemp($valorOriginal['idtemprango'] ?? null, $muelle);

                    if (!empty($permitido['idmuelle'] ?? null)) {
                        if ($muelle != ($valorOriginal['muelleasign'] ?? null) && !empty($valorOriginal['muelleasign'] ?? null)) {
                            $this->repository->actualizarMuelleAsignado($muelle, $idplanigrid);
                            $descripciones[] = 'Muelle Nuevo: "' . $muelle . '", Anterior: "' . $valorOriginal['muelleasign'] . '"';
                        } else {
                            $this->repository->insertarMuelleAsignado($muelle, $idplanigrid);
                            $descripciones[] = 'Muelle Nuevo: "' . $muelle . '", Anterior: ""';
                        }
                    } else {
                        $error = 'Muelle no permitido para el rango de temperatura';
                    }
                } else {
                    $error = 'Muelle no habilitado para asignar C/D';
                }
            } else {
                $this->repository->eliminarMuellesAsignadosPorIdplanigrid($idplanigrid);
                $descripciones[] = 'Muelle vacío';
            }
        }

        // Muelle reservado
        if ($error === null && $muelleReservado != ($valorOriginal['muellesreserv'] ?? null)) {
            if ($muelleReservado !== '') {
                $muelleReservadoFila = $this->repository->muelleHabilitado($almacen, $muelleReservado);

                if ($muelleReservadoFila['habilitado'] ?? false) {
                    if (!empty($valorOriginal['muellesreserv'] ?? null)) {
                        $this->repository->actualizarMuelleReservado($muelleReservado, $idplanigrid);
                        $descripciones[] = 'Muelle Reservado Nuevo: "' . $muelleReservado . '", Anterior: "' . $valorOriginal['muellesreserv'] . '"';
                    } else {
                        $this->repository->insertarMuelleReservado($muelleReservado, $idplanigrid);
                        $descripciones[] = 'Muelle Reservado Nuevo: "' . $muelleReservado . '", Anterior: ""';
                    }
                } else {
                    $error = 'Muelle no habilitado para reservar C/D';
                }
            } else {
                $this->repository->eliminarMuelleReservado($idplanigrid);
                $descripciones[] = 'Muelle Reservado vacío';
            }
        }

        if ($error !== null) {
            return ['status' => 'Error', 'Error' => $error];
        }

        if ($descripciones !== []) {
            $this->repository->registrarCambioLog($usuario, implode(', ', $descripciones), 'UPDATE', 'idplanigrid', $idplanigrid);
        }

        return ['status' => 'success'];
    }

    public function informeCargaDescarga(string $idplanigrid): array
    {
        $fila = $this->repository->informeCargaDescarga($idplanigrid);

        if ($fila === null || $fila['in-out'] === null) {
            return ['cargadescarga' => 'NULL'];
        }

        $ruta = \App\Modules\Informes\InformeRouteResolver::resolver($fila['informe'], (string) $fila['versioninforme']);

        return [
            'cargadescarga' => $fila['in-out'],
            'ruta' => $ruta,
        ];
    }

    public function galeria(string $idplanigrid): array
    {
        $filas = $this->repository->galeria($idplanigrid);

        if ($filas === []) {
            return ['status' => 'no_images', 'message' => 'No se encontraron imágenes'];
        }

        $images = [];
        foreach ($filas as $fila) {
            $images[] = [
                'rutafichero' => AppConfig::uploadsHost() . $fila['rutafichero'],
                'extension' => $fila['extension'],
                'descripcion' => $fila['descripcion'],
                'id' => $fila['id'],
            ];
        }

        return ['status' => 'success', 'images' => $images];
    }

    /**
     * Migrado de Resources/PHP/comunes.php (funcion=up_img_ofi). En el
     * original vivía en comunes.php aunque solo lo usaba la galería del
     * modal de consignación; aquí queda junto al resto de acciones del modal.
     *
     * @param array<string, mixed> $files Estructura equivalente a $_FILES['image']
     * @return array<int, array<string, string>>
     */
    public function subirImagenes(array $files, string $idplanigrid, string $usuario, string $descripcion): array
    {
        $fecha = date('Y/m/d');
        [$anio, $mes, $dia] = explode('/', $fecha);
        $mes = str_pad($mes, 2, '0', STR_PAD_LEFT);
        $dia = str_pad($dia, 2, '0', STR_PAD_LEFT);

        $rutaEscritura = AppConfig::uploadsCdmuellesPath() . "$anio/$mes/$dia/";
        $rutaLectura = "cdmuelles/uploads/$anio/$mes/$dia/";

        if (!is_dir($rutaEscritura)) {
            mkdir($rutaEscritura, 0755, true);
        }

        $response = [];
        $total = count($files['name']);

        for ($i = 0; $i < $total; $i++) {
            $nombreArchivo = $files['name'][$i];
            $extension = pathinfo($nombreArchivo, PATHINFO_EXTENSION);

            $fichero = "IMG_{$idplanigrid}_" . ($i + 1) . ".$extension";
            $rutaCompleta = $rutaEscritura . $fichero;

            $sufijo = $i + 1;
            while (is_file($rutaCompleta)) {
                $sufijo++;
                $fichero = "IMG_{$idplanigrid}_{$sufijo}.$extension";
                $rutaCompleta = $rutaEscritura . $fichero;
            }

            move_uploaded_file($files['tmp_name'][$i], $rutaCompleta);

            $this->repository->insertarSubidaImagen($idplanigrid, $rutaLectura, $fichero, $usuario, $extension, 'IMG', $descripcion, $rutaEscritura);

            switch ($descripcion) {
                case 'INICIAL':
                case 'TRANSCURSO':
                    $this->repository->actualizarEstadoCdMuellesPorSubida($idplanigrid, 3);
                    break;
                case 'FINAL':
                    $this->repository->actualizarEstadoCdMuellesPorSubida($idplanigrid, 7, true);
                    break;
            }

            $response[] = ['status' => 'success', 'message' => "Archivo guardado con éxito: $nombreArchivo"];
        }

        return $response;
    }
}
