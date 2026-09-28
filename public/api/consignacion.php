<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\Auth;
use App\Modules\Consignacion\ConsignacionController;

if (!Auth::check()) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'mensaje' => 'No autenticado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'mensaje' => 'Método no permitido']);
    exit;
}

$funcion = (string) ($_POST['funcion'] ?? '');
$controller = new ConsignacionController();
$usuario = (string) ($_SESSION['usuario'] ?? '');
$almacen = (string) ($_SESSION['almacen'] ?? '');

// Igual que en el original: 'dblclick_cab' fija el idplanigrid "activo" en
// sesión; las demás acciones (salvo eliminarFoto/cambiotemprango, que ya
// reciben su propio id) operan sobre ese mismo idplanigrid.
if ($funcion === 'dblclick_cab') {
    $_SESSION['id'] = (string) ($_POST['id'] ?? '');
}

$idplanigrid = (string) ($_SESSION['id'] ?? '');

header('Content-Type: application/json');

switch ($funcion) {
    case 'alertamail':
        echo json_encode($controller->alertamail($usuario, $idplanigrid));
        break;

    case 'dblclick_cab':
        echo json_encode($controller->cabecera($idplanigrid));
        break;

    case 'dblclick_datos':
        // No usar idplanigrid de sesión aquí: dblclick_cab y dblclick_datos
        // se disparan en paralelo desde el cliente, y si esta petición llega
        // antes de que dblclick_cab termine de actualizar $_SESSION['id'],
        // se devolvían los datos del registro anterior. Se usa el id
        // explícito de esta petición en vez del de sesión.
        echo json_encode($controller->datos((string) ($_POST['id'] ?? $idplanigrid)));
        break;

    case 'datosquizcalidad':
        echo json_encode($controller->datosQuizCalidad($idplanigrid));
        break;

    case 'selecttemprango':
        echo json_encode($controller->selectTempRango($idplanigrid));
        break;

    case 'logsdblclickconsignacion':
        echo json_encode($controller->logs($idplanigrid));
        break;

    case 'eliminarFoto':
        echo json_encode($controller->eliminarFoto((string) ($_POST['idfoto'] ?? ''), $usuario, $idplanigrid));
        break;

    case 'Desactalertamail':
        echo json_encode($controller->desactivarAlertaMail($usuario, $idplanigrid));
        break;

    case 'Actalertamail':
        echo json_encode($controller->activarAlertaMail($usuario, $idplanigrid));
        break;

    case 'desagruparcd':
        echo json_encode($controller->desagruparCd($idplanigrid, $usuario));
        break;

    case 'EliminarCD':
        echo json_encode($controller->eliminarCd());
        break;

    case 'EliminarDatosCD':
        echo json_encode($controller->eliminarDatosCd());
        break;

    case 'cambiosonda':
        echo json_encode($controller->cambiarSonda($idplanigrid, (string) ($_POST['estado'] ?? ''), $usuario));
        break;

    case 'cambiodatalogger':
        echo json_encode($controller->cambiarDatalogger($idplanigrid, (string) ($_POST['estado'] ?? ''), $usuario));
        break;

    case 'eliminamuelleasignado':
        echo json_encode($controller->eliminarMuelleAsignado($idplanigrid, $usuario));
        break;

    case 'cambiotemprango':
        $idParam = (string) ($_POST['id'] ?? $idplanigrid);
        echo json_encode($controller->cambiarTempRango(
            $_POST['temprango'] !== '' ? (string) $_POST['temprango'] : null,
            $idParam,
            $usuario,
            (string) ($_POST['text'] ?? '')
        ));
        break;

    case 'desasignarsalida':
        echo json_encode($controller->desasignarSalida($idplanigrid, $usuario));
        break;

    case 'asigsalida':
        echo json_encode($controller->asignarSalida($idplanigrid, $usuario));
        break;

    case 'desasignarllegada':
        echo json_encode($controller->desasignarLlegada($idplanigrid, $usuario));
        break;

    case 'asigllegada':
        echo json_encode($controller->asignarLlegada($idplanigrid, $usuario));
        break;

    case 'guardarcabeceramodal':
        echo json_encode($controller->guardarCabecera([
            'precinto' => (string) ($_POST['precinto'] ?? ''),
            'observacion' => (string) ($_POST['observacion'] ?? ''),
            'hLlegada' => (string) ($_POST['hLlegada'] ?? ''),
            'hSalida' => (string) ($_POST['hSalida'] ?? ''),
            'muelle' => (string) ($_POST['muelle'] ?? ''),
            'muelleReservado' => (string) ($_POST['muelleReservado'] ?? ''),
        ], $idplanigrid, $usuario, $almacen));
        break;

    case 'informecargadescarga':
        echo json_encode($controller->informeCargaDescarga($idplanigrid));
        break;

    case 'galeriaconsignacion':
        echo json_encode($controller->galeria($idplanigrid));
        break;

    case 'up_img_ofi':
        $files = $_FILES['image'] ?? ['name' => [], 'tmp_name' => []];
        echo json_encode($controller->subirImagenes($files, $idplanigrid, $usuario, (string) ($_POST['descripcion'] ?? '')));
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'mensaje' => 'Función no reconocida']);
}
