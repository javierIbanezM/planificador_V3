<?php
/** @var string $page */
use App\Config\AppConfig;
$baseUrl = AppConfig::baseUrl();
?>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/bootstrap-select.min.css">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/main.css">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/style.css">
    <link rel="stylesheet" href="<?php echo $baseUrl ?>assets/csspropio.css">
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>page = '<?php echo htmlspecialchars($page ?? '', ENT_QUOTES) ?>'</script>
    <script>const baseUrl = <?php echo json_encode($baseUrl) ?>;</script>
    <script src="<?php echo $baseUrl ?>assets/bootstrap.min.js"></script>
    <script src="<?php echo $baseUrl ?>assets/comunes.js"></script>
    <div class="notification-container" style="margin-bottom:2.5%" id="notificationContainer"></div>
</head>
