<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\AppConfig;
use App\Config\Auth;

$baseUrl = AppConfig::baseUrl();

Auth::requireLogin('cdmuelles', $baseUrl . 'login.php');

if (isset($_SESSION['almacen'])) {
    header('Location: cargadescarga.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <title>Carga Descarga</title>
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/bootstrap-select.min.css">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/main.css">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/style.css">
</head>

<body class="m-0 vh-100 row justify-content-center align-items-center">
    <div id="Almacenes" class="col-auto text-center pt-4 pb-4"
        style="background: rgba(255, 255, 255, 0.8); border-radius:10px">
        <h1 style="margin-bottom: 0px;">Seleccionar almacén</h1>
        <h6>Indica el Almacén en el que vas a realizar la Carga/Descarga</h6>
    </div>

    <script>const baseUrl = <?php echo json_encode($baseUrl) ?>;</script>
    <script src="<?php echo $baseUrl ?>assets/cdmuelles/seleccion-almacen.js"></script>
</body>

</html>
