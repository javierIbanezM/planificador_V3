<?php

namespace App\Modules\Cdmuelles;

use App\Data\Repository;

/**
 * Bultos/expediciones del kiosco PDA. Migrado de cdmuelles/functions.php:
 * incrementarBultos, decrementarBultos, selectubicaciones y enviadatoscdpq.
 */
final class ExpedicionesRepository extends Repository
{
    public function fechaFinCd(string $idplanigrid): bool
    {
        $fila = $this->fetchOne('SELECT fechafincd FROM planigrid WHERE id = ?', [$idplanigrid]);
        return !empty($fila['fechafincd'] ?? null);
    }

    /**
     * Propietario del albarán concreto (no de todo el pedido): cuando varios
     * pedidos se agrupan en uno solo (planigrid.agrupacion), su propietario
     * queda como la concatenación literal de los propietarios originales
     * (p.ej. "00180107 head"), que no coincide con ninguna clave real de
     * delivery-order-tokens.json — por eso fallaba la verificación de
     * contenedores en pedidos agrupados. Cada fila de expediciones sí
     * conserva el propietario correcto de su propio albarán, agrupado o no.
     */
    public function propietario(string $idplanigrid, string $albaran): ?string
    {
        $fila = $this->fetchOne(
            'SELECT propietario FROM expediciones WHERE idplanigrid = ? AND pedido = ?',
            [$idplanigrid, $albaran]
        );
        return $fila['propietario'] ?? null;
    }

    /**
     * Contenedores ya verificados (escaneados/confirmados) de un albarán,
     * compartido entre dispositivos: cada bulto sumado desde la
     * verificación por escáner guarda su número de contenedor aquí mismo.
     *
     * @return string[]
     */
    public function contenedoresVerificados(string $idplanigrid, string $albaran): array
    {
        return $this->fetchAll(
            'SELECT DISTINCT contenedor FROM planigrid_cdmuelles WHERE idplanigrid = ? AND pedidoalbaran = ? AND contenedor IS NOT NULL',
            [$idplanigrid, $albaran]
        );
    }

    public function incrementarBulto(
        string $idplanigrid,
        string $albaran,
        string $usuario,
        ?string $playa,
        bool $reabrirCarga,
        ?string $contenedor = null
    ): void {
        $sql = "INSERT INTO planigrid_cdmuelles (idplanigrid, pedidoalbaran, bulto, operarios, ubicacion, contenedor)
                VALUES
                (?,
                ?,
                (SELECT CASE WHEN (max(bulto)+1) is null THEN 1 ELSE max(bulto)+1 END as maxbulto FROM planigrid_cdmuelles  WHERE idplanigrid = ? AND pedidoalbaran = ?) ,
                ?,
                ?,
                ?)";
        $parametros = [$idplanigrid, $albaran, $idplanigrid, $albaran, $usuario, $playa, $contenedor];

        if ($reabrirCarga) {
            $sql .= "

                INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())
                UPDATE planigrid
                SET fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3
                WHERE id = ?";
            $parametros[] = $usuario;
            $parametros[] = $idplanigrid;
            $parametros[] = $idplanigrid;
        }

        if (!empty($playa)) {
            $sql .= "; INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                    VALUES (?, 'Se añade bulto al albarán ' + ? + ' en: ' + ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())";
            $parametros[] = $usuario;
            $parametros[] = $albaran;
            $parametros[] = $playa;
            $parametros[] = $idplanigrid;
        } else {
            $sql .= "; INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                    VALUES (?, 'Se añade bulto al albarán ' + ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())";
            $parametros[] = $usuario;
            $parametros[] = $albaran;
            $parametros[] = $idplanigrid;
        }

        $this->execute($sql, $parametros);
    }

    public function decrementarBulto(
        string $idplanigrid,
        string $albaran,
        string $usuario,
        bool $reabrirCarga
    ): void {
        $sql = "DELETE planigrid_cdmuelles WHERE idplanigrid = ? and pedidoalbaran = ? and bulto =
        (SELECT max(bulto) from planigrid_cdmuelles WHERE idplanigrid = ? and pedidoalbaran = ?)";
        $parametros = [$idplanigrid, $albaran, $idplanigrid, $albaran];

        if ($reabrirCarga) {
            $sql .= "

        UPDATE planigrid set fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3 WHERE id = ?

        INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())";
            $parametros[] = $idplanigrid;
            $parametros[] = $usuario;
            $parametros[] = $idplanigrid;
        }

        $sql .= "
        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se quita bulto al albarán '+?, 'DELETE', 'idplanigrid', ?, SYSDATETIME())";
        $parametros[] = $usuario;
        $parametros[] = $albaran;
        $parametros[] = $idplanigrid;

        $this->execute($sql, $parametros);
    }

    /**
     * Quita un contenedor concreto ya verificado (a diferencia de
     * decrementarBulto, que solo sabe quitar el último bulto sumado, esto
     * borra la fila exacta del contenedor indicado, sea cual sea el orden en
     * que se escaneó).
     */
    public function quitarContenedor(
        string $idplanigrid,
        string $albaran,
        string $usuario,
        string $contenedor,
        bool $reabrirCarga
    ): void {
        $sql = 'DELETE planigrid_cdmuelles WHERE idplanigrid = ? AND pedidoalbaran = ? AND contenedor = ?';
        $parametros = [$idplanigrid, $albaran, $contenedor];

        if ($reabrirCarga) {
            $sql .= "

        UPDATE planigrid set fechafinCD = NULL, observacioncdmuelles = NULL, estadocdmuelles = 3 WHERE id = ?

        INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Eliminada Finalización de C/D por cambio en lo bultos.', 'DELETE', 'idplanigrid', ?, SYSDATETIME())";
            $parametros[] = $idplanigrid;
            $parametros[] = $usuario;
            $parametros[] = $idplanigrid;
        }

        $sql .= "
        INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
        VALUES (?, 'Se quita el contenedor '+?+' del albarán '+?, 'DELETE', 'idplanigrid', ?, SYSDATETIME())";
        $parametros[] = $usuario;
        $parametros[] = $contenedor;
        $parametros[] = $albaran;
        $parametros[] = $idplanigrid;

        $this->execute($sql, $parametros);
    }

    /**
     * Migrado de funcion=selectubicaciones. El original descartaba la
     * primera fila del resultado (llamaba sqlsrv_fetch_array una vez antes
     * del while sin usar el valor) — se corrige aquí para devolver todas
     * las ubicaciones; ver informe de migración.
     *
     * @return array<int, array{ubicacion: mixed}>
     */
    public function ubicaciones(string $idplanigrid, string $almacen): array
    {
        $sql = 'SELECT DISTINCT
        u.ubicacion
        FROM ubicaciones as u
        LEFT JOIN planigrid_cdmuelles as pcd ON pcd.ubicacion = u.ubicacion and pcd.idplanigrid = ?
        WHERE u.almacen = ?';

        return $this->fetchAll($sql, [$idplanigrid, $almacen]);
    }

    public function contarExpedicionesSinBultos(string $idplanigrid): int
    {
        $sql = 'SELECT COUNT(*) AS count FROM expediciones WHERE idplanigrid = ? AND bultos IS NULL and estado <> -3 AND estado <> 9';
        $fila = $this->fetchOne($sql, [$idplanigrid]);
        return (int) ($fila['count'] ?? 0);
    }

    public function totalBultosExpediciones(string $idplanigrid): ?int
    {
        $fila = $this->fetchOne('SELECT SUM(bultos) AS totalBultos FROM expediciones WHERE idplanigrid = ?', [$idplanigrid]);
        return $fila['totalBultos'] !== null ? (int) $fila['totalBultos'] : null;
    }

    public function eliminarBultosPq(string $idplanigrid, string $usuario): void
    {
        $sql = "DELETE FROM planigrid_cdmuelles WHERE idplanigrid = ?
                INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, 'Eliminados los bultos añadidos anteriormente para procesar PQ', 'DELETE', 'idplanigrid', ?, SYSDATETIME())";

        $this->execute($sql, [$idplanigrid, $usuario, $idplanigrid]);
    }

    /** @return string[] */
    public function pedidosDistintos(string $idplanigrid): array
    {
        $filas = $this->fetchAll('SELECT DISTINCT pedido FROM expediciones WHERE idplanigrid = ?', [$idplanigrid]);
        return array_map(static fn(array $fila): string => (string) $fila['pedido'], $filas);
    }

    public function bultosDelPedido(string $idplanigrid, string $pedido): int
    {
        $fila = $this->fetchOne(
            'SELECT bultos FROM expediciones WHERE idplanigrid = ? AND pedido = ?',
            [$idplanigrid, $pedido]
        );

        return (int) ($fila['bultos'] ?? 0);
    }

    public function insertarBultoPq(string $idplanigrid, string $pedido, int $bulto, string $usuario): void
    {
        $sql = 'INSERT INTO planigrid_cdmuelles (idplanigrid, pedidoalbaran, bulto, operarios) VALUES (?, ?, ?, ?)';
        $this->execute($sql, [$idplanigrid, $pedido, $bulto, $usuario]);
    }

    public function finalizarPorPq(string $idplanigrid, string $usuario): void
    {
        $sql = "UPDATE planigrid SET estadocdmuelles = 6 WHERE id = ?
                   INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                   VALUES (?, 'Finalizada Carga a través de PQ', 'INSERT', 'idplanigrid', ?, SYSDATETIME())";

        $this->execute($sql, [$idplanigrid, $usuario, $idplanigrid]);
    }

    public function logDiscrepanciaPq(string $usuario, string $bultos, string $idplanigrid): void
    {
        $sql = "INSERT INTO logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
                VALUES (?, ?, 'INSERT', 'idplanigrid', ?, SYSDATETIME())";

        $this->execute($sql, [$usuario, 'Se intentó validar: ' . $bultos . ' bultos en PQ', $idplanigrid]);
    }
}
