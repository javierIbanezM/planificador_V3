'use strict';

const database = require('../../config/database');
const CalendarioRepository = require('./repository');

/**
 * Réplica de src/Modules/Calendario/CalendarioController.php. El PHP usa
 * DateTime::createFromFormat('Y-m-d', $fechaConsultada) para normalizar la
 * fecha recibida (validando que venga en formato Y-m-d) antes de pasarla al
 * SP correspondiente; si el parseo falla, reenvía la cadena original tal
 * cual. Aquí se reproduce con una validación estricta por regex en vez de
 * un parseo con objeto Date (para evitar desfases de zona horaria).
 */
class CalendarioController {
  async repository() {
    return new CalendarioRepository(await database.connection());
  }

  /** @returns {{y:string,m:string,d:string}|null} */
  parseFechaYmd(fechaConsultada) {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaConsultada);
    return coincidencia ? { y: coincidencia[1], m: coincidencia[2], d: coincidencia[3] } : null;
  }

  mapFilas(filas) {
    return filas.map((fila) => ({
      tramoh: fila.Tramoh ?? null,
      Dia1: fila.Dia1 ?? '',
      Dia2: fila.Dia2 ?? '',
      Dia3: fila.Dia3 ?? '',
      Dia4: fila.Dia4 ?? '',
      Dia5: fila.Dia5 ?? '',
      Dia6: fila.Dia6 ?? '',
      Dia7: fila.Dia7 ?? '',
    }));
  }

  async calendarioReal(almacen, fechaConsultada) {
    const fecha = this.parseFechaYmd(fechaConsultada);
    const fechaFormateada = fecha ? `${fecha.y}-${fecha.m}-${fecha.d}` : fechaConsultada;

    const repository = await this.repository();
    const filas = await repository.calendarioReal(almacen, fechaFormateada);

    return this.mapFilas(filas);
  }

  async calendarioProgramado(almacen, fechaConsultada) {
    const fecha = this.parseFechaYmd(fechaConsultada);
    const fechaFormateada = fecha ? `${fecha.d}-${fecha.m}-${fecha.y}` : fechaConsultada;

    const repository = await this.repository();
    const filas = await repository.calendarioProgramado(almacen, fechaFormateada);

    return this.mapFilas(filas);
  }
}

module.exports = new CalendarioController();
