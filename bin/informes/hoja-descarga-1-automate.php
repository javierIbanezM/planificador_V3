<?php

/**
 * Proceso batch de la Hoja de Descarga (plantilla 1 / ED:05). Migrado de
 * Informes/Hoja_Descarga_1_Automate.php. Pensado para ejecutarse desde el
 * Programador de tareas de Windows:
 *
 *   php bin/informes/hoja-descarga-1-automate.php
 *
 * No depende de sesión de navegador: cada noche recorre todas las descargas
 * (`pg.[in-out] = 'IN'`) cuya fechafinCD fue "ayer", agrupadas por pg.id
 * (una descarga puede tener varios albaranes de preaviso), genera un PDF
 * por grupo con la misma plantilla que el entry point manual
 * (public/informes/hoja-descarga-1.php / HojaDescarga1Renderer), lo guarda
 * en la ruta de red del propietario y registra la ubicación del fichero en
 * PartnerWeb_v2.dbo.docsPreavisos (UPDATE si ya existía una fila para ese
 * preaviso/propietario, INSERT si no).
 */

require __DIR__ . '/../../bootstrap.php';

use App\Config\Database;
use App\Modules\Informes\HojaDescarga1Renderer;

set_time_limit(10000);

$db = Database::connection();

$sql = "SELECT
            pg.[id],
            pre.albaran,
            trze.propietario as propietario,
            'V:\' + trze.propietario +'\preavisos\descarga\' as ruta,
            FORMAT(sysdatetime(), 'yyyyMMddhhmmss') + '_' + replace(pg.consignacion, '/', '-') +'.pdf' as nombrefichero
        FROM [Planificador].[dbo].[planigrid] as pg
        INNER JOIN PartnerWeb_v2.dbo.empresas as trze ON trze.propietario = pg.propietario
        INNER JOIN preavisos as pre ON pre.idplanigrid = pg.id
        WHERE
        CONVERT(date, fechafinCD) = DATEADD(day, -1, CONVERT(date, SYSDATETIME()))
        AND pg.[in-out] = 'IN'
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
            'albaranes' => [],
        ];
    }

    $datosAgrupados[$id]['albaranes'][] = $row['albaran'];
}

$renderer = new HojaDescarga1Renderer($db);

foreach ($datosAgrupados as $id => $data) {
    $pdf = $renderer->render((int) $data['id']);

    if (!is_dir($data['ruta'])) {
        mkdir($data['ruta'], 0777, true);
    }

    $filename = $data['ruta'] . $data['nombrefichero'];
    $pdf->Output($filename, 'F');

    $rutaCarga = "\\\\AZA-SRV-FTPNEW.zar.local\\TRAZAL_documentacion\\{$data['propietario']}\\preavisos\\descarga\\{$data['nombrefichero']}";

    foreach ($data['albaranes'] as $albaran) {
        $stmtCheck = $db->prepare('SELECT COUNT(*) AS total FROM PartnerWeb_v2.dbo.docsPreavisos WHERE preaviso = ? and propietario = ?');
        $stmtCheck->execute([$albaran, $data['propietario']]);
        $total = (int) $stmtCheck->fetch()['total'];

        if ($total > 0) {
            $db->prepare('UPDATE PartnerWeb_v2.dbo.docsPreavisos
                  SET descarga = ?
                  WHERE preaviso = ? and propietario = ?')
                ->execute([$rutaCarga, $albaran, $data['propietario']]);
        } else {
            $db->prepare('INSERT INTO PartnerWeb_v2.dbo.docsPreavisos
                  (preaviso, propietario, albaranEntrega, calidad, cmrEntrada, packinglistEntrada, temperaturaIN, descarga, fecha)
                  VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, ?, SYSDATETIME())')
                ->execute([$albaran, $data['propietario'], $rutaCarga]);
        }
    }
}

echo count($datosAgrupados) . " hoja(s) de descarga procesadas.\n";
