<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Shared\MuellesEstadoController;

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

header('Content-Type: application/json');
echo json_encode((new MuellesEstadoController())->estado((string) ($_SESSION['almacen'] ?? '')));
