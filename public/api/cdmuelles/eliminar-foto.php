<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\UploadsController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$idfoto = (string) ($_POST['idfoto'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? '');
$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');

echo json_encode((new UploadsController())->eliminarFoto($idfoto, $usuario, $idplanigrid));
