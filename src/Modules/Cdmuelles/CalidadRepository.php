<?php

namespace App\Modules\Cdmuelles;

use App\Data\Repository;

/**
 * Quiz de calidad / aprobaciones de encargado del kiosco PDA. Migrado de
 * cdmuelles/functions.php: enviarcheck, logsSondaManual, PinJefeSonda y
 * PinJefe (con sus dos observaciones: permitirdiscrepancia y
 * continuarquiznoaprobado).
 */
final class CalidadRepository extends Repository
{
    /**
     * Comprueba que el pin corresponde a un usuario con rol Encargado.
     * Migrado literal (sin hash, PIN en texto plano) de los bloques
     * repetidos en logsSondaManual/PinJefeSonda/PinJefe del original.
     */
    public function nombreEncargadoPorPin(string $pin): ?string
    {
        $sql = "SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ? AND rol = 'Encargado'";
        $fila = $this->fetchOne($sql, [$pin]);
        return $fila['NombreLargo'] ?? null;
    }

    public function logsSondaManual(string $numSonda, string $pin, string $usuario, string $idplanigrid): void
    {
        $sql = "
        UPDATE planigrid
        SET observacioncdmuellesquizcalidad = 'Se aprueba introducción manual de Sonda ' + ? + ' en Quiz Calidad por: ' +
            (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
            ' Mientras cargaba el operario: ' +
            (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
        WHERE id = ?;

        INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se aprueba introducción manual de Sonda ' + ? + ' en quiz calidad, aprobado por: ' +
                (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?),
                'INSERT', 'idplanigrid', ?, SYSDATETIME());
        ";

        $this->execute($sql, [
            $numSonda, $pin, $usuario, $idplanigrid,
            $usuario, $numSonda, $pin, $idplanigrid,
        ]);
    }

    public function aprobarSondaJefe(string $pin, string $usuario, string $idplanigrid): void
    {
        $sql = "UPDATE planigrid
        SET observacioncdmuellesquizcalidad = 'Se aprueba introducción manual de Sonda en Quiz Calidad por: ' +
            (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
            ' Mientras cargaba el operario: ' +
            (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
        WHERE id = ?;

        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se aprueba introducción manual de Sonda en quiz calidad, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
        ";

        $this->execute($sql, [$pin, $usuario, $idplanigrid, $usuario, $pin, $idplanigrid]);
    }

    public function permitirDiscrepancia(string $pin, string $usuario, string $idplanigrid): void
    {
        $sql = "UPDATE planigrid
        SET observacioncdmuelles = 'Permitida discrepancia por ' +
            (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
            ' Mientras cargaba el operario: ' +
            (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?),
            estadocdmuelles = 6
        WHERE id = ?;

        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se aprueba la carga con discrepancia, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
        ";

        $this->execute($sql, [$pin, $usuario, $idplanigrid, $usuario, $pin, $idplanigrid]);
    }

    public function observacionCdmuellesQuizCalidad(string $idplanigrid): ?string
    {
        $fila = $this->fetchOne(
            'SELECT observacioncdmuellesquizcalidad FROM planigrid WHERE id = ?',
            [$idplanigrid]
        );

        return $fila['observacioncdmuellesquizcalidad'] ?? null;
    }

    /**
     * NOTA DE SEGURIDAD: el original interpolaba $_POST['causas'] (aquí
     * $causasTexto) directamente en el texto del SQL
     * (`'Se aprueba $causasTexto por: ' + ...`) en vez de ligarlo como
     * parámetro — una inyección SQL real vía el campo "causas" del quiz de
     * calidad, del mismo tipo que la auditoría señaló para
     * "$_SESSION[xxx]" interpolado, solo que aquí no se había detectado
     * porque el texto venía de $_POST y no de $_SESSION. Se corrige aquí
     * ligando $causasTexto con "?" igual que el resto de parámetros; ver
     * informe de migración.
     */
    public function continuarQuizNoAprobado(
        string $pin,
        string $usuario,
        string $idplanigrid,
        string $causasTexto
    ): void {
        $sql = "UPDATE planigrid
        SET observacioncdmuellesquizcalidad = 'Se aprueba ' + ? + ' por: ' +
            (SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?) +
            ' Mientras cargaba el operario: ' +
            (SELECT DISTINCT nombrelargo FROM usuarios WHERE nombre = ?)
        WHERE id = ?;

        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se aprueba ' + ? + ' en quiz calidad, aprobado por: '+(SELECT DISTINCT NombreLargo FROM usuarios WHERE pin = ?), 'INSERT', 'idplanigrid', ?, SYSDATETIME());
        ";

        $this->execute($sql, [
            $causasTexto, $pin, $usuario, $idplanigrid,
            $usuario, $causasTexto, $pin, $idplanigrid,
        ]);
    }

    public function contarRespuestasExistentes(string $idplanigrid): int
    {
        $fila = $this->fetchOne(
            'SELECT COUNT(*) AS count FROM planigrid_inf_data WHERE idplanigrid = ?',
            [$idplanigrid]
        );

        return (int) ($fila['count'] ?? 0);
    }

    public function actualizarRespuesta(string $idplanigrid, string $pregunta, ?string $respuesta): void
    {
        $this->execute(
            'UPDATE planigrid_inf_data SET value = ? WHERE idplanigrid = ? AND idinfobjects = ?',
            [$respuesta, $idplanigrid, $pregunta]
        );
    }

    public function incidenciaCheckCalidad(string $idplanigrid): ?int
    {
        $fila = $this->fetchOne(
            'SELECT IncidenciaCheckCalidad FROM planigrid where id = ?',
            [$idplanigrid]
        );

        return isset($fila['IncidenciaCheckCalidad']) ? (int) $fila['IncidenciaCheckCalidad'] : null;
    }

    public function enviarMailRespuestaNo(string $idplanigrid, string $usuario): void
    {
        $sql = "EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'RespuestaNO'
                UPDATE planigrid set IncidenciaCheckCalidad = 1 WHERE id = ?";

        $this->execute($sql, [$idplanigrid, $usuario, $idplanigrid]);
    }

    public function limpiarObservacionQuizCalidad(string $idplanigrid): void
    {
        $this->execute(
            'UPDATE planigrid set observacioncdmuellesquizcalidad = NULL where id = ?',
            [$idplanigrid]
        );
    }

    public function logActualizaCheckCalidad(string $usuario, string $idplanigrid): void
    {
        $sql = "INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se actualiza check de Calidad', 'UPDATE', 'idplanigrid', ?, SYSDATETIME())
        UPDATE planigrid SET fechainforme = SYSDATETIME() WHERE id = ?";

        $this->execute($sql, [$usuario, $idplanigrid, $idplanigrid]);
    }

    public function insertarRespuesta(string $idplanigrid, string $pregunta, ?string $respuesta): void
    {
        $this->execute(
            'INSERT INTO planigrid_inf_data (idplanigrid, idinfobjects, value) VALUES (?, ?, ?)',
            [$idplanigrid, $pregunta, $respuesta]
        );
    }

    public function logInsertaCheckCalidadYActualizaEstado(string $usuario, string $idplanigrid): void
    {
        $sql = "IF (SELECT estadocdmuelles FROM planigrid WHERE id = ?) = 1
        INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se realiza check de Calidad', 'INSERT', 'idplanigrid', ?, SYSDATETIME());

        UPDATE planigrid
        SET estadocdmuelles =
            CASE
                -- Se llama también al actualizar respuestas de un check ya
                -- enviado (CalidadController::enviarCheck, rama de
                -- respuestas ya existentes); si el pedido ya avanzo mas
                -- alla del Quiz, no tocar el estado - solo se avanza la
                -- primera vez.
                WHEN estadocdmuelles <> 1 THEN estadocdmuelles
                WHEN sonda = 1 THEN 8
                -- Salida: datalogger y precinto se piden al final, tras la
                -- foto final (ver UploadsRepository, casos 'FINAL',
                -- 'DATALOGGER' y 'PRECINTO'), nunca aquí.
                WHEN [in-out] = 'OUT' THEN 2
                -- Entrada: si había precinto, ya se pidió número y foto
                -- dentro de este mismo Quiz de Calidad (ver
                -- cdmuelles-calidad.js, fila precinto y su validación en el
                -- envío) — no hace falta un paso Fotografía Precinto
                -- aparte, iría directo a datalogger (si aplica) o a
                -- 'Fotografia Inicial'.
                WHEN datalogger = 1 THEN 10
                ELSE 2
            END,
            fechainforme = CASE WHEN estadocdmuelles = 1 THEN SYSDATETIME() ELSE fechainforme END
        WHERE id = ?";

        $this->execute($sql, [$idplanigrid, $usuario, $idplanigrid, $idplanigrid]);
    }
}
