<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Configuracion\ConfiguracionController;

if (!Auth::check()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'mensaje' => 'Método no permitido']);
    exit;
}

$funcion = (string) ($_POST['funcion'] ?? '');
$usuario = (string) ($_SESSION['usuario'] ?? '');
$controller = new ConfiguracionController();

header('Content-Type: application/json');

switch ($funcion) {
    case 'crearalmacen':
        echo json_encode($controller->crearAlmacen($_POST, $usuario));
        break;

    case 'eliminaralmacen':
        echo json_encode($controller->eliminarAlmacen((string) ($_POST['almacen'] ?? ''), $usuario));
        break;

    case 'maestroalmacenes':
        echo json_encode($controller->maestroAlmacenes());
        break;

    case 'logsmaestro':
        echo json_encode($controller->logsMaestro((string) ($_POST['maestro'] ?? '')));
        break;

    case 'maestrovariablesdelsistema':
        echo json_encode($controller->maestroVariablesDelSistema());
        break;

    case 'MaestroAutomatizaciones':
        echo json_encode($controller->maestroAutomatizaciones());
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
