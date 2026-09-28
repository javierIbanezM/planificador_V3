<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Calendario\CalendarioController;

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
$fechaConsultada = (string) ($_POST['fechaconsultada'] ?? '');
$controller = new CalendarioController();

switch ($funcion) {
    case 'CalendarioReal':
        echo json_encode($controller->calendarioReal($almacen, $fechaConsultada));
        break;

    case 'CalendarioProgramado':
        echo json_encode($controller->calendarioProgramado($almacen, $fechaConsultada));
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
