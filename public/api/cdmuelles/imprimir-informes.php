<?php

require __DIR__ . '/../../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Cdmuelles\ImpresionController;

header('Content-Type: application/json');

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

$informe = (string) ($_POST['informe'] ?? '');
$impresora = isset($_POST['impresora']) ? (string) $_POST['impresora'] : null;
$almacen = (string) ($_POST['almacen'] ?? ($_SESSION['almacen'] ?? ''));
$usuario = (string) ($_POST['usuario'] ?? ($_SESSION['usuario'] ?? ''));
$idplanigrid = (string) ($_POST['idplanigrid'] ?? '');

(new ImpresionController())->imprimirInformes($informe, $impresora, $almacen, $usuario, $idplanigrid);

// El original no generaba ninguna salida en esta acción (sin
// header/json_encode); se añade una respuesta mínima para que el
// response.json() del cliente no falle silenciosamente contra un cuerpo
// vacío.
echo json_encode(['status' => 'ok']);
