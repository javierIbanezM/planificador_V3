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
$granel = (string) ($_POST['granel'] ?? '');
$palets = isset($_POST['palets']) ? (string) $_POST['palets'] : null;

echo json_encode((new PlanigridCdController())->guardarGranel($idplanigrid, $granel, $palets));
