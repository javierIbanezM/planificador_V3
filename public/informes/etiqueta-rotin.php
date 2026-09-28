<?php

/**
 * Entry point manual de la Etiqueta ROTIN (bulto dañado en recepción).
 * Migrado de Informes/Etiqueta_RotIN.php. No tenía variante _Automate.
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Config\Database;
use App\Modules\Informes\EtiquetaRotinRenderer;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$idPlanigrid = isset($_GET['idplanigrid']) ? (int) $_GET['idplanigrid'] : (int) ($_SESSION['id'] ?? 0);

// F = fichero, I = mostrar en el navegador, D = descargar (igual que el original).
$salida = isset($_GET['salida']) ? (string) $_GET['salida'] : 'I';

$renderer = new EtiquetaRotinRenderer(Database::connection());
$pdf = $renderer->render($idPlanigrid);

$pdf->Output(
    'C:/impresion/' . $renderer->almacen . '/etiquetas/PLANIFICADOR/' . $renderer->referencia . '_EtiquetaRotIN.pdf',
    $salida
);
