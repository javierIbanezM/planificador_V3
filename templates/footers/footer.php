<?php
use App\Config\AppConfig;
$baseUrl = AppConfig::baseUrl();
?>
<html class="h-100">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body class="d-flex flex-column">

  <br><br>

  <footer class="footer mt-auto"
    style="position: fixed;left: 0;bottom: 0;width: 100%;background: rgb(0 1 21 / 0.7);padding-top: 5px;padding-bottom: 5px;">

    <div style="margin-left: 10vh; margin-right: 10vh">
      <div class="row float-left">
        <div class="col" style="color:white">
          Planificador de Cargas y Descargas
        </div>
      </div>
      <div class="row float-right">
        <div class="col" style="margin-top: 3px; font-size: 16px">
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>index.php">Visor global</a>
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>planificador.php">Planificador</a>
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>visor-almacen.php">Visor de
            almacén</a>
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>historico.php">Histórico</a>
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>calendario.php">Calendario</a>
          <a style="margin-right: 10px;color:white;" href="<?php echo $baseUrl; ?>cdmuelles/index.php" target="_blank">Carga/Descarga</a>
          <?php if (isset($_SESSION['almacen'])): ?>
            <a style="margin-right: 10px;color:white;">Almacén: <?php echo htmlspecialchars($_SESSION['almacen'], ENT_QUOTES); ?></a>
          <?php else: ?>
            <a style="margin-right: 10px;color:white;">Sin Almacén</a>
          <?php endif; ?>
          <?php if (isset($_SESSION['usuario'])): ?>
            <a style="margin-right: 10px;color:white;">Usuario: <?php echo htmlspecialchars($_SESSION['usuario'], ENT_QUOTES); ?> (<?php echo htmlspecialchars($_SESSION['rol'] ?? '', ENT_QUOTES); ?>)</a>
            <button type="button" class="btn btn-danger" style="margin-right: 10px;" onclick="cierresesion()">Cerrar sesión</button>
            <?php if (($_SESSION['rol'] ?? null) === 'Admin'): ?>
              <a href="<?php echo $baseUrl; ?>login.php?entorno=Configuraci%C3%B3n">
                <button type="button" class="btn btn-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" class="bi bi-gear-wide-connected" viewBox="0 0 16 16">
                    <path d="M7.068.727c.243-.97 1.62-.97 1.864 0l.071.286a.96.96 0 0 0 1.622.434l.205-.211c.695-.719 1.888-.03 1.613.931l-.08.284a.96.96 0 0 0 1.187 1.187l.283-.081c.96-.275 1.65.918.931 1.613l-.211.205a.96.96 0 0 0 .434 1.622l.286.071c.97.243.97 1.62 0 1.864l-.286.071a.96.96 0 0 0-.434 1.622l.211.205c.719.695.03 1.888-.931 1.613l-.284-.08a.96.96 0 0 0-1.187 1.187l.081.283c.275.96-.918 1.65-1.613.931l-.205-.211a.96.96 0 0 0-1.622.434l-.071.286c-.243.97-1.62.97-1.864 0l-.071-.286a.96.96 0 0 0-1.622-.434l-.205.211c-.695.719-1.888.03-1.613-.931l.08-.284a.96.96 0 0 0-1.186-1.187l-.284.081c-.96.275-1.65-.918-.931-1.613l.211-.205a.96.96 0 0 0-.434-1.622l-.286-.071c-.97-.243-.97-1.62 0-1.864l.286-.071a.96.96 0 0 0 .434-1.622l-.211-.205c-.719-.695-.03-1.888.931-1.613l.284.08a.96.96 0 0 0 1.187-1.186l-.081-.284c-.275-.96.918-1.65 1.613-.931l.205.211a.96.96 0 0 0 1.622-.434l.071-.286zM12.973 8.5H8.25l-2.834 3.779A4.998 4.998 0 0 0 12.973 8.5zm0-1a4.998 4.998 0 0 0-7.557-3.779l2.834 3.78h4.723zM5.048 3.967c-.03.021-.058.043-.087.065l.087-.065zm-.431.355A4.984 4.984 0 0 0 3.002 8c0 1.455.622 2.765 1.615 3.678L7.375 8 4.617 4.322zm.344 7.646.087.065-.087-.065z">
                    </path>
                  </svg>
                </button>
              </a>
            <?php endif; ?>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </footer>
</body>

</html>
