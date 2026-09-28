<?php

/**
 * Entry point manual de la Hoja de Descarga (plantilla 1 / ED:05).
 * Migrado de Informes/Hoja_Descarga_1.php. La variante batch (antes
 * Hoja_Descarga_1_Automate.php) está en
 * bin/informes/hoja-descarga-1-automate.php.
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Config\Database;
use App\Modules\Informes\HojaDescarga1Renderer;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$idPlanigrid = (int) ($_SESSION['id'] ?? 0);

$renderer = new HojaDescarga1Renderer(Database::connection());
$pdf = $renderer->render($idPlanigrid);

$pdf->Output('Hoja de Descarga.pdf', 'I');
