<?php

/**
 * Entry point manual de la Hoja de Carga (plantilla 1 / ED:04).
 * Migrado de Informes/Hoja_Carga_1.php. No tenía variante _Automate.
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Config\Database;
use App\Modules\Informes\HojaCarga1Renderer;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$idPlanigrid = (int) ($_SESSION['id'] ?? 0);

$renderer = new HojaCarga1Renderer(Database::connection());
$pdf = $renderer->render($idPlanigrid);

$pdf->Output('HOJA DE CARGA.pdf', 'I');
