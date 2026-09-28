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

$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');
$albaran = (string) ($_POST['albaran'] ?? '');

echo json_encode((new ExpedicionesController())->contenedoresAlbaran($idplanigrid, $albaran));
