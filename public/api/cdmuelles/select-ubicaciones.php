<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\ExpedicionesController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$id = (string) ($_POST['id'] ?? '');
$almacen = (string) ($_SESSION['almacen'] ?? '');

echo json_encode((new ExpedicionesController())->selectUbicaciones($id, $almacen));
