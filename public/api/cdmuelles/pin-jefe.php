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

$pin = (string) ($_POST['pin'] ?? '');
$usuario = (string) ($_POST['usuario'] ?? '');
$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');
$observacion = (string) ($_POST['observacion'] ?? '');

$controller = new CalidadController();

switch ($observacion) {
    case 'permitirdiscrepancia':
        echo json_encode($controller->permitirDiscrepancia($pin, $usuario, $idplanigrid));
        break;

    case 'continuarquiznoaprobado':
        $numSonda = isset($_POST['numSonda']) ? (string) $_POST['numSonda'] : null;
        $causas = (string) ($_POST['causas'] ?? '');
        echo json_encode($controller->continuarQuizNoAprobado($pin, $usuario, $idplanigrid, $numSonda, $causas));
        break;

    default:
        // El original no producía ninguna salida para cualquier otro valor
        // de "observacion" (el if solo contemplaba esos dos casos).
        break;
}
