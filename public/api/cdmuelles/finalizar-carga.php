<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\PlanigridCdController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? ($_SESSION['usuario'] ?? ''));

echo json_encode((new PlanigridCdController())->finalizarCarga($idplanigrid, $usuario));
