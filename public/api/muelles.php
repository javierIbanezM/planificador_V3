<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Muelles\MuellesController;

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
$controller = new MuellesController();
$usuario = (string) ($_SESSION['usuario'] ?? '');
$almacen = (string) ($_SESSION['almacen'] ?? '');
$muelle = (string) ($_POST['muelle'] ?? '');

header('Content-Type: application/json');

switch ($funcion) {
    case 'modal_infomuelle':
        echo json_encode($controller->infoMuelle($muelle, $almacen));
        break;

    case 'modal_infomuellereserva':
        echo json_encode($controller->infoMuelleReserva($muelle, $almacen));
        break;

    case 'modal_logsmuelles':
        echo json_encode($controller->logsMuelle($almacen, $muelle));
        break;

    case 'modal_consultaMuelleActivo':
        echo json_encode($controller->consultaMuelleActivo($muelle, $almacen));
        break;

    case 'ActivaMuelle':
        echo json_encode($controller->activarMuelle($muelle, $almacen, $usuario));
        break;

    case 'DesactivaMuelle':
        echo json_encode($controller->desactivarMuelle($muelle, $almacen, $usuario));
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
