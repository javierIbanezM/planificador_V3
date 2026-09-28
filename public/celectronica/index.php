<?php

require __DIR__ . '/../../bootstrap.php';

use App\Config\AppConfig;

/**
 * Sin guardia de sesión (Auth::check()) a propósito: en el original,
 * Config/Core.php excluía explícitamente $page === 'celectronica' del
 * control de login — es una tablet de firma ADR en planta pensada para que
 * el transportista la use sin credenciales, con "?almacen=" como único
 * contexto de acceso. Se preserva ese comportamiento; ver informe de
 * migración.
 */

$baseUrl = AppConfig::baseUrl();

if (!isset($_GET['almacen'])) {
    header('Location: ' . $baseUrl . 'login.php?entorno=Planificador');
    exit; // El original no cortaba la ejecución aquí; se añade por seguridad.
}

$_SESSION['almacen'] = (string) $_GET['almacen'];

$titulo = 'Centralita Electrónica';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <?php include __DIR__ . '/../../templates/headers/cdmuelles.php'; ?>
</head>

<body>

    <div
        style="background: #ffffff96; width:100%; padding: 15px 10px;height: 100vh;display: flex; justify-content: center; align-items: center;">
        <div class="col-auto" id="ContenidoDinamico"
            style="text-align: center;border:1px; border-style: double; padding:10px; background:white; max-height:85%;overflow-y:auto;width:100%">
            <!-- Se escribiran datos dinamicamente -->
        </div>
    </div>

    <script>
        const celectronicaApiBase = baseUrl + 'api/celectronica/';
    </script>
    <script src="<?php echo $baseUrl ?>assets/celectronica/celectronica.js"></script>
</body>

</html>
