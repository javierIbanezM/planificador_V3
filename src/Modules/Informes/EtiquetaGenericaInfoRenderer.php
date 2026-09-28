<?php

namespace App\Modules\Informes;

use App\Config\AppConfig;
use App\Data\Repository;
use TCPDF;

/**
 * Etiqueta genérica identificativa de playa (formato A6), una página por
 * idplanigrid. Migrada de Informes/Etiqueta_Generica_info.php (no tenía
 * variante _Automate). La consulta original ya usaba un parámetro ligado
 * (`sqlsrv_query($conn, $sql, [$id])`), aquí se mantiene igual pero vía PDO.
 */
final class EtiquetaGenericaInfoRenderer extends Repository
{
    /**
     * Último almacén/referencia resueltos, para que el entry point nombre el
     * fichero de salida. Igual que en el original: si se piden varios ids a
     * la vez, quedan con el valor del último id procesado (no es un bug
     * introducido aquí, es el comportamiento tal cual estaba).
     */
    public string $almacen = '';
    public string $referencia = '';

    /**
     * @param int[] $idsPlanigrid
     */
    public function render(array $idsPlanigrid): TCPDF
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
        <td rowspan="3"><h4 style="color:#477CD0;text-align:center"><br>ETIQUETA DESCARGA PLANIFICADOR</h4></td>
        <td>ED: 02</td>
    </tr>
    <tr>
        <td>COD: PSGC-03-EDP</td>
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

        foreach ($idsPlanigrid as $id) {
            $pdf->AddPage('P', 'A6');
            $pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
            $pdf->SetFont('helvetica', '', 11);
            $pdf->setJPEGQuality(100);

            $style = [
                'border' => 0,
                'vpadding' => 'auto',
                'hpadding' => 'auto',
                'fgcolor' => [0, 0, 0],
                'bgcolor' => false,
                'module_width' => 1,
                'module_height' => 1,
            ];

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
pg.fechafincd,
pg.granel,
pg.paletsaportados,
(SELECT
pid.value
FROM planigrid_inf_data AS pid
INNER JOIN informes_objects as ino ON ino.id = idinfobjects
WHERE idplanigrid = pg.id and ino.idvariableaccion = 1) as respuestarotura


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
pg.fechafincd,
pg.granel,
pg.paletsaportados";
            $mostrar = $this->fetchOne($sql, [$id]) ?? [];

            $almacen = $mostrar['almacen'] ?? '';
            $propietario = isset($mostrar['propietario']) ? self::truncateString($mostrar['propietario'], 10) : '';
            $referencia = $mostrar['Referencia'] ?? '';
            $referenciareducida = isset($mostrar['Referencia']) ? self::truncateString($mostrar['Referencia'], 20) : '';
            $observacion = isset($mostrar['observacion']) ? strtolower($mostrar['observacion']) : '';
            $muelle = $mostrar['muelle'] ?? '';
            $usuarios = isset($mostrar['usuarios']) ? self::truncateString(strtolower($mostrar['usuarios']), 50) : '';
            $horacd = isset($mostrar['horainicio']) ? self::truncateString($this->formatearFecha($mostrar['horainicio'], 'd-m-y H:i:s'), 28) : '';
            $bultos = $mostrar['bultos'] ?? '';
            $playa = isset($mostrar['playa']) ? self::truncateString($mostrar['playa'], 12) : '';
            $fechafincd = !isset($mostrar['fechafincd']) ? '(No Culminado)' : '';
            $inout = $mostrar['inout'] ?? '';
            $respuestarotura = $mostrar['respuestarotura'] ?? '';

            // Descarga a granel (solo entrada/IN, preguntado tras la foto
            // final): si aplica, se añade una fila propia con los palets
            // aportados justo después de "Bultos". Para que la etiqueta no
            // crezca por encima de su tamaño original (fijo, A6), "Playa" se
            // mueve a la fila de "Almacén" (a su derecha), liberando una
            // fila. Cuando no hay granel esa fila liberada se rellena con una
            // fila en blanco: el resto de contenido (checkbox de
            // "Recepcionado", código de barras, etc.) se posiciona en
            // coordenadas absolutas fijas que asumen las 7 filas originales,
            // así que la tabla debe mantener siempre esa misma altura tanto
            // si hay granel como si no.
            $filaPaletsAportados = <<<EOD
    <tr>
        <td width="140"align="left">&nbsp;</td>
        <td>&nbsp;</td>
    </tr>
EOD;
            if (($mostrar['granel'] ?? null) == 1) {
                $paletsAportados = $mostrar['paletsaportados'] ?? '';
                $filaPaletsAportados = <<<EOD
    <tr>
        <td width="140"align="left"><strong>Palets aportados:</strong></td>
        <td>$paletsAportados</td>
    </tr>
EOD;
            }

            $this->almacen = $almacen;
            $this->referencia = $referencia;

            // La tabla mantiene exactamente la misma estructura de 2
            // columnas por fila que la etiqueta original (TCPDF recalcula el
            // ancho de TODAS las columnas de la tabla si alguna fila tiene un
            // número de columnas distinto, y eso partía el texto en varias
            // líneas). "Playa" se escribe aparte con Text() (no Write(), que
            // dispara el ajuste de línea/salto de página de TCPDF y corrompe
            // el cálculo de ancho de las tablas que se escriben después), en
            // una posición fija a la derecha de la fila de Almacén, fuera de
            // esta tabla.
            $tbl = <<<EOD
<table border="0"  nobr="true">
    <tr>
        <td width="65"align="left"><strong>Almacén:</strong></td>
        <td>$almacen</td>
    </tr>
    <tr>
        <td width="80"align="left"><strong>Propietario:</strong></td>
        <td>$propietario</td>
    </tr>
    <tr>
        <td width="77"align="left"><strong>Referencia:</strong></td>
        <td>$referenciareducida</td>
    </tr>
    <tr>
        <td width="48"align="left"><strong>Muelle:</strong></td>
        <td>$muelle</td>
    </tr>
    <tr>
        <td width="65"align="left"><strong>Hora C/D:</strong></td>
        <td>$horacd</td>
    </tr>
    <tr>
        <td width="50"align="left"><strong>Bultos:</strong></td>
        <td>$bultos $fechafincd</td>
    </tr>
    $filaPaletsAportados
</table>
EOD;
            $filaAlmacenY = $pdf->GetY();
            $pdf->writeHTML($tbl, true, false, false, false, '');
            $trasTablaY = $pdf->GetY();

            if ($playa !== '') {
                // Text() llama internamente a SetXY(), lo que deja el
                // "cursor" de TCPDF en $filaAlmacenY (la parte de arriba de
                // la tabla) en vez de donde terminó de escribirse la tabla;
                // si no se restaura, la siguiente tabla (referencia/IN/QR)
                // empieza a dibujarse desde ahí y descoloca toda la
                // etiqueta. Por eso se recupera $trasTablaY justo después.
                $pdf->SetFont('helvetica', 'B', 9);
                $pdf->Text(70, $filaAlmacenY + 1, "Playa: $playa");
                $pdf->SetFont('helvetica', '', 11);
                $pdf->SetY($trasTablaY);
            }

            $pdf->Image($imagesPath . 'check-recepcionado.png', 78, 51, 25, 6, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);

            if ($respuestarotura === 'NO') {
                $pdf->Image($imagesPath . 'atencion-rotin.png', 60, 21, 43, 29, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);
            }

            // El tamaño de letra de la referencia grande es fijo (25) en el
            // original, pensado para referencias cortas (p.ej. "26277"). Con
            // una referencia larga (p.ej. "HLBU9338626-PO046165") ese tamaño
            // no cabe en el ancho de la etiqueta y TCPDF la parte en dos
            // líneas, lo que descuadra la altura de la tabla y hace que la
            // etiqueta se vaya a una segunda página. Se reduce el tamaño de
            // letra según el ancho real del texto para que siempre quepa en
            // una sola línea, sea cual sea la longitud de la referencia.
            $fontSizeGrande = 25;
            $pdf->SetFont('helvetica', 'B', $fontSizeGrande);
            $anchoDisponibleReferencia = 95;
            $anchoTextoReferencia = $pdf->GetStringWidth($referencia);
            if ($anchoTextoReferencia > $anchoDisponibleReferencia) {
                $fontSizeGrande = max(10, (int) floor($fontSizeGrande * $anchoDisponibleReferencia / $anchoTextoReferencia));
            }

            // Mismo problema que con la referencia grande: el tamaño 105
            // fijo solo estaba pensado para "IN" (2 letras). Con "OUT" (3
            // letras) no cabe en la mitad de la tabla y TCPDF lo parte en
            // "O" / "UT" en dos líneas, mandando la etiqueta a una segunda
            // página — esto pasaba en TODAS las etiquetas de salida (OUT),
            // independientemente de la referencia.
            $fontSizeInOut = 105;
            $pdf->SetFont('helvetica', 'B', $fontSizeInOut);
            $anchoDisponibleInOut = 45;
            $anchoTextoInOut = $pdf->GetStringWidth($inout);
            if ($anchoTextoInOut > $anchoDisponibleInOut) {
                $fontSizeInOut = max(40, (int) floor($fontSizeInOut * $anchoDisponibleInOut / $anchoTextoInOut));
            }

            // SetFont() usado para medir el texto deja ese tamaño (hasta 105)
            // como fuente "ambiente" de TCPDF; aunque la tabla siguiente fija
            // su propio font-size por celda vía HTML, TCPDF usa la fuente
            // ambiente para calcular la altura de línea de las celdas vacías,
            // así que hay que devolverla a la que había antes de medir o la
            // tabla sale mucho más alta de lo que debería.
            $pdf->SetFont('helvetica', '', 11);

            $tbl = <<<EOD
<table border="0" nobr="true">
    <tr>
        <td colspan="2" style="border-top:1;border-bottom:1;font-size:$fontSizeGrande" align="center"><strong>$referencia</strong></td>
    </tr>
    <tr>
        <td style="border-right:1;font-size:$fontSizeInOut" align="center"><strong>$inout</strong></td>
        <td style="border-left:1;font-size:15" align="center"><strong></strong></td>
    </tr>
    <tr>
        <td align="center"><strong></strong></td>
        <td style="border-left:1;font-size:8" align="center"><strong>$referencia</strong></td>
    </tr>
</table>
EOD;

            $pdf->writeHTML($tbl, true, false, false, false, '');

            // La posición del código QR y de todo lo que viene después
            // (imagen "indicativo-playa", texto final) está pensada para una
            // etiqueta de tamaño físico FIJO (A6): no debe depender de cuánto
            // ocupe el texto de esta tabla. Al reducir el tamaño de letra de
            // "OUT" o de una referencia larga para que quepa en ancho, la
            // tabla renderizada queda más baja de lo habitual, y calcular el
            // QR a partir de esa altura variable ($pdf->GetY() real) lo
            // desplaza y lo solapa con el resto. Por eso se usa aquí la
            // altura fija que tenía la tabla en el diseño original (con "IN"
            // a tamaño 105 sin encoger), medida como offset constante desde
            // $trasTablaY, en vez de la altura real tras escribir la tabla.
            $newY = $trasTablaY + 67.03;
            $pdf->SetY($newY);

            $pdf->SetFont('helvetica', '', 25);
            // $width/$lines/$height se calculaban en el original pero nunca se
            // llegaban a usar para nada (variables muertas); se mantienen fuera
            // por no alterar el comportamiento de $qrY, que sí depende de $newY.
            $qrX = 55;
            $qrY = $newY - 55;

            $pdf->write2DBarcode($referencia, 'QRCODE,H', $qrX, $qrY, 50, 50, $style, 'N');

            $pdf->Image($imagesPath . 'indicativo-playa.png', 2, 119, 100, 20, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);

            $pdf->SetFont('helvetica', '', 10);
            $txt = '<a style="text-align:center"><br><br><br><br>Pegar una etiqueta en 2 lados de la playa descargada</a>';
            $pdf->writeHTML($txt, true, false, false, false, '');
        }

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
