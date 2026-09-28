<?php

namespace App\Modules\Configuracion;

use App\Data\Repository;

/**
 * Migrado de Resources/PHP/Configuración.php. El SQL original ya usaba
 * sentencias preparadas en todos los casos.
 */
final class ConfiguracionRepository extends Repository
{
    public function crearAlmacen(
        string $almacen,
        string $descripcion,
        string $direccion,
        string $cp,
        string $poblacion,
        string $pais,
        string $direccionCarga,
        string $usuario
    ): bool {
        $sql = "INSERT INTO almacenes (almacen, descripcion, direccion, cp, poblacion, pais, direccioncarga, status)
        VALUES( ?, ?, ?, ?, ?, ?, ?, 0)
        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se crea el almacén:'+?+
                                      ', Descripción: '+?+
                                      ', Dirección: '+?+
                                      ', CP: '+?+
                                      ', Población: '+?+
                                      ', País: '+?+
                                      ', Dirección Carga: '+?
                                      ,'INSERT', 'ConfigALM', NULL)";

        $statement = $this->db->prepare($sql);

        return $statement->execute([
            $almacen, $descripcion, $direccion, $cp, $poblacion, $pais, $direccionCarga,
            $usuario, $almacen, $descripcion, $direccion, $cp, $poblacion, $pais, $direccionCarga,
        ]);
    }

    public function eliminarAlmacen(string $almacen, string $usuario): bool
    {
        $sql = "DELETE FROM almacenes WHERE almacen = ?
        INSERT INTO logs (fecha, usuario, descripcion, instruccion, tiporeferencia, referencia)
            VALUES (SYSDATETIME(), ?, 'Se eliminó almacén:'+?,'INSERT', 'ConfigALM', NULL)";

        $statement = $this->db->prepare($sql);

        return $statement->execute([$almacen, $usuario, $almacen]);
    }

    public function maestroAlmacenes(): array
    {
        $sql = "SELECT DISTINCT a.almacen, a.descripcion, a.direccion, a.cp, a.poblacion, a.pais, a.direccioncarga, a.status,
    CASE WHEN p.almacen IS NULL THEN 'Eliminable' ELSE 'No eliminable' END AS eliminable
    FROM almacenes a
    LEFT JOIN planigrid p ON a.almacen = p.almacen
    ORDER BY a.almacen";

        return $this->fetchAll($sql);
    }

    public function logsMaestro(string $maestro): array
    {
        $sql = "SELECT
        fecha,
        descripcion,
        usuario,
        instruccion
        FROM logs
        WHERE tiporeferencia like ?
        ORDER BY fecha DESC";

        return $this->fetchAll($sql, [$maestro]);
    }

    public function maestroVariablesDelSistema(): array
    {
        $sql = "SELECT
      [Nombre],
      [Descripción],
      [Activo],
      [Valor],
      [Tipo]
        FROM Configuración";

        return $this->fetchAll($sql);
    }

    public function maestroAutomatizaciones(): array
    {
        return $this->fetchAll('Select nombre, descripcion, activo, valor, tipo FROM funcionesautomaticas');
    }
}
