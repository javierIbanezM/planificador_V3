'use strict';

const fs = require('fs');
const database = require('../../config/database');
const appConfig = require('../../config/appConfig');
const ConsignacionRepository = require('./repository');

/**
 * Migrado de src/Modules/Consignacion/ConsignacionController.php. Cada
 * acción del dispatcher original ($_POST['funcion']) pasa a ser un método
 * de este controlador, invocado desde server/modules/consignacion/routes.js.
 */

/**
 * Réplica de src/Modules/Informes/InformeRouteResolver.php. La tabla
 * `informes` guarda el nombre del PHP legacy que generaba cada informe
 * (columna `Informe`, concatenada con `versioninforme`, ej. "Hoja_Carga_" +
 * "1" -> "Hoja_Carga_1"). No se puede tocar el contenido de esa tabla (son
 * datos de producción), así que se traduce el nombre legacy a la ruta real
 * migrada (montada por el módulo de informes) en vez de reproducir a ciegas
 * la concatenación que hacía el cliente original. Se duplica aquí (en vez de
 * importar el módulo de informes) para no acoplar este módulo a la
 * implementación interna de otro módulo desarrollado en paralelo.
 */
const MAPA_RUTAS_INFORMES = {
  Hoja_Carga_1: 'hoja-carga-1',
  Hoja_Carga_2: 'hoja-carga-2',
  Hoja_Descarga_1: 'hoja-descarga-1',
};

function resolverRutaInforme(informe, version) {
  if (informe === null || informe === undefined || version === null || version === undefined) {
    return null;
  }

  const clave = `${informe}${version}`;
  return MAPA_RUTAS_INFORMES[clave] || null;
}

/**
 * Réplica de ConsignacionController::formatFecha (privado en el PHP). mssql
 * ya devuelve columnas DATETIME como objetos Date de JS (a diferencia de PDO,
 * que las devolvía como string), pero se acepta también string por si la
 * columna viene ya convertida en el propio SQL.
 */
function formatFecha(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  const dosDigitos = (n) => String(n).padStart(2, '0');
  const anioCorto = String(fecha.getFullYear()).slice(-2);

  return `${dosDigitos(fecha.getDate())}-${dosDigitos(fecha.getMonth() + 1)}-${anioCorto} ${dosDigitos(
    fecha.getHours()
  )}:${dosDigitos(fecha.getMinutes())}`;
}

class ConsignacionController {
  async repository() {
    return new ConsignacionRepository(await database.connection());
  }

  async alertamail(usuario, idplanigrid) {
    const repository = await this.repository();
    const fila = await repository.alertamail(usuario, idplanigrid);

    if (fila === null) {
      return { status: 'error' };
    }

    return { status: 'success', resultado: Number(fila.resultado) };
  }

  async cabecera(idplanigrid) {
    const repository = await this.repository();
    const filas = await repository.cabecera(idplanigrid);

    return filas.map((fila) => ({
      inout: fila.INOUT,
      id: idplanigrid,
      // mssql devuelve el CASE WHEN ... THEN '0' como número 0 (no string
      // '0'), porque el otro lado del CASE (mas.muelleasign/mrs.muellesreserv)
      // es tipo int y SQL Server unifica el tipo de la expresión completa.
      // Comparar con !== '0' (estricto) nunca detectaba ese 0 numérico, así
      // que el "sin muelle" se colaba a la vista como el texto literal "0".
      // eslint-disable-next-line eqeqeq
      muelle: fila.muelleasign !== null && fila.muelleasign != '0' ? fila.muelleasign : '',
      // eslint-disable-next-line eqeqeq
      muellereserv: fila.muellesreserv !== null && fila.muellesreserv != '0' ? fila.muellesreserv : '',
      prueba: fila.prueba ?? '',
      horaprogramada: formatFecha(fila.horaprogramada),
      fechallegada: formatFecha(fila.fechallegada),
      fechasalida: formatFecha(fila.fechasalida),
      precinto: fila.precinto ?? '',
      bultos: fila.bultos ?? '',
      estadocdmuelles: fila.estadocdmuelles ?? '',
      sonda: fila.sonda ?? null,
      datalogger: fila.datalogger ?? null,
    }));
  }

  async datos(idplanigrid) {
    const repository = await this.repository();
    const filas = await repository.datos(idplanigrid);

    return filas.map((fila) => ({
      idplanigrid,
      id: fila.id,
      propietario: fila.propietario,
      pedido: fila.pedido,
      consignacion: fila.consignacion,
      transportista: fila.transportista,
      estado: fila.estado,
      peligrosidad: fila.peligrosidad ?? '',
      playa: fila.playa ?? '',
      bultos: fila.bultos ?? '',
    }));
  }

  async datosQuizCalidad(idplanigrid) {
    const repository = await this.repository();
    const filas = await repository.datosQuizCalidad(idplanigrid);

    return filas.map((fila) => ({
      inout: fila.inout === 'IN' ? 'descarga' : 'carga',
      idplanigrid: fila.idplanigrid,
      id: fila.id,
      campohtml: fila.campohtml,
      tipo: fila.tipo,
      value: fila.value ?? 'Campo Vacío',
      precintocentralita: fila.precintocentralita ?? '',
      rango: fila.rango ?? '',
      sonda: fila.sonda ?? '',
      seccion: fila.seccion ?? '',
    }));
  }

  async selectTempRango(idplanigrid) {
    const repository = await this.repository();
    return repository.selectTempRango(idplanigrid);
  }

  async logs(idplanigrid) {
    const repository = await this.repository();
    const filas = await repository.logs(idplanigrid);

    if (filas.length === 0) {
      return null;
    }

    return filas.map((fila) => ({
      id: fila.id,
      fecha: formatFecha(fila.fecha),
      usuario: fila.usuario,
      descripcion: fila.descripcion,
      instruccion: fila.instruccion,
    }));
  }

  async eliminarFoto(idfoto, usuario, idplanigrid) {
    const repository = await this.repository();
    const fila = await repository.fotoRuta(idfoto);

    if (fila === null || !fila.rutafichero) {
      return { status: 'failure', message: 'No se pudo eliminar el archivo.' };
    }

    await repository.eliminarFoto(idfoto, usuario, idplanigrid);

    try {
      if (fs.existsSync(fila.rutafichero)) {
        fs.unlinkSync(fila.rutafichero);
        return { status: 'success', message: 'Archivo eliminado correctamente.' };
      }
    } catch (err) {
      console.error('Error al eliminar fichero de foto:', err.message);
    }

    return { status: 'failure', message: 'No se pudo eliminar el archivo.' };
  }

  async desactivarAlertaMail(usuario, idplanigrid) {
    const repository = await this.repository();
    const correo = await repository.correoUsuario(usuario);

    if (correo === null) {
      return { status: 'error', Message: 'No se encontró el correo del usuario' };
    }

    if (await repository.desactivarAlertaMail(correo, idplanigrid)) {
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: 'Alerta de eventos desactivada',
        Message: 'Se desactivó la alerta de eventos para el usuario actual',
      };
    }

    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Desactivar',
      Message: 'Error al desactivar la alerta de eventos',
    };
  }

  async activarAlertaMail(usuario, idplanigrid) {
    const repository = await this.repository();

    if (await repository.activarAlertaMail(usuario, idplanigrid)) {
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: 'Alerta de eventos activada',
        Message: 'Se activó la alerta de eventos para el usuario actual',
      };
    }

    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Activar',
      Message: 'Error al activar la alerta de eventos',
    };
  }

  async desagruparCd(idplanigrid, usuario) {
    const repository = await this.repository();

    if (await repository.desagruparCd(idplanigrid, usuario)) {
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: 'Operación exitosa',
        Message: 'Se desagrupó correctamente la selección.',
      };
    }

    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error',
      Message: 'No se pudo desagrupar: la C/D seleccionada no es una agrupación válida, o contactar con el desarrollador.',
    };
  }

  /**
   * En el original, EliminarCD y EliminarDatosCD construían un $sql = "" y
   * ejecutaban sqlsrv_query con él: la consulta vacía nunca puede tener
   * éxito, así que en la práctica ambas acciones eran no-op que siempre
   * devolvían la rama de error. Se preserva ese comportamiento (siempre
   * "activa alerta"... el mensaje original también era incoherente con el
   * nombre de la acción) sin intentar ejecutar una sentencia SQL vacía.
   */
  eliminarCd() {
    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Activar',
      Message: 'Error al activar la alerta de eventos',
    };
  }

  eliminarDatosCd() {
    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Activar',
      Message: 'Error al activar la alerta de eventos',
    };
  }

  async cambiarSonda(idplanigrid, estado, usuario) {
    const repository = await this.repository();
    const activar = estado === 'activado';

    if (await repository.cambiarSonda(idplanigrid, activar, usuario)) {
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: activar ? 'Sonda en C/D Activada' : 'Sonda en C/D Desactivada',
        Message: activar ? 'Se activó la sonda en la C/D' : 'Se desactivó la sonda en la C/D',
      };
    }

    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Cambiar Estado',
      Message: 'Error al cambiar el estado de la sonda en la C/D',
    };
  }

  async cambiarDatalogger(idplanigrid, estado, usuario) {
    const repository = await this.repository();
    const activar = estado === 'activado';

    if (await repository.cambiarDatalogger(idplanigrid, activar, usuario)) {
      return {
        status: 'success',
        Notificacion: 'correcto',
        Asunto: activar ? 'Datalogger en C/D Activado' : 'Datalogger en C/D Desactivado',
        Message: activar ? 'Se activó el datalogger en la C/D' : 'Se desactivó el datalogger en la C/D',
      };
    }

    return {
      status: 'error',
      Notificacion: 'error',
      Asunto: 'Error al Cambiar Estado',
      Message: 'Error al cambiar el estado del datalogger en la C/D',
    };
  }

  async eliminarMuelleAsignado(idplanigrid, usuario) {
    const repository = await this.repository();
    const actual = await repository.muelleAsignado(idplanigrid);
    const muelleAnterior = actual ? actual.muelleasign : null;

    if (await repository.eliminarMuelleAsignado(idplanigrid, usuario, muelleAnterior)) {
      return { status: 'success' };
    }

    return { status: 'error' };
  }

  async cambiarTempRango(temprango, idplanigrid, usuario, textoSeleccionado) {
    const repository = await this.repository();
    const actual = await repository.rangoActual(idplanigrid);
    const rangoAnterior = actual ? actual.rango : 'Sin Temperatura';

    await repository.cambiarTempRango(temprango, idplanigrid, usuario, rangoAnterior, textoSeleccionado);

    return { status: 'success' };
  }

  async desasignarSalida(idplanigrid, usuario) {
    const repository = await this.repository();
    const actual = await repository.fechaSalida(idplanigrid);
    const fechaAnterior = actual ? actual.fechasalida : null;

    if (await repository.desasignarSalida(idplanigrid, usuario, fechaAnterior)) {
      return { status: 'success' };
    }

    return {
      status: 'Error',
      Asunto: 'No se ejecutó correctamente la tarea',
      Message: 'Ha habido un error, actualice y vuelva a ejecutar su acción.',
    };
  }

  async asignarSalida(idplanigrid, usuario) {
    const repository = await this.repository();
    const result = await repository.estadoParaAsignarSalida(idplanigrid);

    if (result === null) {
      return {
        status: 'Error',
        Asunto: 'No se ejecutó correctamente la tarea',
        Message: 'Ha habido un error, actualice y vuelva a ejecutar su acción.',
      };
    }

    if ((result.peligrosidad ?? null) === 'ADR' && (result.fechafirmapeligrosidad ?? null) === null && (result.inout ?? null) === 'OUT') {
      return {
        status: 'Error',
        Notificacion: 'error',
        Asunto: 'Falta Firma de chófer ADR',
        Message: 'No está firmado el documento de ADR por parte del chófer.',
      };
    }

    /**
     * Estados terminales reales de estadocdmuelles (ver
     * UploadsRepository.avanzarEstadoTrasFoto): 7 = Finalizada (sin sonda/
     * precinto/datalogger), 9 = Finalizada con precinto, 10 = Finalizada
     * con datalogger. El estado 8 (Fotografía Sonda) NUNCA es terminal, es
     * un paso intermedio. El chequeo original comparaba contra
     * MIN(orden)/MAX(orden) de TODA la tabla estados_cdmuelles (1 y 10), lo
     * que solo dejaba asignar salida en el estado 1 (recién empezado, sin
     * sentido) o 10 — rechazando en la práctica cualquier C/D realmente
     * finalizada sin datalogger (estado 7 o 9).
     */
    if ([7, 9, 10].includes(result.estadocdmuelles)) {
      if (await repository.asignarSalida(idplanigrid, usuario)) {
        return {
          status: 'success',
          Notificacion: 'correcto',
          Asunto: 'Operación exitosa',
          Message: 'La salida se asignó correctamente.',
        };
      }

      return {
        status: 'Error',
        Notificacion: 'error',
        Asunto: 'No se ejecutó correctamente la tarea',
        Message: 'Ha habido un error, actualice y vuelva a ejecutar su acción.',
      };
    }

    return {
      status: 'Error',
      Notificacion: 'error',
      Asunto: 'Error estado C/D no finalizado',
      Message: 'El estado de la C/D está iniciada y NO finalizada',
    };
  }

  async desasignarLlegada(idplanigrid, usuario) {
    const repository = await this.repository();
    const actual = await repository.fechaLlegada(idplanigrid);
    const fechaAnterior = actual ? actual.fechallegada : null;

    if (await repository.desasignarLlegada(idplanigrid, usuario, fechaAnterior)) {
      return { status: 'success' };
    }

    return { status: 'error' };
  }

  async asignarLlegada(idplanigrid, usuario) {
    const repository = await this.repository();

    if (await repository.asignarLlegada(idplanigrid, usuario)) {
      return { status: 'success' };
    }

    return { status: 'error', message: 'Error al ejecutar la consulta' };
  }

  /**
   * @param {{precinto?:string, observacion?:string, hLlegada?:string, hSalida?:string, muelle?:string, muelleReservado?:string}} datos
   */
  async guardarCabecera(datos, idplanigrid, usuario, almacen) {
    const repository = await this.repository();

    const precinto = datos.precinto ? datos.precinto : null;
    const observacion = datos.observacion ? datos.observacion : null;
    const hLlegada = datos.hLlegada ?? '';
    const hSalida = datos.hSalida ?? '';
    const muelle = datos.muelle ?? '';
    const muelleReservado = datos.muelleReservado ?? '';

    const valorOriginal = await repository.valoresCabeceraOriginal(idplanigrid);
    if (valorOriginal === null) {
      return { status: 'error', Error: 'No se encontró la C/D' };
    }

    const sets = [];
    const params = [];
    const descripciones = [];

    const fechaLlegadaOriginal = formatFecha(valorOriginal.fechallegada);
    const fechaSalidaOriginal = formatFecha(valorOriginal.fechasalida);

    /**
     * hLlegada/hSalida llegan en el mismo formato que pinta formatFecha():
     * "DD-MM-AA HH:mm" (día-mes-año de 2 dígitos). `new Date(valor)` NO
     * interpreta ese formato de forma fiable: para casi cualquier día >12
     * devuelve Invalid Date, y para día <=12 lo malinterpreta al estilo
     * americano MM-DD (p.ej. "05-01-26 09:15" se leía como 1 de MAYO en vez
     * de 5 de enero). Esto hacía que esFechaValida() rechazara fechas de
     * llegada recién asignadas y correctas, bloqueando en silencio (o, tras
     * el aviso explícito añadido más abajo, con error visible) la
     * asignación de muelle inmediatamente después de asignar la llegada.
     */
    const esFechaValida = (valor) => valor !== '' && /^\d{2}-\d{2}-\d{2,4}( \d{2}:\d{2})?$/.test(valor);

    if (hLlegada !== '' && esFechaValida(hLlegada) && fechaLlegadaOriginal !== hLlegada) {
      sets.push('fechallegada = ?');
      params.push(hLlegada);
      descripciones.push(`Llegada Nuevo: "${hLlegada}", Anterior: "${fechaLlegadaOriginal}"`);
    }

    if (hSalida !== '' && esFechaValida(hSalida) && fechaSalidaOriginal !== hSalida) {
      sets.push('fechasalida = ?');
      params.push(hSalida);
      descripciones.push(`Salida Nuevo: "${hSalida}", Anterior: "${fechaSalidaOriginal}"`);
    }

    // eslint-disable-next-line eqeqeq
    if ((valorOriginal.prueba ?? '') != observacion) {
      sets.push('prueba = ?');
      params.push(observacion);
      descripciones.push(`Observación Nuevo: "${observacion}", Anterior: "${valorOriginal.prueba ?? ''}"`);
    }

    // eslint-disable-next-line eqeqeq
    if ((valorOriginal.precinto ?? '') != precinto) {
      sets.push('precinto = ?');
      params.push(precinto);
      descripciones.push(`Precinto Nuevo: "${precinto}", Anterior: "${valorOriginal.precinto ?? ''}"`);
    }

    if (sets.length > 0) {
      const sql = `UPDATE planigrid SET ${sets.join(', ')} WHERE id = ?`;
      params.push(idplanigrid);
      await repository.actualizarCabecera(sql, params);
    }

    let error = null;

    /**
     * cabecera() (la query que rellena la celda editable) normaliza "sin
     * muelle" a la cadena '0', pero valoresCabeceraOriginal() (usada aquí
     * para comparar) devuelve NULL real de la BD. En PHP, "0" != null se
     * evalúa como false (PHP compara null con string convirtiendo ambos a
     * bool: "0" también es falsy), así que el original nunca detectaba un
     * "cambio" ahí. En JS, "0" != null es true, así que sin esta
     * normalización cualquier edición de cabecera en una C/D sin muelle
     * asignado/reservado se interpretaba como un intento de asignar el
     * muelle "0" (inexistente) y fallaba con "Muelle no habilitado".
     */
    const esMuelleVacio = (valor) => valor === null || valor === undefined || valor === '' || valor === '0';
    const cambioMuelle = (nuevo, anterior) => {
      if (esMuelleVacio(nuevo) && esMuelleVacio(anterior)) return false;
      // eslint-disable-next-line eqeqeq
      return nuevo != anterior;
    };

    // Muelle asignado. El guardado de muelle exige que ya haya una fecha de
    // llegada válida (réplica fiel de ConsignacionController::guardarCabecera
    // del PHP original) — sin este aviso explícito, intentar asignar un
    // muelle en una C/D sin llegada se descartaba en silencio y el servidor
    // devolvía igualmente "success", sin decir por qué no se aplicó.
    if (cambioMuelle(muelle, valorOriginal.muelleasign) && !(hLlegada !== '' && esFechaValida(hLlegada))) {
      error = 'No se puede asignar el muelle: primero hay que asignar la fecha de llegada';
    } else if (hLlegada !== '' && esFechaValida(hLlegada) && cambioMuelle(muelle, valorOriginal.muelleasign)) {
      if (muelle !== '') {
        const muelleFila = await repository.muelleHabilitado(almacen, muelle);

        if (muelleFila && muelleFila.habilitado) {
          const permitido = await repository.muellePermitidoRangoTemp(valorOriginal.idtemprango ?? null, muelle);

          if (permitido && permitido.idmuelle) {
            if (cambioMuelle(muelle, valorOriginal.muelleasign) && valorOriginal.muelleasign) {
              await repository.actualizarMuelleAsignado(muelle, idplanigrid);
              descripciones.push(`Muelle Nuevo: "${muelle}", Anterior: "${valorOriginal.muelleasign}"`);
            } else {
              await repository.insertarMuelleAsignado(muelle, idplanigrid);
              descripciones.push(`Muelle Nuevo: "${muelle}", Anterior: ""`);
            }
          } else {
            error = 'Muelle no permitido para el rango de temperatura';
          }
        } else {
          error = 'Muelle no habilitado para asignar C/D';
        }
      } else {
        await repository.eliminarMuellesAsignadosPorIdplanigrid(idplanigrid);
        descripciones.push('Muelle vacío');
      }
    }

    // Muelle reservado
    if (error === null && cambioMuelle(muelleReservado, valorOriginal.muellesreserv)) {
      if (muelleReservado !== '') {
        const muelleReservadoFila = await repository.muelleHabilitado(almacen, muelleReservado);

        if (muelleReservadoFila && muelleReservadoFila.habilitado) {
          if (valorOriginal.muellesreserv) {
            await repository.actualizarMuelleReservado(muelleReservado, idplanigrid);
            descripciones.push(`Muelle Reservado Nuevo: "${muelleReservado}", Anterior: "${valorOriginal.muellesreserv}"`);
          } else {
            await repository.insertarMuelleReservado(muelleReservado, idplanigrid);
            descripciones.push(`Muelle Reservado Nuevo: "${muelleReservado}", Anterior: ""`);
          }
        } else {
          error = 'Muelle no habilitado para reservar C/D';
        }
      } else {
        await repository.eliminarMuelleReservado(idplanigrid);
        descripciones.push('Muelle Reservado vacío');
      }
    }

    if (error !== null) {
      return { status: 'Error', Error: error };
    }

    if (descripciones.length > 0) {
      await repository.registrarCambioLog(usuario, descripciones.join(', '), 'UPDATE', 'idplanigrid', idplanigrid);
    }

    return { status: 'success' };
  }

  async informeCargaDescarga(idplanigrid) {
    const repository = await this.repository();
    const fila = await repository.informeCargaDescarga(idplanigrid);

    if (fila === null || fila['in-out'] === null || fila['in-out'] === undefined) {
      return { cargadescarga: 'NULL' };
    }

    const ruta = resolverRutaInforme(fila.informe, String(fila.versioninforme));

    return {
      cargadescarga: fila['in-out'],
      ruta,
    };
  }

  async galeria(idplanigrid) {
    const repository = await this.repository();
    const filas = await repository.galeria(idplanigrid);

    if (filas.length === 0) {
      return { status: 'no_images', message: 'No se encontraron imágenes' };
    }

    const images = filas.map((fila) => ({
      rutafichero: appConfig.uploadsHost() + fila.rutafichero,
      extension: fila.extension,
      descripcion: fila.descripcion,
      id: fila.id,
    }));

    return { status: 'success', images };
  }

  /**
   * Migrado de Resources/PHP/comunes.php (funcion=up_img_ofi). En el
   * original vivía en comunes.php aunque solo lo usaba la galería del
   * modal de consignación; aquí queda junto al resto de acciones del modal.
   * A diferencia del PHP (que hacía move_uploaded_file aquí mismo), en Node
   * el fichero ya ha sido escrito a disco por el middleware multer de
   * server/modules/consignacion/routes.js (mismo patrón de nombre
   * IMG_{id}_{n}.ext con resolución de colisión) antes de llegar a este
   * método: aquí solo queda registrar cada fichero ya subido en BD.
   *
   * @param {Array<{filename:string, originalname:string, ruta:string, rutaFisica:string, extension:string}>} archivos
   */
  async subirImagenes(archivos, idplanigrid, usuario, descripcion) {
    const repository = await this.repository();
    const response = [];

    for (const archivo of archivos) {
      await repository.insertarSubidaImagen(
        idplanigrid,
        archivo.ruta,
        archivo.filename,
        usuario,
        archivo.extension,
        'IMG',
        descripcion,
        archivo.rutaFisica
      );

      switch (descripcion) {
        case 'INICIAL':
        case 'TRANSCURSO':
          await repository.actualizarEstadoCdMuellesPorSubida(idplanigrid, 3);
          break;
        case 'FINAL':
          await repository.actualizarEstadoCdMuellesPorSubida(idplanigrid, 7, true);
          break;
        default:
          break;
      }

      response.push({ status: 'success', message: `Archivo guardado con éxito: ${archivo.originalname}` });
    }

    return response;
  }
}

module.exports = new ConsignacionController();
