<?php

/**
 * Entry point manual de la Hoja de Carga (plantilla 2 / ED:05).
 * Migrado de Informes/Hoja_Carga_2.php. La variante batch (antes
 * Hoja_Carga_2_Automate.php) está en bin/informes/hoja-carga-2-automate.php.
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Config\Database;
use App\Modules\Informes\HojaCarga2Renderer;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$idPlanigrid = (int) ($_SESSION['id'] ?? 0);

$renderer = new HojaCarga2Renderer(Database::connection());
$pdf = $renderer->render($idPlanigrid);

$pdf->Output('HOJA DE CARGA.pdf', 'I');
