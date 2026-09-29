'use strict';

const database = require('../../config/database');
const deliveryOrderApi = require('../../config/deliveryOrderApi');
const { CalidadRepository, ExpedicionesRepository } = require('./repository');

/**
 * Quiz de calidad / aprobaciones de encargado del kiosco PDA. Réplica de
 * src/Modules/Cdmuelles/CalidadController.php.
 */
class CalidadController {
  async repository() {
    return new CalidadRepository(await database.connection());
  }

  /**
   * Migrado de funcion=logsSondaManual. El original no devolvía respuesta
   * significativa (exit sin salida) cuando el pin no era de un encargado, ni
   * tampoco cuando la operación se completaba: es una llamada
   * "fire-and-forget" desde el cliente (introducirManualSonda no encadena
   * ningún .then a este fetch).
   */
  async logsSondaManual(pin, usuario, idplanigrid, numSonda) {
    const repository = await this.repository();

    if ((await repository.nombreEncargadoPorPin(pin)) === null) {
      return;
    }

    await repository.logsSondaManual(numSonda, pin, usuario, idplanigrid);
  }

  async pinJefeSonda(pin, usuario, idplanigrid) {
    const repository = await this.repository();

    if ((await repository.nombreEncargadoPorPin(pin)) === null) {
      return { status: 'NoEncargado' };
    }

    try {
      await repository.aprobarSondaJefe(pin, usuario, idplanigrid);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  /**
   * Migrado de funcion=PinJefe con observacion=permitirdiscrepancia: aprueba
   * finalizar la carga pese a discrepancia de bultos.
   */
  async permitirDiscrepancia(pin, usuario, idplanigrid) {
    const repository = await this.repository();

    if ((await repository.nombreEncargadoPorPin(pin)) === null) {
      return { status: 'NoEncargado' };
    }

    try {
      await repository.permitirDiscrepancia(pin, usuario, idplanigrid);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  /**
   * Migrado de funcion=PinJefe con observacion=continuarquiznoaprobado:
   * aprueba continuar pese a una respuesta "NO" en el quiz de calidad.
   */
  async continuarQuizNoAprobado(pin, usuario, idplanigrid, numSonda, causas) {
    const repository = await this.repository();

    if ((await repository.nombreEncargadoPorPin(pin)) === null) {
      return { status: 'NoEncargado' };
    }

    let causasTexto = causas !== '' ? causas : 'varias razones';
    const observacionExistente = (await repository.observacionCdmuellesQuizCalidad(idplanigrid)) ?? '';

    if (observacionExistente !== '' && numSonda !== null && numSonda !== '') {
      causasTexto += ', sonda manual ' + numSonda;
    }

    try {
      await repository.continuarQuizNoAprobado(pin, usuario, idplanigrid, causasTexto);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  /**
   * Migrado de funcion=enviarcheck: guarda las respuestas del quiz de
   * calidad (inserta la primera vez, actualiza las siguientes).
   */
  async enviarCheck(id, usuario, preguntasYRespuestas) {
    const repository = await this.repository();
    let countRespuestasNo = 0;
    const yaExisten = (await repository.contarRespuestasExistentes(id)) > 0;

    if (yaExisten) {
      for (const respuesta of preguntasYRespuestas) {
        const pregunta = String(respuesta.pregunta);
        const respuestaValor = respuesta.respuesta ?? null;

        if (respuestaValor === 'NO') {
          countRespuestasNo++;
        }

        await repository.actualizarRespuesta(id, pregunta, respuestaValor);

        if (pregunta === '4' && respuestaValor === 'NO') {
          const incidencia = await repository.incidenciaCheckCalidad(id);
          if (incidencia === 0) {
            await repository.enviarMailRespuestaNo(id, usuario);
          }
        }
      }

      if (countRespuestasNo === 0) {
        await repository.limpiarObservacionQuizCalidad(id);
      }

      await repository.logActualizaCheckCalidad(usuario, id);
      // Si el pedido ya tenía respuestas guardadas (p.ej. un reintento) pero
      // seguía en "Quiz de Calidad" sin avanzar, esto lo saca de ahí; si ya
      // había avanzado más allá, no hace nada (ver guarda en la propia
      // consulta).
      await repository.logInsertaCheckCalidadYActualizaEstado(usuario, id);

      return { status: 'Actualizado' };
    }

    for (const respuesta of preguntasYRespuestas) {
      await repository.insertarRespuesta(id, String(respuesta.pregunta), respuesta.respuesta ?? null);
    }

    await repository.logInsertaCheckCalidadYActualizaEstado(usuario, id);

    return { status: 'Insertado' };
  }
}

/**
 * Bultos/expediciones del kiosco PDA. Réplica de
 * src/Modules/Cdmuelles/ExpedicionesController.php.
 */
class ExpedicionesController {
  async repository() {
    return new ExpedicionesRepository(await database.connection());
  }

  /**
   * Contenedores esperados de un albarán, consultados al API de contenedores
   * (server/config/deliveryOrderApi.js) para verificarlos por escaneo en vez
   * del +/- manual. Se marca cuáles ya están verificados (guardado en
   * planigrid_cdmuelles, compartido entre dispositivos) para que abrir la
   * misma C/D desde otro dispositivo no permita volver a escanear uno ya
   * confirmado.
   */
  async contenedoresAlbaran(idplanigrid, albaran) {
    const repository = await this.repository();
    const datosPedido = await repository.propietarioYAlmacen(idplanigrid, albaran);

    if (datosPedido === null) {
      return { status: 'error', message: 'No se encontró la C/D.' };
    }

    try {
      let containers = await deliveryOrderApi.contenedoresDelPedido(
        datosPedido.propietario,
        albaran,
        datosPedido.almacen
      );

      // El API devuelve una fila por cada línea de referencia dentro del
      // contenedor (un mismo contenedor/pallet puede llevar varias
      // referencias distintas), no una fila por contenedor físico. Se
      // deduplica aquí por "container" para que un único escaneo se pinte
      // una sola vez, en vez de una vez por línea.
      const containersUnicos = new Map();
      for (const c of containers) {
        if (!containersUnicos.has(c.container)) {
          containersUnicos.set(c.container, c);
        }
      }
      containers = Array.from(containersUnicos.values());

      const verificadosFilas = await repository.contenedoresVerificados(idplanigrid, albaran);
      const verificados = verificadosFilas.map((fila) => fila.contenedor);

      containers = containers.map((c) => ({
        ...c,
        verificado: verificados.includes(c.container),
      }));

      return { status: 'success', containers };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Solo los contenedores ya verificados de un albarán (sin llamar a
   * Whales) — pensado para refrescar antes de cada escaneo y así detectar lo
   * que haya verificado otro dispositivo, sin el coste de repetir la
   * consulta al API externo cada vez.
   */
  async contenedoresVerificados(idplanigrid, albaran) {
    const repository = await this.repository();
    const filas = await repository.contenedoresVerificados(idplanigrid, albaran);

    return { status: 'success', verificados: filas.map((fila) => fila.contenedor) };
  }

  async incrementarBultos(idplanigrid, albaran, usuario, playa, contenedor = null) {
    const repository = await this.repository();

    if (contenedor) {
      // Doble comprobación en servidor (no solo en el navegador): evita
      // contar dos veces el mismo contenedor si dos dispositivos lo
      // escanean casi a la vez, antes de que a ninguno le diera tiempo a
      // refrescar la lista.
      const yaVerificadosFilas = await repository.contenedoresVerificados(idplanigrid, albaran);
      const yaVerificados = yaVerificadosFilas.map((fila) => fila.contenedor);
      if (yaVerificados.includes(contenedor)) {
        return { status: 'error', message: 'Ese contenedor ya fue verificado (probablemente desde otro dispositivo).' };
      }
    }

    const reabrirCarga = await repository.fechaFinCd(idplanigrid);

    try {
      await repository.incrementarBulto(
        idplanigrid,
        albaran,
        usuario,
        playa !== '' ? playa : null,
        reabrirCarga,
        contenedor !== '' ? contenedor : null
      );
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  async decrementarBultos(idplanigrid, albaran, usuario) {
    const repository = await this.repository();
    const reabrirCarga = await repository.fechaFinCd(idplanigrid);

    try {
      await repository.decrementarBulto(idplanigrid, albaran, usuario, reabrirCarga);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  async quitarContenedor(idplanigrid, albaran, usuario, contenedor) {
    const repository = await this.repository();
    const reabrirCarga = await repository.fechaFinCd(idplanigrid);

    try {
      await repository.quitarContenedor(idplanigrid, albaran, usuario, contenedor, reabrirCarga);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: 'Error al ejecutar la consulta: ' + err.message };
    }
  }

  async selectUbicaciones(idplanigrid, almacen) {
    const repository = await this.repository();
    return repository.ubicaciones(idplanigrid, almacen);
  }

  async enviarDatosCdpq(id, bultos, usuario) {
    const repository = await this.repository();

    if ((await repository.contarExpedicionesSinBultos(id)) > 0) {
      return { resultado: 'NoCerrado' };
    }

    const totalBultos = await repository.totalBultosExpediciones(id);

    if (String(totalBultos) !== bultos) {
      await repository.logDiscrepanciaPq(usuario, bultos, id);
      return { resultado: 'Discrepancia' };
    }

    try {
      await repository.eliminarBultosPq(id, usuario);
    } catch (err) {
      return { resultado: 'error_delete' };
    }

    for (const pedido of await repository.pedidosDistintos(id)) {
      const maxBulto = await repository.bultosDelPedido(id, pedido);

      for (let i = 1; i <= maxBulto; i++) {
        try {
          await repository.insertarBultoPq(id, pedido, i, usuario);
        } catch (err) {
          return { resultado: 'error_insert' };
        }
      }
    }

    try {
      await repository.finalizarPorPq(id, usuario);
    } catch (err) {
      return { resultado: 'error_log' };
    }

    return { resultado: 'correcto' };
  }
}

module.exports = {
  calidad: new CalidadController(),
  expediciones: new ExpedicionesController(),
};
