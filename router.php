<?php

/**
 * Router para el servidor embebido de PHP (`php -S localhost:8000 -t public
 * router.php`), SOLO para desarrollo local.
 *
 * En producción, IIS expone /uploads/firmas/ y /uploads/cdmuelles/ como
 * alias de servidor web apuntando directamente a storage/uploads/ (fuera
 * del document root de la app, ver AppConfig::uploadsFirmasAlias() /
 * uploadsCdmuellesAlias()). El servidor embebido de PHP no tiene alias: solo
 * sirve ficheros dentro de `public/`. Este router emula ese alias para que
 * las fotos subidas por la PDA/desktop se puedan ver en local sin mover el
 * almacenamiento físico dentro de public/.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

$aliases = [
    '/uploads/cdmuelles/' => __DIR__ . '/storage/uploads/cdmuelles/',
    '/uploads/firmas/' => __DIR__ . '/storage/uploads/firmas/',
];

foreach ($aliases as $prefix => $fisico) {
    if (str_starts_with($uri, $prefix)) {
        $archivo = $fisico . substr($uri, strlen($prefix));
        $real = realpath($archivo);

        // Evita salir de la carpeta de subidas vía "..".
        if ($real === false || !str_starts_with($real, realpath($fisico))) {
            http_response_code(404);
            return true;
        }

        $mime = match (strtolower(pathinfo($real, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };

        header('Content-Type: ' . $mime);
        readfile($real);
        return true;
    }
}

// Cualquier otra ruta: dejar que el servidor embebido la sirva normalmente
// (fichero estático de public/, o ejecutar el .php correspondiente).
return false;
