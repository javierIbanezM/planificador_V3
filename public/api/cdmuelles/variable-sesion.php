<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\SesionController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$opcion = (string) ($_POST['opcion'] ?? '');
$valor = (string) ($_POST['valor'] ?? '');

echo json_encode((new SesionController())->asignarVariableSesion($opcion, $valor));
