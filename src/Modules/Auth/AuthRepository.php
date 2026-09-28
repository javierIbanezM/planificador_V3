<?php

namespace App\Modules\Auth;

use PDO;

/**
 * Comprobación de acceso por PIN. Migrado literal de Resources/PHP/Login.php
 * (funciones logindesktop/loginpda): PIN en texto plano comparado contra
 * usuarios.pin, sin hash y sin límite de intentos — comportamiento
 * mantenido tal cual a petición expresa, no modificar.
 */
final class AuthRepository
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function loginDesktop(string $pin, string $nombre, string $permiso): ?array
    {
        $sql = "SELECT
                b.nombre,
                b.rango_usuario,
                b.rol_usuario,
                rp.rango as rango_minimo,
                CASE WHEN rango_usuario >= rp.rango THEN 'SI' ELSE 'NO' END AS Acceso
            FROM (
                SELECT u.nombre, MAX(r.rango) as rango_usuario, r.rol as rol_usuario
                FROM usuarios as u
                INNER JOIN roles as r ON r.rol = u.rol
                WHERE u.pin = ? and u.nombre = ?
                GROUP BY u.nombre, r.rol
            ) as b
            LEFT JOIN roles_permisos as rp ON rp.permiso = ?
            ORDER BY rango_usuario DESC";

        return $this->fetchAcceso($sql, [$pin, $nombre, $permiso]);
    }

    public function loginPda(string $pin, string $permiso): ?array
    {
        $sql = "SELECT
                b.nombre,
                b.rango_usuario,
                b.rol_usuario,
                rp.rango as rango_minimo,
                CASE WHEN rango_usuario >= rp.rango THEN 'SI' ELSE 'NO' END AS Acceso
            FROM (
                SELECT u.nombre, MAX(r.rango) as rango_usuario, r.rol as rol_usuario
                FROM usuarios as u
                INNER JOIN roles as r ON r.rol = u.rol
                WHERE u.pin = ?
                GROUP BY u.nombre, r.rol
            ) as b
            LEFT JOIN roles_permisos as rp ON rp.permiso = ?
            ORDER BY rango_usuario DESC";

        return $this->fetchAcceso($sql, [$pin, $permiso]);
    }

    private function fetchAcceso(string $sql, array $params): ?array
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        $row = $statement->fetch();
        return ($row === false || $row['nombre'] === null) ? null : $row;
    }
}
