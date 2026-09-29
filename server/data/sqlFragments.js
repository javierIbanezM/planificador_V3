'use strict';

/**
 * Fragmentos SQL compartidos entre repositorios. Nacen de encontrar la MISMA
 * regla de negocio implementada por separado (y ya desincronizada) en varios
 * módulos — ver historial: planificador, cdmuellesPlanigrid y consignacion
 * calculaban "cuántos bultos tiene un pedido" cada uno a su manera.
 */

/**
 * "Bultos efectivos" de un pedido de `expediciones`: prioriza `palets`
 * cuando tiene un valor real (no NULL ni 0); si no, usa `bultos`.
 *
 * @param {string} [prefix] Alias de tabla con el punto incluido (p.ej.
 *   "exp." o "epc."). Cadena vacía si las columnas van sin cualificar.
 */
function bultosEfectivos(prefix = '') {
  return `ISNULL(NULLIF(${prefix}palets, 0), ${prefix}bultos)`;
}

module.exports = { bultosEfectivos };
