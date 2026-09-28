<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\AppConfig;
use App\Modules\Auth\AuthController;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'failure', 'mensaje' => 'Método no permitido']);
    exit;
}

$entorno = (string) ($_POST['entorno'] ?? '');
$pin = (string) ($_POST['pin'] ?? '');

if (!in_array($entorno, AppConfig::entornos(), true) || $pin === '') {
    echo json_encode(['status' => 'failure', 'mensaje' => 'Datos de acceso inválidos']);
    exit;
}

$controller = new AuthController();

if ($entorno === 'cdmuelles') {
    echo json_encode($controller->loginPda($pin, $entorno));
} else {
    $nombre = (string) ($_POST['nombre'] ?? '');
    echo json_encode($controller->loginDesktop($pin, $nombre, $entorno));
}
