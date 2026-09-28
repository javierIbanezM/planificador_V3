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

$id = (string) ($_POST['id'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? '');
$descripcion = (string) ($_POST['descripcion'] ?? '');

if ($id === '' || !isset($_FILES['image']) || !is_array($_FILES['image']['name'] ?? null)) {
    echo json_encode([]);
    exit;
}

echo json_encode((new UploadsController())->subirImagenes($id, $usuario, $descripcion, $_FILES['image']));
