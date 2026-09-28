'use strict';

const Repository = require('../../data/repository');

/**
 * Migrado de Resources/PHP/Calendario.php (funciones CalendarioReal y
 * CalendarioProgramado), vía src/Modules/Calendario/CalendarioRepository.php.
 * Ambas delegan en procedimientos almacenados; el SQL ya usaba parámetros
 * ligados en el original.
 *
 * Nota: el PHP también duplicaba dblclick_cab/dblclick_datos/
 * selecttemprango/logsdblclickconsignacion (variantes ligeramente distintas
 * de las de Modal_Consignacion.php), pero el modal de consignación
 * (comunes.js -> modal()) siempre llama al módulo Consignacion compartido
 * sin importar la página desde la que se invoque, así que esas copias eran
 * código muerto y no se migran — Calendario reutiliza el módulo Consignacion
 * compartido (views/modals/consignacion).
 */
class CalendarioRepository extends Repository {
  async calendarioReal(almacen, fechaConsultada) {
    const sqlText = `DECLARE @return_value int

        EXEC @return_value = [dbo].[spSelectCalendarioReal]
                @_Screenalmacenactivo = ?,
                @fechaconsultada = ?

        SELECT 'Return Value' = @return_value`;

    return this.fetchAll(sqlText, [almacen, fechaConsultada]);
  }

  async calendarioProgramado(almacen, fechaConsultada) {
    const sqlText = `DECLARE @return_value int
                EXEC @return_value = [dbo].[spSelectCalendarioProgramado]
                    @_Screenalmacenactivo = ?,
                    @fechaconsultada = ?
                SELECT 'Return Value' = @return_value`;

    return this.fetchAll(sqlText, [almacen, fechaConsultada]);
  }
}

module.exports = CalendarioRepository;
