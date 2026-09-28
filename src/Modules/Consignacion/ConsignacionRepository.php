<?php

namespace App\Modules\Consignacion;

use App\Data\Repository;
use PDO;

/**
 * Migrado de Resources/PHP/Modal_Consignacion.php. Todo el SQL usaba ya
 * sentencias preparadas en el original salvo dblclick_cab, que interpolaba
 * "WHERE pg.id = '$_SESSION[id]'" directamente: aquí se liga como parámetro.
 */
final class ConsignacionRepository extends Repository
{
    public function alertamail(string $usuario, string $idplanigrid): ?array
    {
        $sql = "SELECT
            CASE
                WHEN CHARINDEX((SELECT TOP 1 correo FROM usuarios WHERE nombre = ?), alertamail) > 0
                THEN 1
                ELSE 0
            END as resultado
            FROM [Planificador].[dbo].[planigrid]
            WHERE id = ?";

        return $this->fetchOne($sql, [$usuario, $idplanigrid]);
    }

    public function cabecera(string $idplanigrid): array
    {
        $sql = "SELECT pg.[in-out] AS INOUT,
            CASE WHEN mas.muelleasign IS NULL THEN '0' ELSE mas.muelleasign END AS muelleasign,
            CASE WHEN mrs.muellesreserv IS NULL THEN '0' ELSE muellesreserv END AS muellesreserv,
            pg.prueba as prueba,
            pg.sonda,
            pg.datalogger,
            CASE WHEN pg.[in-out] = 'OUT' THEN MAX(epc.fechatransporte)
              WHEN pg.[in-out] = 'IN' THEN pg.fechaprevista END AS 'horaprogramada',
            pg.fechallegada AS fechallegada,
            pg.fechasalida AS fechasalida,
            pg.id,
            pg.precinto as precinto,
            CONCAT((SELECT
                    COUNT(bulto) as bultos
              FROM [Planificador].[dbo].[planigrid_cdmuelles]
              where idplanigrid = pg.id
              GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(epc.bultos))
            as bultos,
            ecd.Estado as estadocdmuelles
            FROM planigrid AS pg
            LEFT JOIN muellesasignados AS mas ON mas.idplanigrid = pg.id
            LEFT JOIN muellesreservados AS mrs ON mrs.idplanigrid = pg.id
            LEFT JOIN expediciones AS epc ON epc.idplanigrid = pg.id
            LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
            LEFT JOIN estados_cdmuelles as ecd ON ecd.idestado = pg.estadocdmuelles
            WHERE pg.id = ?
            GROUP BY pg.[in-out], mas.muelleasign, mrs.muellesreserv, pg.prueba, pg.fechaprevista, pg.fechallegada,
            pg.fechasalida, pg.id, pg.precinto, ecd.Estado, pg.sonda, pg.datalogger";

        return $this->fetchAll($sql, [$idplanigrid]);
    }

    public function datos(string $idplanigrid): array
    {
        $sql = "SELECT
            exp.id,
            propietario,
            pedido,
            consignacion,
            transportista,
            CASE
            WHEN estado = -3 THEN 'Desconsignado'
            WHEN estado = 0 THEN 'Pend. Gen'
            WHEN estado = 1 THEN 'Creación'
            WHEN estado = 2 THEN 'Expedición'
            WHEN estado = 4 THEN 'Cerrado'
            WHEN estado = 5 THEN 'Asignado Gen.'
            WHEN estado = 6 THEN 'En Ruta'
            WHEN estado = 7 THEN 'Pend. Faltas Gen.'
            WHEN estado = 8 THEN 'Asignado Faltas'
            WHEN estado = 9 THEN 'Anulado'
            WHEN estado = 15 THEN 'Bloqueado'
            ELSE 'En Proceso' END as 'estado',
            playa,
            CAST((ISNULL(COUNT(pcd.bulto),'')) as varchar)+'/'+CAST(ISNULL(bultos, '') as varchar) as bultos,
            CASE
            WHEN [numSerieExpedicion] IS NULL THEN '0'
            ELSE [numSerieExpedicion] END as albaranenvio,
            peligrosidad
            FROM Planificador.dbo.expediciones as exp
            LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = exp.idplanigrid and pcd.pedidoalbaran = exp.pedido
            WHERE exp.idplanigrid = ?
            AND exp.estado NOT IN (-3, 9)
            GROUP BY exp.id,
            exp.propietario,
            exp.pedido,
            exp.consignacion,
            exp.transportista,
            exp.estado,
            exp.playa,
            exp.bultos,
            exp.numSerieExpedicion,
            exp.peligrosidad

            UNION ALL

            SELECT
            pre.id,
            pg.propietario,
            albaran,
            pg.consignacion as consignacion,
            pg.transportista,
            CASE
            WHEN estado = -1 THEN 'CREACION'
            WHEN estado = 0 THEN 'IMPORTADO'
            WHEN estado = 1 THEN 'PENDIENTE'
            WHEN estado = 2 THEN 'FINALIZADO'
            WHEN estado = 3 THEN 'DISCREPANCIA'
            WHEN estado = 4 THEN 'RECEPCIONADO'
            WHEN estado = 5 THEN 'CANCELADO'
            WHEN estado = 6 THEN 'BLOQUEADO'
            ELSE 'DESCONOCIDO'
            END as estado,
            (SELECT dbo.fn_DistinctWords(STRING_AGG(pcd.ubicacion, ' '))) as playa,
            CAST(ISNULL(COUNT(pcd.bulto),'') As varchar) as bultos,
            '0' as albaranenvio,
            pg.peligrosidad as peligrosidad
            FROM Planificador.dbo.preavisos as pre
            INNER JOIN planigrid as pg ON pg.id = pre.idplanigrid
            LEFT JOIN planigrid_cdmuelles as pcd ON pcd.idplanigrid = pre.idplanigrid and pcd.pedidoalbaran = pre.albaran
            WHERE pre.idplanigrid = ?
            GROUP BY pre.id,
            pg.propietario,
            pre.albaran,
            pg.consignacion,
            pg.transportista,
            pre.estado,
            pg.peligrosidad";

        return $this->fetchAll($sql, [$idplanigrid, $idplanigrid]);
    }

    public function datosQuizCalidad(string $idplanigrid): array
    {
        $sql = "SELECT
            *
            FROM(SELECT
                pg.[in-out] as inout,
                pg.id as idplanigrid,
                ino.id,
                ino.campohtml,
                ino.tipo,
                pid.value,
                pg.precinto as precintocentralita,
                tmr.rango,
                pg.sonda,
                ino.seccion,
                ino.orden
            FROM planigrid as pg
            INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
            LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
            LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
            WHERE pg.id = ? and (seccion <> 'CHOFER' OR seccion is null) and seccion is null

            UNION ALL

            SELECT
                pg.[in-out] as inout,
                pg.id as idplanigrid,
                ino.id,
                ino.campohtml,
                ino.tipo,
                pid.value,
                pg.precinto as precintocentralita,
                tmr.rango,
                pg.sonda,
                ino.seccion,
                ino.orden
            FROM planigrid as pg
            INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
            LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
            LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
            WHERE pg.id = ? and (seccion <> 'CHOFER' OR seccion is null) and seccion is not null and tipo = pg.peligrosidad

            )a


            ORDER BY
                CASE
                    WHEN seccion IS NULL THEN 1
                    WHEN seccion = 'PREVIAS' THEN 2
                    WHEN seccion = 'DURANTE' THEN 3
                    WHEN seccion = 'FINAL' THEN 4
                    ELSE 5
                END,
                orden";

        return $this->fetchAll($sql, [$idplanigrid, $idplanigrid]);
    }

    public function selectTempRango(string $idplanigrid): array
    {
        $sql = "SELECT DISTINCT
          tr.id,
          tr.rango,
          pg.idtemprango as aux,
          pg.sonda
        FROM temperaturasrangos  as tr LEFT JOIN
        planigrid as pg ON pg.idtemprango = tr.id AND (pg.id = ? or pg.id is null)
        LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id
        LEFT JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme";

        return $this->fetchAll($sql, [$idplanigrid]);
    }

    public function logs(string $idplanigrid): array
    {
        $sql = "SELECT
          id,
          fecha,
          usuario,
          descripcion,
          instruccion
        FROM logs
        WHERE referencia = ? and tiporeferencia = 'idplanigrid'
        ORDER BY fecha ASC";

        return $this->fetchAll($sql, [$idplanigrid]);
    }

    public function fotoRuta(string $idfoto): ?array
    {
        return $this->fetchOne(
            'SELECT CONCAT(rutafisica, fichero) as rutafichero FROM planigrid_cdmuelles_uploads WHERE id = ?',
            [$idfoto]
        );
    }

    public function eliminarFoto(string $idfoto, string $usuario, string $idplanigrid): void
    {
        $sql = "DELETE planigrid_cdmuelles_uploads where id = ?

            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Eliminada foto id: '+CONVERT(varchar(10), ?), 'DELETE', 'idplanigrid', ?)";

        $this->execute($sql, [$idfoto, $usuario, $idfoto, $idplanigrid]);
    }

    public function correoUsuario(string $usuario): ?string
    {
        $fila = $this->fetchOne('SELECT TOP 1 correo FROM usuarios WHERE nombre = ?', [$usuario]);

        return $fila['correo'] ?? null;
    }

    public function desactivarAlertaMail(string $correo, string $idplanigrid): bool
    {
        $sql = "UPDATE planigrid
              SET alertamail = REPLACE(alertamail, ? + ';', '')
              WHERE id = ?";

        return $this->execute($sql, [$correo, $idplanigrid]) >= 0;
    }

    public function activarAlertaMail(string $usuario, string $idplanigrid): bool
    {
        $sql = "UPDATE planigrid
          SET alertamail = CONCAT(COALESCE(alertamail, ''),
                                  CASE
                                      WHEN alertamail IS NULL OR alertamail = '' THEN ''
                                      ELSE ';'
                                  END,
                                  (SELECT TOP 1 correo FROM usuarios WHERE nombre = ?))+';'
          WHERE id = ?";

        return $this->execute($sql, [$usuario, $idplanigrid]) >= 0;
    }

    /**
     * spDesagruparPreExp comprueba que la selección sea "Completa" (que
     * @PListOfIDs incluya TODAS las expediciones/preavisos del grupo, no un
     * subconjunto) y, si no lo es, aborta sin avisar (solo hace PRINT +
     * RETURN, sin lanzar ningún error SQL) — así que en vez de confiar en
     * que el llamante mande la lista correcta, se calcula aquí mismo
     * leyendo directamente qué expediciones/preavisos cuelgan ahora mismo
     * de $idplanigrid, garantizando siempre una selección completa.
     */
    private function idsParaDesagrupar(string $idplanigrid): array
    {
        $inout = $this->fetchOne('SELECT [in-out] as inout FROM planigrid WHERE id = ?', [$idplanigrid]);

        if ($inout === null) {
            return [];
        }

        $tabla = $inout['inout'] === 'IN' ? 'preavisos' : 'expediciones';

        return $this->fetchAll("SELECT id FROM $tabla WHERE idplanigrid = ?", [$idplanigrid]);
    }

    /**
     * Al desagrupar del todo, spDesagruparPreExp BORRA la fila de
     * planigrid del grupo (ver bloque final "si se ha quedado solo, lo
     * eliminamos"). Como el procedimiento no devuelve ningún estado de
     * éxito/fallo real, se comprueba aquí si esa fila sigue existiendo
     * después: si ha desaparecido, desagrupó de verdad; si sigue ahí, no
     * hizo nada (selección incompleta, grupo inválido, etc.).
     */
    public function desagruparCd(string $idplanigrid, string $usuario, string $plataforma = 'Ordenador'): bool
    {
        $idsParaDesagrupar = $this->idsParaDesagrupar($idplanigrid);

        if ($idsParaDesagrupar === []) {
            return false;
        }

        $selectedRows = implode(',', array_column($idsParaDesagrupar, 'id'));

        $sql = "EXEC [dbo].[spDesagruparPreExp]
          @PListOfIDs = ?,
          @pIdplanigrid = ?,
          @usuario = ?,
          @plataforma = ?";

        $statement = $this->db->prepare($sql);
        $statement->execute([$selectedRows, $idplanigrid, $usuario, $plataforma]);

        $siguenExistiendo = $this->fetchOne('SELECT id FROM planigrid WHERE id = ?', [$idplanigrid]);

        return $siguenExistiendo === null;
    }

    public function cambiarSonda(string $idplanigrid, bool $activar, string $usuario): bool
    {
        if ($activar) {
            $sql = "UPDATE planigrid SET sonda = 1 WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Activada sonda en CD', 'INSERT', 'idplanigrid', ?)";
        } else {
            $sql = "UPDATE planigrid SET sonda = NULL WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Desactivada sonda en CD', 'INSERT', 'idplanigrid', ?)";
        }

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $idplanigrid]);
    }

    public function cambiarDatalogger(string $idplanigrid, bool $activar, string $usuario): bool
    {
        if ($activar) {
            $sql = "UPDATE planigrid SET datalogger = 1 WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Activado datalogger en CD', 'INSERT', 'idplanigrid', ?)";
        } else {
            $sql = "UPDATE planigrid SET datalogger = NULL WHERE id = ?
            INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Desactivado datalogger en CD', 'INSERT', 'idplanigrid', ?)";
        }

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $idplanigrid]);
    }

    public function muelleAsignado(string $idplanigrid): ?array
    {
        return $this->fetchOne('SELECT muelleasign FROM muellesasignados WHERE idplanigrid = ?', [$idplanigrid]);
    }

    public function eliminarMuelleAsignado(string $idplanigrid, string $usuario, ?string $muelleAnterior): bool
    {
        $sql = "DELETE muellesasignados where idplanigrid = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Muelle Eliminado: ' + CAST(? as varchar(3)), 'DELETE', 'idplanigrid', ?)";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $muelleAnterior, $idplanigrid]);
    }

    public function rangoActual(string $idplanigrid): ?array
    {
        $sql = "SELECT
          pg.idtemprango,
          COALESCE(tr.rango, 'Sin Temperatura')
          as rango
          FROM planigrid as pg
          LEFT join temperaturasrangos as tr ON tr.id = pg.idtemprango
          WHERE pg.id = ?";

        return $this->fetchOne($sql, [$idplanigrid]);
    }

    public function cambiarTempRango(?string $temprango, string $idplanigrid, string $usuario, string $rangoAnterior, string $textoNuevo): bool
    {
        $sql = "UPDATE planigrid set idtemprango = ? WHERE id = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Cambio Rango de Temperatura, anterior: '+ ? +', nuevo: '+ ?+'', 'INSERT', 'idplanigrid', ?)";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$temprango, $idplanigrid, $usuario, $rangoAnterior, $textoNuevo, $idplanigrid]);
    }

    public function fechaSalida(string $idplanigrid): ?array
    {
        return $this->fetchOne('SELECT fechasalida from planigrid WHERE id = ?', [$idplanigrid]);
    }

    public function desasignarSalida(string $idplanigrid, string $usuario, $fechaSalidaAnterior): bool
    {
        $sql = "UPDATE planigrid SET fechasalida = NULL WHERE id = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha salida eliminada: ' + CONVERT(VARCHAR, ?, 103) + ' ' + CONVERT(VARCHAR(5), ?, 108), 'DELETE', 'idplanigrid', ?)
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'DesasigSalida'";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $fechaSalidaAnterior, $fechaSalidaAnterior, $idplanigrid, $idplanigrid, $usuario]);
    }

    public function estadoParaAsignarSalida(string $idplanigrid): ?array
    {
        $sql = "SELECT
          MIN(orden) as EstadoMin,
          MAX(orden) as EstadoMax,
          pg.estadocdmuelles,
          MAX(l.fecha) as fechafirmapeligrosidad,
          pg.peligrosidad,
          pg.[in-out] as inout
          FROM estados_cdmuelles as ecd
          LEFT JOIN planigrid as pg ON pg.id = ?
          LEFT JOIN logs as l ON l.referencia = pg.id and l.tiporeferencia = 'idplanigrid'
          AND l.descripcion = 'Firma de peligrosidad ADR'
          GROUP BY pg.estadocdmuelles, pg.peligrosidad, pg.[in-out]";

        return $this->fetchOne($sql, [$idplanigrid]);
    }

    public function asignarSalida(string $idplanigrid, string $usuario): bool
    {
        $sql = "UPDATE planigrid SET fechasalida = SYSDATETIME() WHERE id = ?
                  INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
                  VALUES (SYSDATETIME(), ?, 'Fecha salida insertada: ' + CONVERT(VARCHAR, SYSDATETIME(), 103) + ' ' + CONVERT(VARCHAR(5), SYSDATETIME(), 108), 'INSERT', 'idplanigrid', ?)
                  EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'AsigSalida'";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $idplanigrid, $idplanigrid, $usuario]);
    }

    public function fechaLlegada(string $idplanigrid): ?array
    {
        return $this->fetchOne('SELECT fechallegada from planigrid WHERE id = ?', [$idplanigrid]);
    }

    public function desasignarLlegada(string $idplanigrid, string $usuario, $fechaLlegadaAnterior): bool
    {
        $sql = "UPDATE planigrid SET fechallegada = NULL WHERE id = ?
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha llegada eliminada: ' + CONVERT(VARCHAR, ?, 103) + ' ' + CONVERT(VARCHAR(5), ?, 108), 'DELETE', 'idplanigrid', ?)
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'DesasigLlegada'";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $fechaLlegadaAnterior, $fechaLlegadaAnterior, $idplanigrid, $idplanigrid, $usuario]);
    }

    public function asignarLlegada(string $idplanigrid, string $usuario): bool
    {
        $sql = "UPDATE planigrid SET fechallegada = SYSDATETIME() WHERE id = ?;
          INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
          VALUES (SYSDATETIME(), ?, 'Fecha llegada insertada: ' + CONVERT(VARCHAR, SYSDATETIME(), 103) + ' ' + CONVERT(VARCHAR(5), SYSDATETIME(), 108), 'INSERT', 'idplanigrid', ?);
          EXEC spEnviaMail @idplanigrid = ?, @usuario = ?, @tipo = 'AsigLlegada'";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $usuario, $idplanigrid, $idplanigrid, $usuario]);
    }

    public function valoresCabeceraOriginal(string $idplanigrid): ?array
    {
        $sql = "SELECT pg.precinto, pg.prueba, pg.fechallegada, pg.fechasalida, mas.muelleasign, mer.muellesreserv, ecd.Estado, pg.idtemprango
          FROM planigrid AS pg
        LEFT JOIN estados_cdmuelles as ecd ON ecd.idestado = pg.estadocdmuelles
        LEFT JOIN muellesasignados as mas ON mas.idplanigrid = pg.id
        LEFT JOIN muellesreservados as mer ON mer.idplanigrid = pg.id
          Where pg.id = ?";

        return $this->fetchOne($sql, [$idplanigrid]);
    }

    public function actualizarCabecera(string $sql, array $params): bool
    {
        $statement = $this->db->prepare($sql);

        return $statement->execute($params);
    }

    public function muelleHabilitado(string $almacen, string $muelle): ?array
    {
        return $this->fetchOne(
            'SELECT [muelle], [habilitado] FROM [Planificador].[dbo].[muelles] WHERE almacen = ? and muelle = ?',
            [$almacen, $muelle]
        );
    }

    public function muellePermitidoRangoTemp(?string $idtemprango, string $muelle): ?array
    {
        $sql = "SELECT mtr.idmuelle FROM muellestemprango as mtr INNER JOIN muelles as m ON m.id = mtr.idmuelle WHERE idtemprango = ? and muelle = ?";

        return $this->fetchOne($sql, [$idtemprango, $muelle]);
    }

    public function actualizarMuelleAsignado(string $muelle, string $idplanigrid): bool
    {
        return $this->execute('UPDATE muellesasignados SET muelleasign = ?, fecharegistro = SYSDATETIME() WHERE idplanigrid = ?', [$muelle, $idplanigrid]) >= 0;
    }

    public function insertarMuelleAsignado(string $muelle, string $idplanigrid): bool
    {
        return $this->execute('INSERT INTO muellesasignados (muelleasign, fecharegistro, idplanigrid) VALUES (?, SYSDATETIME(), ?)', [$muelle, $idplanigrid]) >= 0;
    }

    public function eliminarMuellesAsignadosPorIdplanigrid(string $idplanigrid): bool
    {
        return $this->execute('DELETE FROM muellesasignados WHERE idplanigrid = ?', [$idplanigrid]) >= 0;
    }

    public function actualizarMuelleReservado(string $muelleReservado, string $idplanigrid): bool
    {
        return $this->execute('UPDATE muellesreservados SET muellesreserv = ?, fecharegistro = SYSDATETIME() WHERE idplanigrid = ?', [$muelleReservado, $idplanigrid]) >= 0;
    }

    public function insertarMuelleReservado(string $muelleReservado, string $idplanigrid): bool
    {
        return $this->execute('INSERT INTO muellesreservados (muellesreserv, fecharegistro, idplanigrid) VALUES (?, SYSDATETIME(), ?)', [$muelleReservado, $idplanigrid]) >= 0;
    }

    public function eliminarMuelleReservado(string $idplanigrid): bool
    {
        return $this->execute('DELETE FROM [muellesreservados] WHERE idplanigrid = ?', [$idplanigrid]) >= 0;
    }

    public function registrarCambioLog(string $usuario, string $descripcion, string $instruccion, string $tiporeferencia, string $referencia): void
    {
        $sql = "INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
               VALUES (SYSDATETIME(), ?, ?, ?, ?, ?)";

        $this->execute($sql, [$usuario, $descripcion, $instruccion, $tiporeferencia, $referencia]);
    }

    public function informeCargaDescarga(string $idplanigrid): ?array
    {
        // pg es la UNION de planigrid + planigrid_H (misma razón que en
        // HistoricoRepository: el id puede corresponder a una consignación
        // ya archivada, y este informe debe poder resolverla igual).
        $sql = "SELECT
          pg.[in-out]
          ,i.Informe as informe
          ,pg.[versioninforme]
        FROM (
          SELECT * FROM [Planificador].[dbo].planigrid
          UNION ALL
          SELECT * FROM [Planificador].[dbo].planigrid_H
        ) as pg INNER JOIN
        informes as i on I.idinforme = pg.idinforme and i.version = pg.versioninforme
        WHERE pg.id = ?";

        return $this->fetchOne($sql, [$idplanigrid]);
    }

    public function galeria(string $idplanigrid): array
    {
        $sql = "SELECT concat(CASE when left(ruta, 1) = 'u' THEN 'cdmuelles/' else '' END,ruta, fichero) as rutafichero, extension, descripcion, id
            FROM planigrid_cdmuelles_uploads
            WHERE idplanigrid = ? and tipo = 'IMG'
            ORDER BY CASE descripcion
        WHEN 'INICIAL' THEN 1
        WHEN 'TRANSCURSO' THEN 2
        WHEN 'FINAL' THEN 3
        WHEN 'EXTRA' THEN 4
        ELSE 5
    END";

        return $this->fetchAll($sql, [$idplanigrid]);
    }

    public function insertarSubidaImagen(string $idplanigrid, string $ruta, string $fichero, string $usuario, string $extension, string $tipo, string $descripcion, string $rutaFisica): bool
    {
        $sql = "INSERT INTO planigrid_cdmuelles_uploads (idplanigrid, ruta, fichero, usuario, extension, tipo, descripcion, rutafisica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         INSERT logs (usuario, descripcion, instruccion, tiporeferencia, referencia, fecha)
         VALUES (?, 'Subida de imagen '+?+'', 'INSERT', 'idplanigrid', ?, SYSDATETIME())";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$idplanigrid, $ruta, $fichero, $usuario, $extension, $tipo, $descripcion, $rutaFisica, $usuario, $descripcion, $idplanigrid]);
    }

    public function actualizarEstadoCdMuellesPorSubida(string $idplanigrid, int $estado, bool $marcarFinCd = false): bool
    {
        if ($marcarFinCd) {
            return $this->execute('UPDATE PLANIGRID set estadocdmuelles = ?, fechafinCD = SYSDATETIME() WHERE id = ?', [$estado, $idplanigrid]) >= 0;
        }

        return $this->execute('UPDATE planigrid set estadocdmuelles = ? WHERE id = ?', [$estado, $idplanigrid]) >= 0;
    }
}
