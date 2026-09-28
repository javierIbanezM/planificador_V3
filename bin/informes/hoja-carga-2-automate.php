<?php

/**
 * Proceso batch de la Hoja de Carga (plantilla 2 / ED:05). Migrado de
 * Informes/Hoja_Carga_2_Automate.php. Pensado para ejecutarse desde el
 * Programador de tareas de Windows:
 *
 *   php bin/informes/hoja-carga-2-automate.php
 *
 * No depende de sesión de navegador: cada noche recorre todas las cargas
 * (`pg.[in-out] = 'OUT'`) cuya fechafinCD fue "ayer", agrupadas por
 * pg.id (una carga puede tener varios pedidos), genera un PDF por grupo con
 * la misma plantilla que el entry point manual
 * (public/informes/hoja-carga-2.php / HojaCarga2Renderer), lo guarda en la
 * ruta de red del propietario y registra la ubicación del fichero en
 * PartnerWeb_v2.dbo.docsPedidos (UPDATE si ya existía una fila para ese
 * pedido/propietario, INSERT si no).
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Database;
use App\Modules\Informes\HojaCarga2Renderer;

set_time_limit(10000);

$db = Database::connection();

$sql = "SELECT
            pg.[id],
            exp.pedido,
            trze.propietario as propietario,
            'V:\' + trze.propietario +'\pedidos\carga\' as ruta,
            FORMAT(sysdatetime(), 'yyyyMMddhhmmss') + '_' + replace(pg.consignacion, '/', '-') +'.pdf' as nombrefichero
        FROM [Planificador].[dbo].[planigrid] as pg
        INNER JOIN PartnerWeb_v2.dbo.empresas as trze ON trze.propietario = pg.propietario
        INNER JOIN Planificador.dbo.expediciones as exp ON exp.idplanigrid = pg.id
        WHERE
            CONVERT(date, fechafinCD) = DATEADD(day, -1, CONVERT(date, SYSDATETIME()))
            AND pg.[in-out] = 'OUT'
        ORDER BY 2 ASC";

$rows = $db->query($sql)->fetchAll();

$datosAgrupados = [];
foreach ($rows as $row) {
    $id = $row['id'];

    if (!isset($datosAgrupados[$id])) {
        $datosAgrupados[$id] = [
            'id' => $id,
            'propietario' => $row['propietario'],
            'ruta' => $row['ruta'],
            'nombrefichero' => $row['nombrefichero'],
            'pedidos' => [],
        ];
    }

    $datosAgrupados[$id]['pedidos'][] = $row['pedido'];
}

$renderer = new HojaCarga2Renderer($db);

foreach ($datosAgrupados as $id => $data) {
    $pdf = $renderer->render((int) $data['id']);

    if (!is_dir($data['ruta'])) {
        mkdir($data['ruta'], 0777, true);
    }

    $filename = $data['ruta'] . $data['nombrefichero'];
    $pdf->Output($filename, 'F');

    $rutaCarga = "\\\\AZA-SRV-FTPNEW.zar.local\\TRAZAL_documentacion\\{$data['propietario']}\\pedidos\\carga\\{$data['nombrefichero']}";

    foreach ($data['pedidos'] as $pedido) {
        $stmtCheck = $db->prepare('SELECT COUNT(*) AS total FROM PartnerWeb_v2.dbo.docsPedidos WHERE pedido = ? and propietario = ?');
        $stmtCheck->execute([$pedido, $data['propietario']]);
        $total = (int) $stmtCheck->fetch()['total'];

        if ($total > 0) {
            $db->prepare('UPDATE PartnerWeb_v2.dbo.docsPedidos
                      SET carga = ?
                      WHERE pedido = ? and propietario = ?')
                ->execute([$rutaCarga, $pedido, $data['propietario']]);
        } else {
            $db->prepare('INSERT INTO PartnerWeb_v2.dbo.docsPedidos
                      (pedido, propietario, albaranExpedicion, cmrSalida, packingListSalida, carga, albaranDest, temperaturaOUT, fecha)
                      VALUES (?, ?, NULL, NULL, NULL, ?, NULL, NULL, SYSDATETIME())')
                ->execute([$pedido, $data['propietario'], $rutaCarga]);
        }
    }
}

echo count($datosAgrupados) . " hoja(s) de carga procesadas.\n";
