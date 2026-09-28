<?php

namespace App\Modules\Informes;

use App\Config\AppConfig;
use App\Data\Repository;
use PDO;
use TCPDF;

/**
 * "Hoja de Carga" (plantilla 1 / ED:04). Migrada de Informes/Hoja_Carga_1.php.
 * No tenía variante _Automate (a diferencia de Hoja_Carga_2).
 *
 * Todas las consultas usaban ya `sqlsrv_query($conn, $sql, [$id])` con
 * parámetro ligado, salvo el bloque ADR/LQ que interpolaba directamente
 * `$mostrar['peligrosidad']` (un valor leído de BD) en el SQL
 * (`... and (tipo = '$mostrar[peligrosidad]') ...`) — mismo patrón de
 * segundo orden que se corrigió en el resto del proyecto; aquí se ha
 * cambiado a parámetro ligado.
 */
final class HojaCarga1Renderer extends Repository
{
    public function render(int $id): TCPDF
    {
        $imagesPath = AppConfig::informesImagesPath();
        $db = $this->connection();

        $pdf = new class(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false) extends TCPDF {
            public PDO $db;
            public string $imagesPath = '';
            public int $idPlanigrid = 0;

            private function fetchOne(string $sql, array $params = []): ?array
            {
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
                $row = $stmt->fetch();
                return $row === false ? null : $row;
            }

            private function fetchAll(string $sql, array $params = []): array
            {
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
                return $stmt->fetchAll();
            }

            private function formatearFecha(mixed $valor, string $formato): string
            {
                if ($valor === null || $valor === '') {
                    return '';
                }

                if ($valor instanceof \DateTimeInterface) {
                    return $valor->format($formato);
                }

                $timestamp = is_string($valor) ? strtotime($valor) : false;

                return $timestamp !== false ? date($formato, $timestamp) : '';
            }

            public function Header(): void
            {
                $id = $this->idPlanigrid;
                $this->setJPEGQuality(100);
                $this->SetFont('helvetica', '', 8);
                $this->Image($this->imagesPath . 'logo.png', 20, 7, 48, 16, 'PNG', 'http://www.azalogistics.es/', '', true, 900, '', false, false, 0, false, false, false);
                $this->Image($this->imagesPath . 'chdriver.png', 19, 52, 5, 25, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);

                // Marca de agua si no está finalizada
                $mostrar = $this->fetchOne('SELECT fechafincd as finalizada FROM planigrid where id = ?', [$id]);
                if (!isset($mostrar['finalizada'])) {
                    $horizontal_alignments = ['L', 'C', 'R'];
                    $vertical_alignments = ['T', 'M', 'B'];
                    $x = 0;
                    $y = 70;
                    $w = 405;
                    $h = 150;
                    for ($i = 0; $i < 2; ++$i) {
                        $fitbox = $horizontal_alignments[$i] . ' ';
                        $x = 0;
                        for ($j = 0; $j < 1; ++$j) {
                            $fitbox[1] = $vertical_alignments[$j];
                            $this->Image($this->imagesPath . 'nofinalizado-marcadeagua.png', $x, $y, $w, $h, 'PNG', '', '', false, 300, '', false, false, 0, $fitbox, false, false);
                            $x += 32;
                        }
                        $y += 0;
                    }
                }

                // Tabla Cabecera
                $tbl = <<<EOD
<table border="1" cellpadding="2" nobr="true">
    <tr>
        <td rowspan="4"></td>
        <td style="border-bottom-color:white"></td>
        <td>COD: PSGC-06-F01</td>
    </tr>
    <tr>
        <td style="border-color:white" rowspan="3"><h1 style="color:#477CD0;text-align:center">HOJA DE CARGA</h1></td>
        <td>ED: 04</td>
    </tr>
    <tr>
    <td id="fecha">Fecha:
EOD;
                $fechaRows = $this->fetchAll(
                    "SELECT CONVERT(DATE, i.fecha) as fecha
FROM planigrid as pg INNER JOIN
Informes AS I ON i.idinforme = pg.idinforme and i.version = pg.versioninforme
WHERE pg.id = ?",
                    [$id]
                );
                foreach ($fechaRows as $mostrar) {
                    $tbl .= $this->formatearFecha($mostrar['fecha'] ?? null, 'd-m-Y');
                }

                $tbl .= <<<EOD
    </td>
    </tr>
    <tr>
    <td>Elaborado por Andrés Sánchez / IT</td>
    </tr>
</table>
EOD;
                $this->writeHTML($tbl, true, false, false, false, '');

                // Tabla Intermedia cabecera
                $tbl = <<<EOD
<table border="0"  nobr="true">
    <tr>
        <td width="125" align="left"><strong>Campo en Gris</strong></td>
        <td width="150">Rellenado por centralita / ROC</td>
        <td width="100"></td>
        <td width="50" rowspan="2">Nº Muelle Asignado:</td>
        <td width="50" rowspan="2" id="Muelle" border="1" style="background-color:#D0CECE;">
EOD;
                $muelleRows = $this->fetchAll('SELECT muelleasign FROM muellesasignados WHERE idplanigrid = ?', [$id]);
                foreach ($muelleRows as $mostrar) {
                    $tbl .= $mostrar['muelleasign'] !== null ? $mostrar['muelleasign'] : '';
                }

                $tbl .= <<<EOD
</td>
        <td width="30"></td>
        <td width="50" rowspan="2">Fecha De la Carga: </td>
        <td width="84" rowspan="2" id="Fechacarga" border="1" style="background-color:#D0CECE;">
EOD;
                $fechaLlegadaRows = $this->fetchAll('SELECT fechallegada FROM planigrid WHERE id = ?', [$id]);
                foreach ($fechaLlegadaRows as $mostrar) {
                    $tbl .= $this->formatearFecha($mostrar['fechallegada'], 'd-m-Y H:i');
                }

                $tbl .= <<<EOD
    </td>
    </tr>
    <tr>
        <td><strong>Campo en blanco</strong></td>
        <td>Rellenado por Operario</td>
    </tr>

</table>
EOD;
                $this->writeHTML($tbl, true, false, false, false, '');

                $style4 = [
                    'L' => ['width' => 0.1, 'cap' => 'round', 'join' => 'miter', 'dash' => 0, 'color' => [0, 0, 0]],
                    'T' => ['width' => 0.1, 'cap' => 'round', 'join' => 'miter', 'dash' => 0, 'color' => [0, 0, 0]],
                    'R' => ['width' => 0.1, 'cap' => 'round', 'join' => 'miter', 'dash' => 0, 'color' => [0, 0, 0]],
                    'B' => ['width' => 0.1, 'cap' => 'round', 'join' => 'miter', 'dash' => 0, 'color' => [0, 0, 0]],
                ];
                $this->Rect(40, 29, 8, 3, 'DF', $style4, [192, 192, 192]);
                $this->Rect(40, 32, 8, 3, 'DF', $style4, [255, 255, 255]);

                $mostrar = $this->fetchOne(
                    "SELECT DISTINCT
    r.numeroruta,
    r.conductorDni,
    r.conductorNombre,
    r.conductorApellidos,
    r.matricularemolque,
    r.matriculaTractora,
    r.conductortelefono,
    a.poblacion,
    pg.transportista,
    pg.precinto,
    CASE
        WHEN (SELECT COUNT(DISTINCT destino) FROM expediciones WHERE idplanigrid = pg.id) > 1 THEN 'Multiples destinos'
        ELSE (SELECT TOP 1 destino FROM expediciones WHERE idplanigrid = pg.id)
    END AS destino
FROM dbo.planigrid AS pg
LEFT JOIN dbo.rutas AS r ON r.propietario = pg.propietario
    AND (r.consignacion = pg.consignacion
    OR r.consignacion IN (SELECT ID FROM dbo.SplitString(pg.agrupacion_referencias, ',')))
LEFT JOIN almacenes AS a ON a.almacen = pg.almacen
WHERE pg.id = ?;",
                    [$id]
                ) ?? [];

                $conductortelefono = $mostrar['conductortelefono'] ?? '';
                $this->matricularemolque = $mostrar['matricularemolque'] ?? '';
                $this->matriculaTractora = $mostrar['matriculaTractora'] ?? '';
                $precinto = $mostrar['precinto'] ?? 'N/A';

                $numeroruta = $mostrar['numeroruta'] ?? '';
                $conductorNombre = $mostrar['conductorNombre'] ?? '';
                $conductorApellidos = $mostrar['conductorApellidos'] ?? '';
                $conductorDni = $mostrar['conductorDni'] ?? '';
                $poblacion = $mostrar['poblacion'] ?? '';
                $transportista = $mostrar['transportista'] ?? '';
                $destino = $mostrar['destino'] ?? '';

                $tbl = <<<EOD
<table border="1" nobr="true">
    <tr>
        <td align="center" width="120" height="35" style="background-color:#B4C6E7;font-size:12px;"><strong><a style="color:#477CD0;text-decoration: none;">DESTINO</a>/Nº DE RUTA:</strong></td>
        <td width="300" style="background-color:#D0CECE;font-size:12px;">$numeroruta</td>
        <td align="center" width="55" height="35" style="background-color:#D0CECE;font-size:12px;border-top-color: black;border-bottom-color:black">Precinto: </td>
        <td width="165" height="35" style="background-color:#D0CECE;font-size:12px;border-top-color: black;border-bottom-color:black;border-right-color:black">{$precinto}</td>
    </tr>
    <tr>
        <td width="45" rowspan="4" style="background-color:#D0CECE"></td>
        <td width="235" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black">NOMBRE Y APELLIDOS/NAME AND SURNAMES:</td>
        <td height="30" width="360" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$conductorNombre $conductorApellidos</td>
    </tr>
    <tr>
        <td width="40" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black">DNI/ID:</td>
        <td height="30" width="555" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$conductorDni</td>
    </tr>
    <tr>
        <td width="100" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black">TELEFONO/PHONE:</td>
        <td width="200" height="30" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$conductortelefono</td>
        <td width="125" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black"> LUGAR DE LA CARGA: (Población almacén AZAL)</td>
        <td height="30" width="170" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$poblacion</td>
    </tr>
    <tr>
        <td width="145" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black">EMPRESA DE TRANSPORTE: TRANSPORT AGENCY:</td>
        <td width="155" height="30" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$transportista</td>
        <td width="170" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-bottom-color:black"> Destino de la Mercancía/<a style="color:#477CD0;text-decoration: none;">Destination:</a> (Población ó País)</td>
        <td height="30" width="125" style="background-color:#D0CECE;border-left-color:#D0CECE;border-bottom-color:black;border-right-color:black">$destino</td>
    </tr>
</table>
EOD;
                $this->writeHTML($tbl, true, false, false, false, '');
            }

            public string $matricularemolque = '';
            public string $matriculaTractora = '';
        };

        $pdf->db = $db;
        $pdf->imagesPath = $imagesPath;
        $pdf->idPlanigrid = $id;

        $pdf->SetCreator(PDF_CREATOR);
        $pdf->SetAuthor('IT Aza Logistics / Andrés Sánchez');
        $pdf->SetTitle('Hoja de Carga AZA Logistics');
        $pdf->setFooterFont([PDF_FONT_NAME_DATA, '', PDF_FONT_SIZE_DATA]);
        $pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);
        $pdf->SetMargins(PDF_MARGIN_LEFT, 86, PDF_MARGIN_RIGHT);
        $pdf->SetHeaderMargin(PDF_MARGIN_HEADER);
        $pdf->SetFooterMargin(6.5);
        $pdf->SetAutoPageBreak(true, 8.7);
        $pdf->setImageScale(PDF_IMAGE_SCALE_RATIO);
        $pdf->AddPage();
        $pdf->SetFont('helvetica', '', 8);
        $pdf->setJPEGQuality(100);

        $pdf->Image($imagesPath . 'vehicle.png', 19, 86, 5, 25, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);
        $pdf->Image($imagesPath . 'mercanciacompatible.png', 80, 150, 29, 6, 'PNG', '', '', true, 900, '', false, false, 0, false, false, false);

        $mostrar = $this->fetchOne(
            "SELECT DISTINCT
pg.idtemprango AS temp,
tr.rango AS rango,
pid.value,
CASE
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 1 AND CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'Si'
    WHEN ISNUMERIC(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.')) = 0 OR CAST(REPLACE(REPLACE(pid.value, ',', '.'), '''', '.') AS DECIMAL) NOT BETWEEN CAST(SUBSTRING(tr.rango, 1, CHARINDEX(' - ', tr.rango) - 1) AS DECIMAL) AND CAST(SUBSTRING(tr.rango, CHARINDEX(' - ', tr.rango) + 3, CHARINDEX(' ºC', tr.rango) - CHARINDEX(' - ', tr.rango) - 3) AS DECIMAL) THEN 'No'
    ELSE NULL
END AS comparacion_temp

FROM dbo.planigrid AS pg
 INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
    LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
    LEFT JOIN temperaturasrangos as tr ON tr.id = pg.idtemprango
WHERE pg.id = ? and ino.tipo = 'temperatura'",
            [$id]
        ) ?? [];
        $temp = isset($mostrar['temp']) ? 'SI' : 'NO';
        $rango = $mostrar['rango'] ?? 'NO';
        $tempmedida = $mostrar['value'] ?? 'N/A';
        $comparaciontemp = $mostrar['comparacion_temp'] ?? 'N/A';

        $tbl = <<<EOD
<table border="1" nobr="true">
    <tr>
        <td width="45" rowspan="3" style="background-color:#D0CECE"></td>
        <td width="200" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-top-color:black;border-bottom-color:black">MATRÍCULA VEHÍCULO/<a style="color:#477CD0;text-decoration: none;">VEHICLE PLATE:</a></td>
        <td height="30" width="100" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:black">{$pdf->matriculaTractora}</td>
        <td height="30" width="205" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:#D0CECE"> <a style="color:#477CD0;text-decoration: none;">MATRÍCULA REMOLQUE/TRAILER PLATE:</a></td>
        <td height="30" width="90" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:black">{$pdf->matricularemolque}</td>
    </tr>
    <tr>
        <td width="310" height="30" style="background-color:#D0CECE;border-right-color:#D0CECE;border-top-color:black;border-bottom-color:black">¿VEHÍCULO CONTRATADO A TEMPERATURA CONTROLADA?: </td>
        <td height="30" width="20" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:black"><a style="color:#477CD0;text-decoration: none;">{$temp}</a></td>
        <td height="30" width="160" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:#D0CECE"> <a style="color:#477CD0;text-decoration: none;">TEMPERATURA CONTRATADA: </a></td>
        <td height="30" width="105" style="background-color:#D0CECE;border-left-color:#D0CECE;border-top-color:black;border-bottom-color:black;border-right-color:black"><a style="color:#477CD0;text-decoration: none;">{$rango}</a></td>
    </tr>
    <tr>
        <td width="310" height="30" style="border-right-color:white;border-top-color:black;border-bottom-color:black"><a style="color:#477CD0;text-decoration: none;">¿TEMPERATURA VEHÍCULO COINCIDE CON LA CONTRATADA?: </a></td>
        <td height="30" width="20" style="border-left-color:white;border-top-color:black;border-bottom-color:black;border-right-color:black"><a style="color:#477CD0;text-decoration: none;"></a>{$comparaciontemp}</td>
        <td height="30" width="160" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:white"> <a style="color:#477CD0;text-decoration: none;">TEMPERATURA MEDIDA: </a></td>
        <td height="30" width="105" style="border-left-color:white;border-top-color:black;border-bottom-color:black;border-right-color:black"><a style="color:#477CD0;text-decoration: none;">{$tempmedida}</a></td>
    </tr>
</table>
EOD;
        $pdf->writeHTML($tbl, true, false, false, false, '');

        // Tabla Checks y observación
        $checksRows = $this->fetchAll(
            "SELECT
ino.campohtml,
pid.value
FROM [Planificador].[dbo].planigrid as pg INNER JOIN
informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme LEFT JOIN
planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
WHERE ino.tipo = 'quizcalidad' and pg.id = ?",
            [$id]
        );
        $mostrarobservacion = $this->fetchOne(
            "SELECT
ISNULL(pid.value, '') + ' ' + ISNULL(pg.observacioncdmuelles, '') + ' ' + ISNULL(pg.observacioncdmuellesquizcalidad, '') as value
FROM [Planificador].[dbo].planigrid as pg INNER JOIN
informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme LEFT JOIN
planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
WHERE ino.tipo = 'quizcalidadobservacion' and pg.id = ?",
            [$id]
        ) ?? ['value' => ''];

        $primero = $checksRows[0] ?? ['campohtml' => '', 'value' => ''];
        $tbl = <<<EOD
<table border="1" nobr="true">
    <tr>
        <td  width="375" height="30" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9"><strong>EN RELACIÓN A LA CARGA DE LA MERCANCÍA, CONTESTAR:</strong></td>
        <td  width="265" height="30" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;font-size:9"><strong>CAMPO DE OBSERVACIONES</strong></td>
    </tr>
    <tr>
        <td width="350" height="30" style="background-color:white;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black">{$primero['campohtml']}</td>
        <td width="25" height="30" align="center" style="background-color:white;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black"><a style="color:#477CD0;text-decoration: none;">{$primero['value']}</a></td>
        <td rowspan="4" style="background-color:white;border-right-color:white;border-top-color:black;border-bottom-color:black;border-left-color:black"> {$mostrarobservacion['value']}</td>
    </tr>
EOD;
        foreach (array_slice($checksRows, 1) as $mostrar) {
            $tbl .= <<<EOD
    <tr>
        <td width="350" height="30" style="background-color:white;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black">{$mostrar['campohtml']}</td>
        <td width="25" height="30" align="center" style="background-color:white;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black"><a style="color:#477CD0;text-decoration: none;">{$mostrar['value']}</a></td>
    </tr>
EOD;
        }
        $tbl .= '</table>';
        $pdf->writeHTML($tbl, true, false, false, false, '');

        $html = '*<strong>SI SE DETECTA CUALQUIER INCIDENCIA EL SISTEMA REPORTARÁ POR MAIL AL RESPONSABLE DEL CLIENTE Y AL JEFE DE ALMACÉN AUTOMÁTICAMENTE, <a style="color:#477CD0;text-decoration: none;">SERÁN ELLOS QUIENES DECIDAN CONTINUAR CON LA CARGA EN CASO DE INCIDENCIA</a>*</strong><br>';
        $pdf->writeHTML($html, true, false, true, false, '');

        $mostrar = $this->fetchOne(
            "SELECT
COALESCE ((
  SELECT STRING_AGG(operario, ', ')
  FROM (
    SELECT DISTINCT
    usuario as operario
    from logs
    where tiporeferencia = 'idplanigrid' and referencia = pg.id and usuario <> 'WEB'
  ) operarios_unicos
), '') AS operarios,
pg.fechainforme as fechainicio,
pg.fechafincd
FROM planigrid_cdmuelles as pcd RIGHT OUTER JOIN
planigrid as pg ON pg.id = pcd.idplanigrid
WHERE pg.id = ?
GROUP BY pg.fechainforme, pg.id, fechafincd",
            [$id]
        ) ?? [];
        $fechainicio = $this->formatearFecha($mostrar['fechainicio'] ?? null, 'd-m-Y H:i');
        $fechafincd = $this->formatearFecha($mostrar['fechafincd'] ?? null, 'd-m-Y H:i');
        $operarios = $mostrar['operarios'] ?? '';

        $tbl = <<<EOD
<table border="1" nobr="true">
    <tr>
        <td  width="375" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9"><strong>USUARIOS INVOLUCRADOS EN LA CARGA</strong></td>
        <td  width="265" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;font-size:9"><strong>TIEMPO DE CARGA</strong></td>
    </tr>
    <tr>
        <td height="25" rowspan="2"><strong> {$operarios} </strong></td>
        <td height="25" width="75" align="right" style="border-right-color:white;border-bottom-color:black;border-top-color:black;border-left-color:black">Hora de Inicio:</td>
        <td height="25" style="border-right-color:white;border-bottom-color:black;border-top-color:black;border-left-color:white">{$fechainicio}</td>
    </tr>
    <tr>
        <td height="25" align="right" style="border-right-color:white;border-bottom-color:black;border-top-color:black;border-left-color:black">Hora Final:</td>
        <td height="25" style="border-right-color:white;border-bottom-color:black;border-top-color:black;border-left-color:white">$fechafincd</td>
    </tr>
</table>
EOD;
        $pdf->writeHTML($tbl, true, false, false, false, '');

        // Tabla de pedidos
        $tbl = <<<EOD
<table border="0">
<thead>
    <tr>
        <td  width="130" align="center" style="background-color:#D0CECE;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black;">PEDIDOS CARGADOS</td>
        <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">ALBARANES</td>
        <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">Nº DE BULTOS</td>
        <td  width="40" style="border-right-color:black;border-bottom-color:white;border-top-color:white;border-left-color:white;"></td>
        <td  width="130" align="center" style="background-color:#D0CECE;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black;">PEDIDOS CARGADOS</td>
        <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">ALBARANES</td>
        <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">Nº DE BULTOS</td>
    </tr>
</thead>
EOD;

        $pedidosRows = $this->fetchAll(
            "SELECT
pedido,
albaran,
CASE
WHEN (estado = 6 or estado = 4) and ((left(bulto,charindex('/', bulto)-1) <> right(bulto,CHARINDEX('/',bulto)-1))) THEN CONCAT('**',convert(varchar(10), bulto),'**')
WHEN (estado = 6 or estado = 4) THEN convert(varchar(10), bulto)
WHEN estado = -3 THEN 'Desconsignado'
WHEN estado = 9 THEN 'Anulado'
END as bulto
FROM(SELECT
pedido,
exp.numSerieExpedicion as albaran,
CONCAT(MAX(pcd.bulto), '/', bultos) as bulto,
estado
FROM expediciones as exp LEFT JOIN
planigrid_cdmuelles as pcd ON pcd.idplanigrid = exp.idplanigrid and pcd.pedidoalbaran = exp.pedido
WHERE exp.idplanigrid = ?
GROUP BY pedido, estado, bultos, numserieexpedicion)a",
            [$id]
        );

        $pedidos_pares = [];
        $pedidos_impares = [];
        foreach ($pedidosRows as $posicion => $row) {
            if ($posicion % 2 === 0) {
                $pedidos_pares[] = $row;
            } else {
                $pedidos_impares[] = $row;
            }
        }
        $maxCount = max(count($pedidos_impares), count($pedidos_pares));

        for ($i = 0; $i < $maxCount; $i++) {
            $tbl .= '<tr>';
            if ($i < count($pedidos_pares)) {
                $tbl .= <<<EOD
            <td width="130" align="center" style="background-color:#D0CECE;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black;">{$pedidos_pares[$i]['pedido']}</td>
            <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">{$pedidos_pares[$i]['albaran']}</td>
            <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">{$pedidos_pares[$i]['bulto']}</td>
            <td  width="40" style="border-right-color:white;border-bottom-color:white;border-top-color:white;border-left-color:white;"></td>
EOD;
            } else {
                $tbl .= '<td></td><td></td><td></td><td></td>';
            }

            if ($i < count($pedidos_impares)) {
                $tbl .= <<<EOD
            <td  width="130" align="center" style="background-color:#D0CECE;border-right-color:black;border-top-color:black;border-bottom-color:black;border-left-color:black;">{$pedidos_impares[$i]['pedido']}</td>
            <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">{$pedidos_impares[$i]['albaran']}</td>
            <td  width="85" align="center" style="border-left-color:black;border-top-color:black;border-bottom-color:black;border-right-color:black;">{$pedidos_impares[$i]['bulto']}</td>
EOD;
            } else {
                $tbl .= '<td></td><td></td><td></td><td></td>';
            }

            $tbl .= '</tr>';
        }
        $tbl .= '</table>';
        $pdf->writeHTML($tbl, true, false, false, false, '');

        // Infografías (fotos subidas por el operario)
        $imagenesRows = $this->fetchAll(
            "SELECT
concat(rutafisica, fichero) as rutafichero,
extension,
descripcion
FROM planigrid_cdmuelles_uploads
WHERE idplanigrid = ? and tipo = 'IMG'
ORDER BY CASE descripcion
        WHEN 'INICIAL' THEN 1
        WHEN 'TRANSCURSO' THEN 2
        WHEN 'FINAL' THEN 3
        WHEN 'EXTRA' THEN 4
        ELSE 5
    END",
            [$id]
        );

        if ($imagenesRows !== []) {
            $pdf->setPrintHeader(false);
            $pdf->SetMargins(PDF_MARGIN_LEFT, '10', PDF_MARGIN_RIGHT);
            $pdf->AddPage();
            $pdf->writeHTML('<h1> INFOGRAFÍAS </h1>', true, false, true, false, 'C');

            $ancho_maximo = 150;

            foreach ($imagenesRows as $row) {
                if (!is_file($row['rutafichero'])) {
                    continue;
                }

                [$imagen_ancho, $imagen_alto] = getimagesize($row['rutafichero']);
                $relacion_aspecto = $imagen_ancho / $imagen_alto;
                $nuevo_ancho = $ancho_maximo;
                $nuevo_alto = $ancho_maximo / $relacion_aspecto;
                $x_centro = ($pdf->getPageWidth() - $nuevo_ancho) / 2;

                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->SetXY($x_centro, $pdf->GetY());
                $pdf->MultiCell($ancho_maximo, 0, $row['descripcion'] . ':', 0, 'J');
                $pdf->Image($row['rutafichero'], $x_centro, $pdf->GetY(), $nuevo_ancho, $nuevo_alto, $row['extension'], '', '', true, 150, '', false, false, 1, false, false, false);
                $pdf->SetY($pdf->GetY() + $nuevo_alto + 10);
            }
        }

        // ADR/LQ
        $mostrar = $this->fetchOne('SELECT peligrosidad FROM planigrid WHERE id = ?', [$id]) ?? [];
        $peligrosidad = $mostrar['peligrosidad'] ?? null;

        if ($peligrosidad !== null) {
            $pdf->setPrintHeader(true);
            $pdf->SetMargins(PDF_MARGIN_LEFT, 86, PDF_MARGIN_RIGHT);
            $pdf->SetFooterMargin(6.5);
            $pdf->SetFont('helvetica', '', 12);
            $pdf->writeHTML('<hr><a></a>', true, false, false, false, '');

            if (str_contains($peligrosidad, 'ADR')) {
                $tbl = $this->tablaAdr($id, $peligrosidad, $pdf);
            } elseif (str_contains($peligrosidad, 'LQ')) {
                $tbl = $this->tablaLq($id, $peligrosidad, $pdf);
            } else {
                $tbl = '';
            }

            $pdf->writeHTML($tbl, true, false, false, false, '');
        }

        return $pdf;
    }

    /**
     * Bloque "CUMPLIMENTAR PARA MERCANCÍA ADR": comprobaciones previas,
     * durante y al final de la carga, más firma del conductor.
     */
    private function tablaAdr(int $id, string $peligrosidad, TCPDF $pdf): string
    {
        $peligrosidadEsc = htmlspecialchars($peligrosidad, ENT_QUOTES);
        $tbl = <<<EOD
        <table border="1" nobr="true">
            <tr>
                <td colspan="2" width="320" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
                    CUMPLIMENTAR PARA MERCANCÍA <strong>$peligrosidadEsc</strong>
                </td>
                <td colspan="2" width="320" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
                    <strong>1. CORRECTO EQUIPAMENTO DEL VEHÍCULO: SI/NO</strong>
                </td>
            </tr>
            <tr>
                <td colspan="4" align="justify" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">El transportista mediante su firma, confirma que tiene los componentes que se muestran a continuación y en caso de no tener alguno de ellos, lo comunicará a la persona de administración antes de salir de las instalaciones de Aza Logistics: Extintores; Calzos para ruedas; Caja de herramientas; 2 señales de advertencia autoportantes; Líquido aclarador de ojos; Guantes protectores; Chaleco reflectante; Aparato de iluminación; Equipo de protección ocular; Pala; Obturador de entrada al alcantarillado; Recipiente colector; Mascarilla de Emergencia (Sólo para tóxicos); Dispositivo para facilitar la estiba, apuntalamiento o blocaje de los bultos.</td>
            </tr>
            <tr>
                <td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
                    <strong>2. COMPROBACIONES PREVIAS A LA CARGA</strong>
                </td>
            </tr>

EOD;
        $tbl .= $this->filasSeccion($id, $peligrosidad, 'PREVIAS', $pdf, 25);

        $tbl .= <<<EOD
<tr>
<td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
    <strong>3. COMPROBACIONES DURANTE LA CARGA</strong>
</td>
</tr>

EOD;
        $tbl .= $this->filasSeccion($id, $peligrosidad, 'DURANTE', $pdf, 25);

        $tbl .= <<<EOD
<tr>
<td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
    <strong>4. COMPROBACIONES FINAL DE LA CARGA</strong>
</td>
</tr>
EOD;
        $tbl .= $this->filasSeccion($id, $peligrosidad, 'FINAL', $pdf, 25);

        $operarios = $this->operariosPlanigrid($id);

        $tbl .= <<<EOD
<tr>
<td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
    <strong>5. ENTREGA DE CARTA DE PORTE: SI/NO</strong>
</td>
</tr>
<tr>
<td colspan="2" width="320" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">Firmado el Conductor</td>
<td colspan="2" width="320" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">Nombre y apellidos Responsable Carga / descarga (AZAL)</td>
</tr>
<tr>
<td width="320" height="50" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
EOD;

        $firma = $this->fetchOne(
            "SELECT TOP 1
CONCAT(rutafisica, fichero) AS rutafichero
FROM
planigrid_cdmuelles_uploads
WHERE
idplanigrid = ?
AND tipo = 'FIRMAIMG'
AND descripcion = 'FIRMAADR'
ORDER BY
fecha DESC",
            [$id]
        );
        $firma_conductor = $firma['rutafichero'] ?? '';

        $y_position = $pdf->GetY();
        $pdf->Cell(0, 10, '', 0, 1);
        $pdf->SetXY(0, $y_position + 108);
        if ($firma_conductor !== '') {
            $pdf->Image($firma_conductor, $pdf->GetX() + 15, $pdf->GetY(), 90, 14, '', '', '', false, 300, '', false, false, 0, false, false, false);
        }
        $pdf->SetXY(15, $y_position + 5);

        $tbl .= <<<EOD
</td>
<td width="320" height="30" align="justify" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9"><strong>$operarios</strong></td>
</tr>
</table>
EOD;

        return $tbl;
    }

    /**
     * Bloque "CUMPLIMENTAR PARA MERCANCÍA LQ": comprobaciones previas y al
     * final de la carga (sin bloque intermedio "DURANTE" ni firma).
     */
    private function tablaLq(int $id, string $peligrosidad, TCPDF $pdf): string
    {
        $peligrosidadEsc = htmlspecialchars($peligrosidad, ENT_QUOTES);
        $tbl = <<<EOD
        <table border="1" nobr="true">
            <tr>
                <td colspan="4" align="center" style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
                    CUMPLIMENTAR PARA MERCANCÍA <strong>$peligrosidadEsc</strong>
                </td>
            </tr>
            <tr>
                <td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
                    <strong>1. COMPROBACIONES PREVIAS A LA CARGA</strong>
                </td>
            </tr>

EOD;
        $tbl .= $this->filasSeccion($id, $peligrosidad, 'PREVIAS', $pdf, 24);

        $tbl .= <<<EOD
<tr>
<td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
    <strong>2. COMPROBACIONES FINAL DE LA CARGA</strong>
</td>
</tr>
EOD;
        $tbl .= $this->filasSeccion($id, $peligrosidad, 'FINAL', $pdf, 24);

        $operarios = $this->operariosPlanigrid($id);

        $tbl .= <<<EOD
<tr>
<td colspan="4" align="center" style="background-color:#D0CECE;border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">
    <strong>Nombre y apellidos Responsable Carga / descarga (AZAL)</strong>
</td>
</tr>
<tr>
<td colspan="4" height="30" align="justify"style="border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9"><strong>$operarios</strong></td>
</tr>
</table>
EOD;

        return $tbl;
    }

    /**
     * Filas "campohtml / value" a dos columnas para una sección
     * (PREVIAS/DURANTE/FINAL) del checklist ADR o LQ. En el original la
     * condición `tipo = '$mostrar[peligrosidad]'` interpolaba directamente
     * el valor leído de BD en el SQL; aquí va como parámetro ligado.
     */
    private function filasSeccion(int $id, string $peligrosidad, string $seccion, TCPDF $pdf, int $anchoValor): string
    {
        $rows = $this->fetchAll(
            "SELECT
pg.[in-out] as inout,
pg.id as idplanigrid,
ino.id,
ino.campohtml,
ino.tipo,
pid.value,
pg.precinto as precintocentralita,
tmr.rango,
ino.seccion
FROM planigrid as pg
INNER JOIN informes_objects as ino ON ino.idinforme = pg.idinforme and ino.version = pg.versioninforme
LEFT JOIN planigrid_inf_data as pid ON pid.idplanigrid = pg.id and pid.idinfobjects = ino.id
LEFT JOIN temperaturasrangos as tmr ON tmr.id = pg.idtemprango
WHERE pg.id = ? and tipo = ? and seccion = ?
ORDER BY
CASE
    WHEN ino.seccion IS NULL THEN 1
    WHEN ino.seccion = 'PREVIAS' THEN 2
    WHEN ino.seccion = 'DURANTE' THEN 3
    WHEN ino.seccion = 'FINAL' THEN 4
    ELSE 5
END,
ino.orden",
            [$id, $peligrosidad, $seccion]
        );

        $pdf->SetFont('helvetica', '', 8);
        $tbl = '';
        $counter = 0;
        foreach ($rows as $resultado) {
            $counter++;
            if ($counter % 2 === 1) {
                $tbl .= '<tr>';
            }
            $tbl .= <<<EOD
        <td width="295" style="border-left-color:black;border-right-color:black;border-top-color:black;border-bottom-color:black;font-size:9">{$resultado['campohtml']}</td>
        <td width="{$anchoValor}"><a style="color:#477CD0;text-decoration: none;"> {$resultado['value']}</a></td>
EOD;
            if ($counter % 2 === 0) {
                $tbl .= '</tr>';
            }
        }
        if ($counter % 2 === 1) {
            $tbl .= '</tr>';
        }

        return $tbl;
    }

    private function operariosPlanigrid(int $id): string
    {
        $row = $this->fetchOne(
            "SELECT
COALESCE (
    (SELECT STRING_AGG(operario, ', ')
  FROM (
    SELECT DISTINCT
    usuario as operario
    from logs
    where tiporeferencia = 'idplanigrid' and referencia = pg.id and usuario <> 'WEB'
  ) operarios_unicos
), '') AS operarios
FROM planigrid as pg
WHERE pg.id = ?",
            [$id]
        );

        return $row['operarios'] ?? '';
    }

    private function connection(): PDO
    {
        return $this->db;
    }
}
