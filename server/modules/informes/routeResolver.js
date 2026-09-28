'use strict';

/**
 * Réplica de src/Modules/Informes/InformeRouteResolver.php.
 *
 * La tabla `informes` guarda el nombre del PHP legacy que generaba cada
 * informe (columna `Informe`, concatenada con `versioninforme`, ej.
 * "Hoja_Carga_" + "1" -> "Hoja_Carga_1.php"). El original construía esa URL
 * tal cual en el cliente (`./Informes/' + data.informe + data.version +
 * '.php'`); aquí no se puede tocar el contenido de esa tabla (son datos de
 * producción), así que se traduce el nombre legacy al fichero real migrado
 * en vez de reproducir la concatenación a ciegas.
 */

const MAPA = {
  Hoja_Carga_1: 'hoja-carga-1',
  Hoja_Carga_2: 'hoja-carga-2',
  Hoja_Descarga_1: 'hoja-descarga-1',
};

function resolver(informe, version) {
  if (informe === null || informe === undefined || version === null || version === undefined) {
    return null;
  }

  const clave = `${informe}${version}`;
  return MAPA[clave] || null;
}

module.exports = { resolver, MAPA };
