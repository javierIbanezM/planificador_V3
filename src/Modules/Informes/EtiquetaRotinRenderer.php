<?php

namespace App\Modules\Informes;

use App\Config\AppConfig;
use App\Data\Repository;
use TCPDF;

/**
 * Etiqueta ROTIN (bulto dañado en recepción), formato A6, un único
 * idplanigrid por PDF. Migrada de Informes/Etiqueta_RotIN.php (no tenía
 * variante _Automate).
 */
final class EtiquetaRotinRenderer extends Repository
{
    /** Almacén resuelto por BD, para que el entry point nombre el fichero de salida. */
    public string $almacen = '';
    public string $referencia = '';

    public function render(int $idPlanigrid): TCPDF
    {
        $imagesPath = AppConfig::informesImagesPath();

        $pdf = new class(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false) extends TCPDF {
            public string $imagesPath = '';

            public function Header(): void
            {
                $this->setJPEGQuality(100);
                $this->SetFont('helvetica', '', 8);
                $this->Image($this->imagesPath . 'logo.png', 7, 7, 24, 8, 'PNG', 'http://www.azalogistics.es/', '', true, 900, '', false, false, 0, false, false, false);

                $tbl = <<<EOD
<table border="1" cellpadding="2" nobr="true">
    <tr>
        <td rowspan="3"></td>
        <td rowspan="3"><h4 style="color:#477CD0;text-align:center"><br>ETIQUETA ROTIN PLANIFICADOR</h4></td>
        <td>ED: 01</td>
    </tr>
    <tr>
        <td>COD: PSGC-03-ERP</td>
    </tr>
    <tr>
        <td>Elaborado por Andrés Sánchez / IT</td>
    </tr>
</table>
EOD;
                $this->writeHTML($tbl, true, false, false, false, '');
            }
        };
        $pdf->imagesPath = $imagesPath;

        $pdf->SetCreator(PDF_CREATOR);
        $pdf->SetAuthor('IT Aza Logistics / Andrés Sánchez');
        $pdf->SetTitle('Etiqueta Genérica Identificativa Logistics');
        $pdf->setFooterFont([PDF_FONT_NAME_DATA, '', PDF_FONT_SIZE_DATA]);
        $pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);
        $pdf->SetMargins(2, 20, 2);
        $pdf->SetHeaderMargin(2);
        $pdf->SetFooterMargin(0);
        $pdf->SetAutoPageBreak(true, 0);

        $pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
        $pdf->AddPage('P', 'A6');
        $pdf->SetFont('helvetica', '', 11);
        $pdf->setJPEGQuality(100);

        $sql = "SELECT
pg.almacen,
pg.[in-out] as inout,
pg.propietario,
CASE
    WHEN pg.[in-out] = 'IN' THEN pre.albaran
    ELSE pg.consignacion
END as Referencia,
CASE
    WHEN pg.[in-out] = 'OUT' THEN TRIM(pg.prueba)
    ELSE CONCAT(TRIM(pg.prueba), ' ', pre.comentarioalbaran)
END as observacion,
mas.muelleasign as muelle,
COALESCE(
            (SELECT
                    STRING_AGG(operario, ', ')
                FROM (SELECT DISTINCT
                        usuario as operario
                        FROM logs
                        WHERE tiporeferencia = 'idplanigrid' AND referencia = pg.id AND usuario <> 'WEB'
                        ) operarios_unicos
            ),
    '') AS usuarios,
pg.fechainforme as horainicio,
CONCAT((SELECT
COUNT(bulto) as bultos
FROM [Planificador].[dbo].[planigrid_cdmuelles]
where idplanigrid = pg.id
GROUP BY idplanigrid), CASE WHEN pg.[in-out] = 'IN' THEN '' ELSE ' / ' END, SUM(epc.bultos))
as bultos,
CASE
    WHEN pg.[in-out] = 'OUT' THEN (SELECT dbo.fn_DistinctWords(STRING_AGG(epc.playa, ' ')))
    WHEN pg.[in-out] = 'IN' THEN (SELECT dbo.fn_DistinctWords(
                                        (SELECT STRING_agg(ubicacion, ' ')
                                         FROM [Planificador].[dbo].[planigrid_cdmuelles]
                                         WHERE idplanigrid = pg.id)))
END as playa,
pg.fechafincd


FROM planigrid as pg
LEFT JOIN preavisos as pre ON pre.idplanigrid = pg.id
LEFT JOIN muellesasignados  as mas ON mas.idplanigrid = pg.id
LEFT JOIN expediciones as epc ON epc.idplanigrid = pg.id and epc.bultos IS not null


WHERE pg.id = ?
GROUP BY pg.propietario,
pg.almacen,
pg.[in-out],
pre.albaran,
pg.consignacion,
pg.prueba,
mas.muelleasign,
pg.id,
pg.fechainforme,
epc.bultos,
pg.prueba,
pre.comentarioAlbaran,
pg.fechafincd";
        $mostrar = $this->fetchOne($sql, [$idPlanigrid]) ?? [];

        $almacen = $mostrar['almacen'] ?? '';
        $propietario = isset($mostrar['propietario']) ? self::truncateString($mostrar['propietario'], 10) : '';
        $referencia = $mostrar['Referencia'] ?? '';

        $this->almacen = $almacen;
        $this->referencia = $referencia;

        $tbl = <<<EOD
<table border="0"  nobr="true">
    <tr><td colspan="3"></td></tr>
    <tr>
        <td colspan="3" width="360" align="center" style="font-size:25"><strong>¡ATENCIÓN!</strong></td>
    </tr>
    <tr><td colspan="3"></td></tr>
    <tr>
        <td colspan="3" align="center">BLOQUEAR ESTE BULTO EN LA RECEPCIÓN</td>
    </tr>
</table>
EOD;

        $pdf->writeHTML($tbl, true, false, false, false, '');
        $pdf->Image($imagesPath . 'exclamacion.png', 5, 22, 19, 17, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);
        $pdf->Image($imagesPath . 'exclamacion.png', 80, 22, 19, 17, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);

        $tbl = <<<EOD
<table style="background-color:#c1c1c1; border:8px solid black; border-collapse:collapse;" nobr="true">
    <!-- Fila 1 -->
    <tr>
        <td colspan="3" width="360" align="center" style="font-size:90; border:none;">ROTIN</td>
    </tr>
    <!-- Fila 2 -->
    <tr>
        <td colspan="3" style="border:none;"></td>
    </tr>
    <!-- Fila 3 -->
    <tr>
        <td colspan="3" style="border:none;"></td>
    </tr>
    <!-- Fila 4 -->
    <tr>
        <td colspan="3" style="font-size:12; border:none;">Propietario: $propietario</td>
    </tr>
    <!-- Fila 5 -->
    <tr>
        <td colspan="3" style="font-size:12; border:none;">Referencia: $referencia</td>
    </tr>
</table>
EOD;
        $pdf->writeHTML($tbl, true, false, false, false, '');

        $tbl = <<<EOD
<table nobr="true">
    <tr>
        <td colspan="3" width="360" align="center">- Coloca una etiqueta en cada bulto dañado -</td>
    </tr>
    <tr>
        <td colspan="3" width="360" align="center" style="font-size: 10">Imprime una etiqueta por cada bulto dañado que identifiques</td>
    </tr>
</table>
EOD;
        $pdf->writeHTML($tbl, true, false, false, false, '');

        return $pdf;
    }

    private static function truncateString(string $string, int $length = 10): string
    {
        if (strlen($string) > $length) {
            return substr($string, 0, $length) . '...';
        }

        return $string;
    }
}
