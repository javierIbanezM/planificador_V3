<?php

/**
 * Sin Auth::check() a propósito: celectronica es una tablet de firma en
 * planta sin login (ver Config/Core.php del proyecto original, que excluía
 * explícitamente $page === 'celectronica' del guard de sesión). El único
 * control de acceso real es conocer la URL con ?almacen=. Ver informe de
 * migración para la discusión de este riesgo heredado.
 */

require __DIR__ . '/../../../bootstrap.php';

use App\Modules\Celectronica\FirmaController;

header('Content-Type: application/json');

$almacen = (string) ($_SESSION['almacen'] ?? '');

echo json_encode((new FirmaController())->mostrarMuellesAdr($almacen));
