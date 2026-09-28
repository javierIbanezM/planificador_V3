<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\ImpresionController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$almacen = (string) ($_SESSION['almacen'] ?? '');

echo json_encode((new ImpresionController())->selectImpresoras($almacen));
