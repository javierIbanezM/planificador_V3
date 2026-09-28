<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\CalidadController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$pin = (string) ($_POST['pin'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? '');
$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');

echo json_encode((new CalidadController())->pinJefeSonda($pin, $usuario, $idplanigrid));
