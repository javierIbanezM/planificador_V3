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

$id = (string) ($_POST['id'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? '');
$preguntasYRespuestas = json_decode((string) ($_POST['preguntasYRespuestas'] ?? '[]'), true);

if (!is_array($preguntasYRespuestas)) {
    $preguntasYRespuestas = [];
}

echo json_encode((new CalidadController())->enviarCheck($id, $usuario, $preguntasYRespuestas));
