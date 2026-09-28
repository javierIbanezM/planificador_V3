<?php

namespace App\Modules\Cdmuelles;

use App\Data\Repository;

/**
 * Fotos y fichas subidas desde el kiosco PDA. Migrado de
 * cdmuelles/functions.php: up_img, mostrarimagenesorden y eliminarFoto.
 */
final class UploadsRepository extends Repository
{
    public function registrarImagen(
        string $idplanigrid,
        string $rutaLectura,
        string $fichero,
        string $usuario,
        string $extension,
        string $descripcion,
        string $rutaEscritura
    ): void {
        $sql = "INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Subida de imagen '+?+'', 'INSERT', 'idplanigrid', ?, SYSDATETIME())
         ";

        $this->execute($sql, [
            $idplanigrid, $rutaLectura, $fichero, $usuario, $extension, 'IMG', $descripcion, $rutaEscritura,
            $usuario, $descripcion, $idplanigrid,
        ]);
    }

    /**
     * Migrado literal del switch de cdmuelles/functions.php (funcion=up_img)
     * que avanza el estado de planigrid según el tipo de foto subida.
     */
    public function avanzarEstadoTrasFoto(string $idplanigrid, string $descripcion): void
    {
        $sql = match ($descripcion) {
            // La pantalla/proceso de Sonda (foto + input) es igual en
            // entrada y en salida, sin distinción. En entrada, si había
            // precinto ya se pidió y verificó (número + foto) dentro del
            // propio Quiz de Calidad, antes de llegar aquí (ver
            // cdmuelles-calidad.js) — así que no hay que volver a
            // comprobarlo. En salida, ni datalogger ni precinto se
            // adelantan — siguen el flujo normal y se piden al final, tras
            // la foto final (ver casos 'DATALOGGER', 'PRECINTO' y 'FINAL').
            'SONDA' => "UPDATE planigrid
                        set estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' THEN 2
                            WHEN datalogger = 1 THEN 10
                            ELSE 2
                        END
                        WHERE id = ?",
            // Datalogger se sube en dos momentos distintos según el flujo:
            // en entrada (IN), tras sonda (o directo desde el Quiz si sonda
            // no está activa) — el precinto, si lo había, ya se verificó en
            // el propio Quiz, así que siempre vuelve a 'Fotografia Inicial';
            // en salida (OUT), como paso posterior a 'Fotografía Final'
            // (comprueba si queda precinto pendiente, si no pasa a
            // 'Finalizada').
            'DATALOGGER' => "UPDATE planigrid
                        SET estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' THEN
                                CASE WHEN precinto IS NOT NULL THEN 9 ELSE 7 END
                            ELSE 2
                        END,
                            fechafinCD = CASE WHEN [in-out] = 'OUT' AND precinto IS NULL THEN SYSDATETIME() ELSE fechafinCD END
                        WHERE id = ?",
            // PRECINTO (estado 9, pantalla "Fotografía Precinto") es
            // EXCLUSIVO de salida (OUT) — como último paso, tanto si se
            // llega aquí directo desde 'Fotografía Final' como si se llega
            // tras 'Fotografía Datalogger' — pasa a 'Finalizada'. En
            // entrada, este estado ya no se alcanza nunca (el precinto se
            // verifica dentro del Quiz de Calidad, con descripcion
            // 'PRECINTO_QUIZ' para no chocar con este caso, ver
            // cdmuelles-calidad.js).
            'PRECINTO' => "UPDATE planigrid
                        SET estadocdmuelles = CASE WHEN [in-out] = 'OUT' THEN 7 ELSE 2 END,
                            fechafinCD = CASE WHEN [in-out] = 'OUT' THEN SYSDATETIME() ELSE fechafinCD END
                        WHERE id = ?",
            'INICIAL' => 'UPDATE planigrid SET estadocdmuelles = 3 WHERE id = ?',
            'TRANSCURSO' => 'UPDATE planigrid set estadocdmuelles = 3 WHERE id = ?',
            // En salida (OUT), tras la foto final se pide primero datalogger
            // (si está pendiente), luego precinto (si está pendiente), y
            // solo si no queda ninguno de los dos pasa a 'Finalizada'
            // directamente.
            'FINAL' => "UPDATE PLANIGRID
                        SET estadocdmuelles = CASE
                            WHEN [in-out] = 'OUT' AND datalogger = 1 THEN 10
                            WHEN [in-out] = 'OUT' AND precinto IS NOT NULL THEN 9
                            ELSE 7
                        END,
                            fechafinCD = CASE
                                WHEN [in-out] = 'OUT' AND (datalogger = 1 OR precinto IS NOT NULL) THEN fechafinCD
                                ELSE SYSDATETIME()
                            END
                        WHERE id = ?",
            default => null,
        };

        if ($sql !== null) {
            $this->execute($sql, [$idplanigrid]);
        }
    }

    /** @return array<int, array{id:mixed, rutafichero:mixed, extension:mixed, descripcion:mixed}> */
    public function imagenesDeOrden(string $idplanigrid): array
    {
        $sql = "SELECT id, concat(ruta, fichero) as rutafichero, extension, descripcion
                FROM planigrid_cdmuelles_uploads
                WHERE idplanigrid = ? and tipo = 'IMG'
                ORDER BY fecha ASC";

        return $this->fetchAll($sql, [$idplanigrid]);
    }

    /**
     * Migrado de funcion=eliminarFoto: borra el registro y devuelve la ruta
     * física del fichero para que el llamante lo elimine del disco.
     */
    public function eliminarFoto(string $idfoto, string $usuario, string $idplanigrid): ?string
    {
        $sql = "SELECT CONCAT(rutafisica, fichero) as rutafichero FROM planigrid_cdmuelles_uploads WHERE id = ?
        DELETE planigrid_cdmuelles_uploads where id = ?

        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
        VALUES (SYSDATETIME(), ?, 'Eliminada foto id: '+CONVERT(varchar(10), ?), 'DELETE', 'idplanigrid', ?)";

        $fila = $this->query($sql, [$idfoto, $idfoto, $usuario, $idfoto, $idplanigrid])->fetch();

        return $fila['rutafichero'] ?? null;
    }
}
