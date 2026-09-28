<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\AppConfig;
use App\Config\Auth;

$baseUrl = AppConfig::baseUrl();

if (isset($_GET['almacen'])) {
    $_SESSION['almacen'] = (string) $_GET['almacen'];
}

Auth::requireLogin('cdmuelles', $baseUrl . 'login.php');

if (!isset($_SESSION['almacen'])) {
    header('Location: index.php');
    exit;
}

$titulo = 'Carga Descarga';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <?php include __DIR__ . '/../../templates/headers/cdmuelles.php'; ?>
</head>

<body scroll="no" class="justify-content-center; align-items-center;overflow-y:hidden;margin:0;">

    <nav class="navbar navbar-expand-lg navbar-light bg-light"
        style="padding:0px;width: 100%; position: sticky; top: 0; left: 0; right: 0; z-index: 1000;height:9.6vh">
        <button style="margin:10px" class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav"
            aria-controls="navbarSupportedContent1" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <span style="color: black;margin-left:10px;margin-right:5px; text-align:center">
            <a style="color:black" id="usuario" onclick="cierresesion()">
                <?php echo htmlspecialchars((string) $_SESSION['usuario'], ENT_QUOTES) ?>
            </a>
            <br><a style="color:red" onclick="cierresesion()">Cerrar sesión</a>
        </span>
        <div class="collapse navbar-collapse" style="background-color:#f8f9fa;margin-top:-1px" id="navbarNav">
            <ul class="navbar-nav ml-auto pb-2">
                <li class="nav-item" style="align-self:center">
                    <a class="nav-link">
                        <button class="btn btn-light" onclick="inicio()" style="padding: 0px 45px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor"
                                class="bi bi-house" viewBox="0 0 16 16" style="display:inline;margin:5px">
                                <path
                                    d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z" />
                            </svg>
                            Inicio
                        </button>
                    </a>
                    <hr class="mt-0 mb-0" style="max-width:150px">
                </li>

                <li class="nav-item" style="align-self:center; display:none;" id="btncheckcalidad">
                    <a class="nav-link">
                        <button data-toggle="collapse" data-target="#navbarNav" onclick="botonquiz()"
                            class="btn btn-light" style="padding: 0px 45px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor"
                                class="bi bi-card-checklist" viewBox="0 0 16 16" style="margin:5px">
                                <path
                                    d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z" />
                                <path
                                    d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0M7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0" />
                            </svg>
                            Quiz
                        </button>
                    </a>
                    <hr class="mt-0 mb-0" style="max-width:150px">
                </li>

                <li class="nav-item" style="align-self:center; display:none;" id="btncamera">
                    <a class="nav-link">
                        <button data-toggle="collapse" data-target="#navbarNav" onclick="botonimagenextra()"
                            class="btn btn-light" style="padding: 0px 45px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="orange"
                                class="bi bi-camera-fill" viewBox="0 0 16 16" style="margin:5px">
                                <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                                <path
                                    d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" />
                            </svg>
                            Fotografías
                        </button>
                    </a>
                    <hr class="mt-0 mb-0" style="max-width:150px">
                </li>

                <li class="nav-item" style="align-self:center; display:none;" id="btnobservaciones">
                    <a class="nav-link">
                        <button data-toggle="collapse" data-target="#navbarNav" onclick="botonobservaciones()"
                            class="btn btn-light" style="padding: 0px 45px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor"
                                class="bi bi-card-text" viewBox="0 0 16 16">
                                <path
                                    d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z" />
                                <path
                                    d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8m0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5" />
                            </svg>
                            Observaciones
                        </button>
                    </a>
                    <hr class="mt-0 mb-0" style="max-width:150px">
                </li>

                <li class="nav-item" style="align-self:center">
                    <a class="nav-link">
                        <a style="margin-right: 10px; color: black;">Almacén: <a id="almacen"><?php echo htmlspecialchars((string) $_SESSION['almacen'], ENT_QUOTES) ?></a></a>
                    </a>
                </li>
            </ul>
        </div>
    </nav>

    <div id="Información" style="position:absolute;left:3%">
        <!-- Se escribiran datos dinamicamente -->
    </div>

    <div
        style="background: #ffffff96; width:100%; padding: 15px 10px;height: 87.1vh;display: flex; justify-content: center; align-items: center;">
        <div class="col-auto" id="ContenidoDinamico"
            style="text-align: center;border:1px; border-style: double; padding:10px; background:white; max-height:95%">
            <!-- Se escribiran datos dinamicamente -->
        </div>
    </div>

    <div id="overlay">
        <div id="loading-spinner"></div>
    </div>

</body>

<?php include __DIR__ . '/../../templates/footers/cdmuelles.php'; ?>

<script>
    const cdmuellesApiBase = baseUrl + 'api/cdmuelles/';
    const assetsBase = baseUrl + 'assets/';
</script>
<script src="<?php echo $baseUrl ?>assets/cdmuelles/cdmuelles-ordenes.js"></script>
<script src="<?php echo $baseUrl ?>assets/cdmuelles/cdmuelles-calidad.js"></script>
<script src="<?php echo $baseUrl ?>assets/cdmuelles/cdmuelles-fotos.js"></script>

</html>
