<?php

namespace App\Config;

/**
 * Ajustes de aplicación derivados de .env. Sustituye a las variables sueltas
 * ($base_url, $ruta_upload_cdmuelles, ...) que vivían en Config/Core.php.
 */
final class AppConfig
{
    public static function baseUrl(): string
    {
        $url = Env::get('APP_BASE_URL', '/');
        return rtrim($url, '/') . '/';
    }

    /**
     * Host que sirve los alias de subida (UPLOADS_*_ALIAS). Por defecto es
     * el mismo host que la app (comportamiento en producción, donde IIS
     * expone "/diskd/" en el mismo servidor); UPLOADS_HOST_URL permite
     * apuntar a otro host cuando no coincide (p. ej. en desarrollo local).
     */
    public static function uploadsHost(): string
    {
        $host = Env::get('UPLOADS_HOST_URL', '');

        return $host !== '' ? rtrim($host, '/') : rtrim(self::baseUrl(), '/');
    }

    public static function uploadsFirmasPath(): string
    {
        return self::resolveUploadsPath(Env::required('UPLOADS_FIRMAS_PATH'));
    }

    /**
     * Prefijo de URL pública con el que el servidor web sirve
     * uploadsFirmasPath() (antes $alias_upload_firmas en Config/Core.php).
     * Se guarda en BD junto a cada fichero para que el cliente pueda
     * construir su URL de lectura sin conocer la ruta física de disco.
     */
    public static function uploadsFirmasAlias(): string
    {
        return rtrim(Env::required('UPLOADS_FIRMAS_ALIAS'), '/') . '/';
    }

    public static function uploadsCdmuellesPath(): string
    {
        return self::resolveUploadsPath(Env::required('UPLOADS_CDMUELLES_PATH'));
    }

    /**
     * Las rutas de subida en .env son relativas (p.ej. "./storage/uploads/
     * cdmuelles/"), pensadas para anclarse a la raíz del proyecto. Con
     * `php -S`, el directorio de trabajo de PHP es el sitio desde el que se
     * lanzó el comando, no necesariamente la raíz del proyecto — así que una
     * ruta relativa sin resolver hace que mkdir()/move_uploaded_file()
     * escriban en un sitio inesperado sin avisar (la foto "se sube" y la
     * fila en BD se crea igualmente, pero el fichero físico no está donde se
     * espera). Se resuelve explícitamente contra la raíz del proyecto; una
     * ruta ya absoluta (Windows "C:\..." o Unix "/...") se respeta tal cual.
     */
    private static function resolveUploadsPath(string $configuredPath): string
    {
        $configuredPath = rtrim($configuredPath, '/') . '/';

        if (preg_match('#^(?:[A-Za-z]:[\\\\/]|/)#', $configuredPath) === 1) {
            return $configuredPath;
        }

        return dirname(__DIR__, 2) . '/' . ltrim($configuredPath, './');
    }

    /** Prefijo de URL pública equivalente a $alias_upload_cdmuelles ('/diskd/'). */
    public static function uploadsCdmuellesAlias(): string
    {
        return rtrim(Env::required('UPLOADS_CDMUELLES_ALIAS'), '/') . '/';
    }

    /** @return string[] */
    public static function entornos(): array
    {
        return ['Planificador', 'Configuración', 'cdmuelles'];
    }

    /**
     * Imágenes estáticas usadas por los informes PDF (logos, sellos, iconos).
     * A diferencia de las rutas de subida, son assets versionados del propio
     * proyecto (antes Informes/images/ junto a cada script de TCPDF), no
     * necesitan ser configurables por .env.
     */
    public static function informesImagesPath(): string
    {
        return dirname(__DIR__, 2) . '/public/assets/informes/';
    }
}
