<?php

namespace App\Modules\Cdmuelles;

use App\Config\Database;

final class CalidadController
{
    private CalidadRepository $repository;

    public function __construct()
    {
        $this->repository = new CalidadRepository(Database::connection());
    }

    /**
     * Migrado de funcion=logsSondaManual. El original no devolvía
     * respuesta (exit sin salida) cuando el pin no era de un encargado, ni
     * tampoco cuando la operación se completaba: es una llamada
     * "fire-and-forget" desde el cliente (introducirManualSonda no
     * encadena ningún .then a este fetch).
     */
    public function logsSondaManual(string $pin, string $usuario, string $idplanigrid, string $numSonda): void
    {
        if ($this->repository->nombreEncargadoPorPin($pin) === null) {
            return;
        }

        $this->repository->logsSondaManual($numSonda, $pin, $usuario, $idplanigrid);
    }

    /** @return array{status:string, message?:string} */
    public function pinJefeSonda(string $pin, string $usuario, string $idplanigrid): array
    {
        if ($this->repository->nombreEncargadoPorPin($pin) === null) {
            return ['status' => 'NoEncargado'];
        }

        try {
            $this->repository->aprobarSondaJefe($pin, $usuario, $idplanigrid);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /**
     * Migrado de funcion=PinJefe con observacion=permitirdiscrepancia:
     * aprueba finalizar la carga pese a discrepancia de bultos.
     *
     * @return array{status:string, message?:string}
     */
    public function permitirDiscrepancia(string $pin, string $usuario, string $idplanigrid): array
    {
        if ($this->repository->nombreEncargadoPorPin($pin) === null) {
            return ['status' => 'NoEncargado'];
        }

        try {
            $this->repository->permitirDiscrepancia($pin, $usuario, $idplanigrid);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /**
     * Migrado de funcion=PinJefe con observacion=continuarquiznoaprobado:
     * aprueba continuar pese a una respuesta "NO" en el quiz de calidad.
     *
     * @return array{status:string, message?:string}
     */
    public function continuarQuizNoAprobado(
        string $pin,
        string $usuario,
        string $idplanigrid,
        ?string $numSonda,
        string $causas
    ): array {
        if ($this->repository->nombreEncargadoPorPin($pin) === null) {
            return ['status' => 'NoEncargado'];
        }

        $causasTexto = $causas !== '' ? $causas : 'varias razones';
        $observacionExistente = $this->repository->observacionCdmuellesQuizCalidad($idplanigrid) ?? '';

        if ($observacionExistente !== '' && $numSonda !== null && $numSonda !== '') {
            $causasTexto .= ', sonda manual ' . $numSonda;
        }

        try {
            $this->repository->continuarQuizNoAprobado($pin, $usuario, $idplanigrid, $causasTexto);
            return ['status' => 'success'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Error al ejecutar la consulta: ' . $e->getMessage()];
        }
    }

    /**
     * Migrado de funcion=enviarcheck: guarda las respuestas del quiz de
     * calidad (inserta la primera vez, actualiza las siguientes).
     *
     * @param array<int, array{pregunta:string, respuesta:?string}> $preguntasYRespuestas
     * @return array{status:string}
     */
    public function enviarCheck(string $id, string $usuario, array $preguntasYRespuestas): array
    {
        $countRespuestasNo = 0;
        $yaExisten = $this->repository->contarRespuestasExistentes($id) > 0;

        if ($yaExisten) {
            foreach ($preguntasYRespuestas as $respuesta) {
                $pregunta = (string) $respuesta['pregunta'];
                $respuestaValor = $respuesta['respuesta'];

                if ($respuestaValor === 'NO') {
                    $countRespuestasNo++;
                }

                $this->repository->actualizarRespuesta($id, $pregunta, $respuestaValor);

                if ($pregunta == 4 && $respuestaValor === 'NO') {
                    $incidencia = $this->repository->incidenciaCheckCalidad($id);
                    if ($incidencia === 0) {
                        $this->repository->enviarMailRespuestaNo($id, $usuario);
                    }
                }
            }

            if ($countRespuestasNo === 0) {
                $this->repository->limpiarObservacionQuizCalidad($id);
            }

            $this->repository->logActualizaCheckCalidad($usuario, $id);
            // Si el pedido ya tenía respuestas guardadas (p.ej. un reintento)
            // pero seguía en "Quiz de Calidad" sin avanzar, esto lo saca de
            // ahí; si ya había avanzado más allá, no hace nada (ver guarda
            // en la propia consulta).
            $this->repository->logInsertaCheckCalidadYActualizaEstado($usuario, $id);

            return ['status' => 'Actualizado'];
        }

        foreach ($preguntasYRespuestas as $respuesta) {
            $this->repository->insertarRespuesta($id, (string) $respuesta['pregunta'], $respuesta['respuesta']);
        }

        $this->repository->logInsertaCheckCalidadYActualizaEstado($usuario, $id);

        return ['status' => 'Insertado'];
    }
}
