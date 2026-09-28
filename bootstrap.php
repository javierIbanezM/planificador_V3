<?php

/**
 * Punto de arranque único, incluido por cada fichero de public/.
 * Sustituye a Config/Core.php + Config/Conexion.php del proyecto original.
 */

require __DIR__ . '/vendor/autoload.php';

\App\Config\Env::load(__DIR__ . '/.env');
\App\Config\Auth::start();

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
