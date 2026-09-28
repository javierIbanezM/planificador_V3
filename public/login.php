<?php

require __DIR__ . '/../bootstrap.php';

use App\Config\AppConfig;

$entorno = (string) ($_GET['entorno'] ?? '');

if (!in_array($entorno, AppConfig::entornos(), true)) {
    header('Location: ' . AppConfig::baseUrl() . 'login.php?entorno=Planificador');
    exit;
}

$baseUrl = AppConfig::baseUrl();
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - <?php echo htmlspecialchars($entorno, ENT_QUOTES) ?></title>
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/main.css">
    <script>const baseUrl = <?php echo json_encode($baseUrl) ?>;</script>
    <script src="<?php echo $baseUrl ?>assets/login.js"></script>
</head>

<body class="m0 p0" style="display: flex; flex-direction: column;">
    <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
        <?php if ($entorno === 'cdmuelles'): ?>
            <div class="login-container" style="background: rgba(255, 255, 255, 0.8); border-radius: 10px; padding: 20px; text-align: center;">
                <h1 id="page" data-entorno="<?php echo htmlspecialchars($entorno, ENT_QUOTES) ?>">Login</h1>
                <h6><?php echo htmlspecialchars($entorno, ENT_QUOTES) ?></h6>
                <div style="display: flex; align-items: flex-start;">
                    <form id="loginForm">
                        <input type="number" id="pin" placeholder="Pin en Whales">
                        <button onclick="loginpda()" class="btn btn-primary" type="button">Iniciar Sesión</button>
                    </form>
                </div>
            </div>
        <?php else: ?>
            <div class="login-container" style="background: rgba(255, 255, 255, 0.8); border-radius: 10px; padding: 20px; text-align: center;">
                <h1 id="page" data-entorno="<?php echo htmlspecialchars($entorno, ENT_QUOTES) ?>">Login</h1>
                <h6><?php echo htmlspecialchars($entorno, ENT_QUOTES) ?></h6>
                <div style="display: flex; align-items: flex-start;">
                    <div style="display: flex; flex-direction: column; margin-right: 5px;">
                        <input id="nombre" oninput="this.value = this.value.toUpperCase()" placeholder="Usuario en Whales" style="margin-bottom: 5px;">
                        <input type="password" id="pin" placeholder="Pin en Whales" style="margin-bottom: 5px;">
                    </div>
                    <button style="height:60px" onclick="logindesktop()" class="btn btn-primary" type="button">Iniciar Sesión</button>
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>

</html>
