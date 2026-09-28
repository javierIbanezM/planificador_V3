<?php

/*
Migrado de index.php (raíz del proyecto original, página "Visor Global" /
selector de almacén). Sustituye a la prueba de humo de la Fase 0.

Corrección de seguridad respecto al original: el original hacía
`$_SESSION['almacen'] = $_POST['almacen']` sin validar que el almacén
existiera; aquí se valida contra la tabla `almacenes` (HomeController::
seleccionarAlmacen) antes de guardarlo en sesión.
*/

$page = 'Visor Global';

require __DIR__ . '/../bootstrap.php';

use App\Config\Auth;
use App\Config\AppConfig;
use App\Modules\Home\HomeController;

Auth::requireLogin('Planificador', AppConfig::baseUrl() . 'login.php');

$controller = new HomeController();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $almacenSolicitado = (string) ($_POST['almacen'] ?? '');

    if ($controller->seleccionarAlmacen($almacenSolicitado)) {
        $_SESSION['almacen'] = $almacenSolicitado;
        header('Location: ' . AppConfig::baseUrl() . 'planificador.php');
        exit;
    }

    // Almacén inválido/inexistente: no se guarda en sesión, se vuelve a
    // mostrar el listado.
}

$baseUrl = AppConfig::baseUrl();
$almacenes = $controller->almacenes();
?>
<!DOCTYPE html>
<html lang="es">

<head>
  <title>Visor Global - Planificador</title>
  <?php require __DIR__ . '/../templates/headers/main.php'; ?>
</head>

<body>
  <div class="text-center text-white py-2" style="font-size: 6vh;">Visor Global</div>

  <div class="container-fluid">
    <div class="row justify-content-center">
      <?php foreach ($almacenes as $mostraralmacenes): ?>
        <div class="col-auto mb-3">
          <div class="d-flex align-items-center p-2"
            style="background: rgba(255, 255, 255, 0.7); border-radius: 10px; min-width: 220px; max-width: 250px;">
            <form method="post" class="d-flex align-items-center m-0 p-0">
              <input type="hidden" name="almacen" value="<?php echo htmlspecialchars($mostraralmacenes['almacen'], ENT_QUOTES); ?>">
              <button type="submit" class="btn-link p-0 m-0 border-0 bg-transparent d-flex align-items-center">
                <img src="<?php echo $baseUrl; ?>assets/img/<?php echo htmlspecialchars(strtolower($mostraralmacenes['almacen']), ENT_QUOTES); ?>.png" class="img-thumbnail rounded me-2"
                  style="max-width: 95px;">
                <div class="ms-3">
                  <span class="h6 mb-0 text-black"><?php echo htmlspecialchars($mostraralmacenes['almacen'], ENT_QUOTES); ?></span>
                  <div class="small mb-1">Ocupados: <?php echo htmlspecialchars((string) $mostraralmacenes['estadomuelles'], ENT_QUOTES); ?></div>
                  <div class="small mb-1">En espera: <?php echo htmlspecialchars((string) $mostraralmacenes['CDSinMuelles'], ENT_QUOTES); ?></div>
                  <div class="small text-muted"><?php echo htmlspecialchars($mostraralmacenes['direccion'], ENT_QUOTES); ?></div>
                </div>
              </button>
            </form>

          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="row justify-content-center mt-4">
      <div class="col-10">
        <div class="p-3"
          style="background: rgba(255, 255, 255, 0.9); border-radius: 15px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h3 class="text-center mb-3" style="font-weight: 600;">Últimas Novedades</h3>
            <div style="max-height: 60%; overflow-y: auto;min-height:40vh;border-top:solid;">
              <h6>24/10/2024 13:30 - ROC - Atención en Cargas</h6>
              <p style="line-height: 1.6;">
                En aquellos casos que almacén comunique desviaciones con el check list de Carga, se deberá de proceder
                como
                se indica:
              </p>
              <ol style="line-height: 1.6;">
                <li>En el caso de que el transporte sea contratado por el Propietario <strong>(SUSMEDIOS)</strong>, se
                  debe
                  paralizar la carga y contactar con el Propietario, para proceder con su autorización o no. Si es
                  autorizado, se debe indicar el <strong>nombre y apellido</strong> de la persona del PROPIETARIO que autoriza la carga.
                </li>
                <li>Si el transporte es contratado por AZAL, será <strong>Calidad AZA</strong> quien autoriza o no su carga.</li>
              </ol>
            </div>
        </div>
      </div>
    </div>
  </div>

<?php require __DIR__ . '/../templates/footers/footer.php'; ?>

</body>

</html>
