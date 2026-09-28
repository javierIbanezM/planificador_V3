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
$playa = isset($_POST['playa']) ? (string) $_POST['playa'] : '';
$contenedor = isset($_POST['contenedor']) ? (string) $_POST['contenedor'] : '';

echo json_encode((new ExpedicionesController())->incrementarBultos($idplanigrid, $albaran, $usuario, $playa, $contenedor));
