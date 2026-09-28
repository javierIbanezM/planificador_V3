<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\VisorAlmacen\VisorAlmacenController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'mensaje' => 'Método no permitido']);
    exit;
}

$funcion = (string) ($_POST['funcion'] ?? '');
$almacen = (string) ($_SESSION['almacen'] ?? '');
$controller = new VisorAlmacenController();

switch ($funcion) {
    case 'visordealmacen_consigenlanave':
        echo json_encode($controller->consigEnLaNave($almacen));
        break;

    case 'visordealmacen_consignopreparadas':
        echo json_encode($controller->consigNoPreparadas($almacen));
        break;

    case 'visordealmacen_consigpreparadas':
        echo json_encode($controller->consigPreparadas($almacen));
        break;

    case 'visordealmacen_preavsinrecep':
        echo json_encode($controller->preavisosSinRecepcionar($almacen));
        break;

    case 'visordealmacen_preavporllegar':
        echo json_encode($controller->preavisosPorLlegar($almacen));
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
