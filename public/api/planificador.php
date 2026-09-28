<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Planificador\PlanificadorController;

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
$controller = new PlanificadorController();
$almacen = (string) ($_SESSION['almacen'] ?? '');

switch ($funcion) {
    case 'planigrid':
        echo json_encode($controller->planigrid($almacen));
        break;

    case 'agruparcd':
        $selectedRows = (string) ($_POST['selectedrows'] ?? '');
        $usuario = (string) ($_SESSION['usuario'] ?? '');
        echo json_encode($controller->agruparcd($selectedRows, $usuario));
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
