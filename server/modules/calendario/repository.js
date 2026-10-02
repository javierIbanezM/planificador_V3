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
  /**
   * SET DATEFIRST 1: los SP spSelectCalendarioReal/Programado calculan el
   * lunes de la semana consultada con DATEPART(DW, fecha) y comparan cada
   * día con DATENAME(DW, ...) = 'Lunes'/'Martes'/etc. DATEPART(DW, ...)
   * depende de @@DATEFIRST, que la conexión trae a 7 (domingo=1, el valor
   * por defecto de us_english) pese a `language: 'Español'` en
   * database.js — igual que ya pasaba con DATEFORMAT (ver comentario ahí),
   * el idioma de la conexión no arrastra TODOS los ajustes de sesión.
   * Con DATEFIRST=7, el "lunes" que calcula el SP cae en domingo, así que
   * ningún día coincide nunca con su nombre esperado y las columnas
   * Dia1-Dia7 salen siempre vacías (confirmado en vivo: con DATEFIRST=1 el
   * mismo SP devuelve datos reales correctamente).
   */
  async calendarioReal(almacen, fechaConsultada) {
    const sqlText = `SET DATEFIRST 1;
        DECLARE @return_value int

        EXEC @return_value = [dbo].[spSelectCalendarioReal]
                @_Screenalmacenactivo = ?,
                @fechaconsultada = ?

        SELECT 'Return Value' = @return_value`;

    return this.fetchAll(sqlText, [almacen, fechaConsultada]);
  }

  async calendarioProgramado(almacen, fechaConsultada) {
    const sqlText = `SET DATEFIRST 1;
                DECLARE @return_value int
                EXEC @return_value = [dbo].[spSelectCalendarioProgramado]
                    @_Screenalmacenactivo = ?,
                    @fechaconsultada = ?
                SELECT 'Return Value' = @return_value`;

    return this.fetchAll(sqlText, [almacen, fechaConsultada]);
  }
}

module.exports = CalendarioRepository;
