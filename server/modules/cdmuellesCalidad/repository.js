'use strict';

/**
 * Punto de entrada del módulo cdmuellesCalidad: reexporta los dos
 * repositorios en que se divide internamente (Calidad y Expediciones),
 * réplica de src/Modules/Cdmuelles/{CalidadRepository,ExpedicionesRepository}.php.
 */
const CalidadRepository = require('./calidadRepository');
const ExpedicionesRepository = require('./expedicionesRepository');

module.exports = { CalidadRepository, ExpedicionesRepository };
