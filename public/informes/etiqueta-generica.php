<?php

/**
 * Entry point manual de la Etiqueta Genérica (playa de descarga).
 * Migrado de Informes/Etiqueta_Generica_info.php. Acepta uno o varios
 * idplanigrid separados por coma vía ?idplanigrid=1,2,3 (una página A6 por
 * id); si no se indica, usa $_SESSION['id'] como hacía el original.
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Config\Database;
use App\Modules\Informes\EtiquetaGenericaInfoRenderer;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$idsPlanigrid = isset($_GET['idplanigrid'])
    ? array_map('intval', explode(',', (string) $_GET['idplanigrid']))
    : [(int) ($_SESSION['id'] ?? 0)];

// F = fichero, I = mostrar en el navegador, D = descargar (igual que el original).
$salida = isset($_GET['salida']) ? (string) $_GET['salida'] : 'I';

$renderer = new EtiquetaGenericaInfoRenderer(Database::connection());
$pdf = $renderer->render($idsPlanigrid);

$pdf->Output(
    'C:/impresion/' . $renderer->almacen . '/etiquetas/PLANIFICADOR/' . $renderer->referencia . '_Etiqueta_Generica_Info.pdf',
    $salida
);
