<?php

namespace App\Config;

use PDO;
use PDOException;

/**
 * Conexión PDO a SQL Server. Sustituye a los sqlsrv_connect() dispersos por
 * Config/Core.php y Config/Conexion.php en el proyecto original: una única
 * conexión, sin credenciales en el código.
 */
final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = Env::required('DB_HOST');
        $name = Env::required('DB_NAME');
        $user = Env::required('DB_USER');
        $password = Env::required('DB_PASSWORD');

        $dsn = "sqlsrv:Server={$host};Database={$name}";

        try {
            self::$connection = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // No forzar PDO::SQLSRV_ATTR_FETCHES_DATETIME_TYPE: el resto de la
                // app (Consignacion/Muelles/Configuracion) ya asume que las fechas
                // llegan como string. Los Renderer de Informes se adaptan a eso en
                // vez de forzar DateTime aquí (ver Repository::formatearFecha()).
            ]);
        } catch (PDOException $e) {
            throw new PDOException('No se pudo conectar con la base de datos: ' . $e->getMessage(), (int) $e->getCode(), $e);
        }

        return self::$connection;
    }
}
