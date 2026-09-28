<?php

namespace App\Modules\Cdmuelles;

use App\Config\Database;

/**
 * Migrado de cdmuelles/functions.php (funcion=SelectImpresoras,
 * funcion=imprimirinformes). Este flujo depende de infraestructura de
 * planta muy específica del original: una URL de generación de PDF fija
 * (192.168.2.20) y un motor de impresión local vía Node
 * (C:\node_projects\pdfPrintEngine\app.js, carpeta C:\impresion\<almacen>\...).
 * Se traslada literal porque no es responsabilidad de esta migración
 * rediseñar la infraestructura de impresión; queda documentado como riesgo
 * en el informe de migración (rutas/host hardcodeados, sin timeout en curl,
 * sin manejo de errores de shell_exec).
 */
final class ImpresionController
{
    private const URL_BASE_INFORMES = 'http://192.168.2.20/Planificador/Informes';
    private const NODE_PRINT_ENGINE = 'C:\\node_projects\\pdfPrintEngine\\app.js';
    private const IMPRESORA_POR_DEFECTO = 'WP08';

    private ImpresionRepository $repository;

    public function __construct()
    {
        $this->repository = new ImpresionRepository(Database::connection());
    }

    /** @return array<int, array{impresora:mixed, descripcion:mixed}> */
    public function selectImpresoras(string $almacen): array
    {
        return $this->repository->impresorasActivas($almacen);
    }

    /**
     * El original solo maneja informe=EtiGen (el switch no tiene default);
     * cualquier otro valor de $informe no hace nada, igual que aquí.
     */
    public function imprimirInformes(
        string $informe,
        ?string $impresora,
        string $almacen,
        string $usuario,
        string $idplanigrid
    ): void {
        if ($informe !== 'EtiGen') {
            return;
        }

        $impresora = $impresora !== null && $impresora !== '' ? $impresora : self::IMPRESORA_POR_DEFECTO;
        $valor = $this->repository->valorEtiquetaRotulada($idplanigrid);

        $this->ejecutarCurl(self::URL_BASE_INFORMES . '/Etiqueta_Generica_info.php?salida=F&idplanigrid=' . $idplanigrid . '&almacen=' . $almacen);

        if ($valor === 'NO') {
            $this->ejecutarCurl(self::URL_BASE_INFORMES . '/Etiqueta_RotIN.php?salida=F&idplanigrid=' . $idplanigrid . '&almacen=' . $almacen);
        }

        $this->enviarAImpresora($almacen, $impresora);
        $this->repository->logImpresion($usuario, $informe, $impresora, $idplanigrid);
    }

    private function ejecutarCurl(string $url): string
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);

        $response = curl_exec($ch);
        $error = curl_error($ch);

        if ($response === false) {
            throw new \RuntimeException('Error al generar el PDF: ' . $error);
        }

        return $response;
    }

    private function enviarAImpresora(string $almacen, string $impresora): void
    {
        $carpeta = 'C:\\impresion\\' . $almacen . '\\etiquetas\\Planificador';

        $command = 'node '
            . escapeshellarg(self::NODE_PRINT_ENGINE) . ' '
            . escapeshellarg($carpeta) . ' '
            . escapeshellarg($impresora);

        shell_exec($command);
    }
}
