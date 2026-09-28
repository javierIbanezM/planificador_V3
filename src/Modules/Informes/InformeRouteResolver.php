<?php

namespace App\Modules\Informes;

/**
 * La tabla `informes` guarda el nombre del PHP legacy que generaba cada
 * informe (columna `Informe`, concatenada con `versioninforme`, ej.
 * "Hoja_Carga_" + "1" -> "Hoja_Carga_1.php"). El original construía esa URL
 * tal cual en el cliente (`./Informes/' + data.informe + data.version +
 * '.php'`); aquí no se puede tocar el contenido de esa tabla (son datos de
 * producción), así que se traduce el nombre legacy al fichero real
 * migrado en vez de reproducir la concatenación a ciegas.
 */
final class InformeRouteResolver
{
    private const MAPA = [
        'Hoja_Carga_1' => 'hoja-carga-1',
        'Hoja_Carga_2' => 'hoja-carga-2',
        'Hoja_Descarga_1' => 'hoja-descarga-1',
    ];

    public static function resolver(?string $informe, ?string $version): ?string
    {
        if ($informe === null || $version === null) {
            return null;
        }

        $clave = $informe . $version;
        return self::MAPA[$clave] ?? null;
    }
}
