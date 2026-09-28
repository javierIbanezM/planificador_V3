<?php

// Sin Auth::check() a propósito, ver mostrar-muelles-adr.php.

require __DIR__ . '/../../../bootstrap.php';

use App\Modules\Celectronica\FirmaController;

header('Content-Type: application/json');

$id = (string) ($_POST['id'] ?? '');

echo json_encode((new FirmaController())->entrarFirma($id));
