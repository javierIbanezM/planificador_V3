<?php

// Sin Auth::check() a propósito, ver mostrar-muelles-adr.php.

require __DIR__ . '/../../../bootstrap.php';

use App\Modules\Celectronica\FirmaController;

header('Content-Type: application/json');

$firma = (string) ($_POST['firma'] ?? '');

echo json_encode((new FirmaController())->guardarFirma($firma));
