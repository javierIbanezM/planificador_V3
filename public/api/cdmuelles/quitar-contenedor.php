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
$usuario = (string) ($_POST['usuario'] ?? '');
$contenedor = (string) ($_POST['contenedor'] ?? '');

echo json_encode((new ExpedicionesController())->quitarContenedor($idplanigrid, $albaran, $usuario, $contenedor));
