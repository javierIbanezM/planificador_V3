'use strict';

const path = require('path');
const ejs = require('ejs');
const QRCode = require('qrcode');

const database = require('../../config/database');
const InformesRepository = require('./repository');
const pdfService = require('./pdfService');
const assets = require('./assets');

const VIEWS_DIR = path.join(__dirname, '..', '..', '..', 'views', 'informes');

/** true si el valor "existe" en el sentido de isset() de PHP (no null/undefined). */
function definido(valor) {
  return valor !== null && valor !== undefined;
}

/**
 * Réplica de truncateString() de EtiquetaGenericaInfoRenderer.php /
 * EtiquetaRotinRenderer.php.
 */
function truncar(texto, longitud = 10) {
  const str = String(texto ?? '');
  return str.length > longitud ? `${str.slice(0, longitud)}...` : str;
}

/**
 * El tamaño de letra fijo del original (25pt para la referencia grande,
 * 90/105pt para IN/OUT) estaba pensado para textos cortos; con referencias u
 * "OUT" más largos, TCPDF partía el texto en varias líneas y descuadraba la
 * etiqueta. Aquí se aproxima reduciendo el tamaño de forma proporcional a la
 * longitud del texto, igual de en espíritu que el ajuste que hacía el PHP
 * (`GetStringWidth` + reducción proporcional) pero sin depender de medir
 * anchos reales de TCPDF.
 */
function tamanoAjustado(texto, tamanoBase, longitudBase, minimo) {
  const str = String(texto ?? '');
  if (str.length <= longitudBase || str.length === 0) {
    return tamanoBase;
  }
  return Math.max(minimo, Math.floor((tamanoBase * longitudBase) / str.length));
}

class InformesController {
  async repository() {
    return new InformesRepository(await database.connection());
  }

  async renderVista(nombreVista, datos) {
    return ejs.renderFile(path.join(VIEWS_DIR, `${nombreVista}.ejs`), datos);
  }

  imagenesEstaticas() {
    return {
      logo: assets.dataUriPng('logo.png'),
      chdriver: assets.dataUriPng('chdriver.png'),
      vehicle: assets.dataUriPng('vehicle.png'),
      mercanciaCompatible: assets.dataUriPng('mercanciacompatible.png'),
      marcaDeAgua: assets.dataUriPng('nofinalizado-marcadeagua.png'),
      checkRecepcionado: assets.dataUriPng('check-recepcionado.png'),
      atencionRotin: assets.dataUriPng('atencion-rotin.png'),
      indicativoPlaya: assets.dataUriPng('indicativo-playa.png'),
      exclamacion: assets.dataUriPng('exclamacion.png'),
    };
  }

  /**
   * Construye el bloque ADR/LQ (checklist previas/durante/final + firma en
   * su caso), común a Hoja_Carga_1, Hoja_Carga_2 y Hoja_Descarga_1. Cada
   * informe pasa su propio "filasSeccion" (varía el JOIN con
   * informes_objects, ver repository.js) y si debe mostrar la firma del
   * conductor (solo Hoja_Carga_1/2).
   */
  async construirBloqueAdrLq(repo, id, peligrosidad, filasSeccionFn, conFirma) {
    if (!definido(peligrosidad)) {
      return null;
    }

    const esAdr = peligrosidad.includes('ADR');
    const esLq = !esAdr && peligrosidad.includes('LQ');
    if (!esAdr && !esLq) {
      return null;
    }

    const previas = await filasSeccionFn(id, peligrosidad, 'PREVIAS');
    const durante = esAdr ? await filasSeccionFn(id, peligrosidad, 'DURANTE') : null;
    const final = await filasSeccionFn(id, peligrosidad, 'FINAL');
    const operarios = await repo.operariosPlanigrid(id);

    let firmaDataUri = null;
    if (conFirma && esAdr) {
      const rutaFirma = await repo.firmaAdr(id);
      if (rutaFirma) {
        firmaDataUri = assets.dataUriDesdeDisco(rutaFirma, path.extname(rutaFirma));
      }
    }

    return {
      tipo: esAdr ? 'ADR' : 'LQ',
      peligrosidad,
      previas,
      durante,
      final,
      operarios,
      conFirma: Boolean(conFirma && esAdr),
      firmaDataUri,
    };
  }

  async construirGaleria(repo, id) {
    const filas = await repo.imagenesGaleria(id);
    const imagenes = [];
    for (const fila of filas) {
      const dataUri = assets.dataUriDesdeDisco(fila.rutafichero, fila.extension);
      if (dataUri) {
        imagenes.push({ descripcion: fila.descripcion, dataUri });
      }
    }
    return imagenes;
  }

  /**
   * Bloque de datos idéntico entre Hoja_Carga_1, Hoja_Carga_2 y
   * Hoja_Descarga_1 (antes copiado 3 veces, una consulta `await` detrás de
   * otra en cada copia). Son 9 lecturas de solo lectura, independientes
   * entre sí para un mismo id — se lanzan en paralelo con Promise.all en vez
   * de en cadena: mismo resultado, una sola tanda de latencia de red a BD en
   * vez de la suma de las 9.
   */
  async datosComunesInforme(repo, id) {
    const [finalizada, fechaRows, muelleRows, fechaLlegadaRows, checks, observacion, usuariosTiempo, galeria, peligrosidad] =
      await Promise.all([
        repo.finalizada(id),
        repo.fechaInforme(id),
        repo.muelleAsignado(id),
        repo.fechaLlegada(id),
        repo.checksCalidad(id),
        repo.observacionCalidad(id),
        repo.usuariosYTiempo(id),
        this.construirGaleria(repo, id),
        repo.peligrosidad(id),
      ]);

    return {
      finalizada,
      fecha: fechaRows.map((f) => repo.formatearFecha(f.fecha, 'd-m-Y') || '').join(''),
      muelle: muelleRows.map((m) => (m.muelleasign !== null && m.muelleasign !== undefined ? m.muelleasign : '')).join(''),
      fechaCarga: fechaLlegadaRows.map((f) => repo.formatearFecha(f.fechallegada, 'd-m-Y H:i') || '').join(''),
      checks,
      observacion,
      usuariosTiempo,
      galeria,
      peligrosidad,
    };
  }

  // -----------------------------------------------------------------
  // Hoja de Carga (plantilla 1 / ED:04) — GET /informes/hoja-carga-1.php
  // -----------------------------------------------------------------

  async datosHojaCarga1(id) {
    const repo = await this.repository();

    const [comunes, cabecera, temp, pedidos] = await Promise.all([
      this.datosComunesInforme(repo, id),
      repo.cabeceraCarga1(id),
      repo.temperaturaCarga1(id),
      repo.pedidosCargados(id),
    ]);
    const adrLq = await this.construirBloqueAdrLq(
      repo,
      id,
      comunes.peligrosidad,
      (i, p, s) => repo.filasSeccionCarga(i, p, s),
      true
    );

    return {
      imagenes: this.imagenesEstaticas(),
      finalizada: comunes.finalizada,
      fecha: comunes.fecha,
      muelle: comunes.muelle,
      fechaCarga: comunes.fechaCarga,
      numeroruta: cabecera.numeroruta || '',
      conductorNombre: cabecera.conductorNombre || '',
      conductorApellidos: cabecera.conductorApellidos || '',
      conductorDni: cabecera.conductorDni || '',
      conductortelefono: cabecera.conductortelefono || '',
      poblacion: cabecera.poblacion || '',
      transportista: cabecera.transportista || '',
      destino: cabecera.destino || '',
      precinto: cabecera.precinto || 'N/A',
      matriculaTractora: cabecera.matriculaTractora || '',
      matricularemolque: cabecera.matricularemolque || '',
      temp: definido(temp.temp) ? 'SI' : 'NO',
      rango: temp.rango || 'NO',
      tempmedida: definido(temp.value) ? temp.value : 'N/A',
      comparaciontemp: temp.comparacion_temp || 'N/A',
      checks: comunes.checks,
      observacion: comunes.observacion.value || '',
      operarios: comunes.usuariosTiempo.operarios || '',
      fechainicio: repo.formatearFecha(comunes.usuariosTiempo.fechainicio, 'd-m-Y H:i') || '',
      fechafincd: repo.formatearFecha(comunes.usuariosTiempo.fechafincd, 'd-m-Y H:i') || '',
      pedidos,
      galeria: comunes.galeria,
      adrLq,
      tituloColor: '#477CD0',
      cod: 'PSGC-06-F01',
      ed: '04',
      elaboradoPor: 'Elaborado por Andrés Sánchez / IT',
    };
  }

  async pdfHojaCarga1(id) {
    const datos = await this.datosHojaCarga1(id);
    const html = await this.renderVista('hoja-carga-1', datos);
    return pdfService.htmlToPdf(html, { format: 'A4' });
  }

  // -----------------------------------------------------------------
  // Hoja de Carga (plantilla 2 / ED:05) — GET /informes/hoja-carga-2.php
  // -----------------------------------------------------------------

  async datosHojaCarga2(id) {
    const repo = await this.repository();

    const [comunes, cabecera, temp, pedidos] = await Promise.all([
      this.datosComunesInforme(repo, id),
      repo.cabeceraCarga2(id),
      repo.temperaturaCarga1(id),
      repo.pedidosCargados(id),
    ]);
    const adrLq = await this.construirBloqueAdrLq(
      repo,
      id,
      comunes.peligrosidad,
      (i, p, s) => repo.filasSeccionCarga(i, p, s),
      true
    );

    return {
      imagenes: this.imagenesEstaticas(),
      finalizada: comunes.finalizada,
      fecha: comunes.fecha,
      muelle: comunes.muelle,
      fechaCarga: comunes.fechaCarga,
      propietario: cabecera.propietario || '',
      consignacion: cabecera.consignacion || '',
      numeroruta: cabecera.numeroruta || '',
      conductorNombre: cabecera.conductorNombre || '',
      conductorApellidos: cabecera.conductorApellidos || '',
      conductorDni: cabecera.conductorDni || '',
      conductortelefono: cabecera.conductortelefono || '',
      poblacion: cabecera.poblacion || '',
      transportista: cabecera.transportista || '',
      destino: cabecera.destino || '',
      precinto: cabecera.precinto || 'N/A',
      matriculaTractora: cabecera.matriculaTractora || '',
      matricularemolque: cabecera.matricularemolque || '',
      temp: definido(temp.temp) ? 'SI' : 'NO',
      rango: temp.rango || 'NO',
      tempmedida: definido(temp.value) ? `${temp.value} ºC` : 'N/A',
      comparaciontemp: temp.comparacion_temp || 'N/A',
      checks: comunes.checks,
      observacion: comunes.observacion.value || '',
      operarios: comunes.usuariosTiempo.operarios || '',
      fechainicio: repo.formatearFecha(comunes.usuariosTiempo.fechainicio, 'd-m-Y H:i') || '',
      fechafincd: repo.formatearFecha(comunes.usuariosTiempo.fechafincd, 'd-m-Y H:i') || '',
      pedidos,
      galeria: comunes.galeria,
      adrLq,
      tituloColor: '#000000',
      cod: 'PSGC-06-F01',
      ed: '05',
      elaboradoPor: 'Aprobado por Andrés Sánchez / IT',
    };
  }

  async pdfHojaCarga2(id) {
    const datos = await this.datosHojaCarga2(id);
    const html = await this.renderVista('hoja-carga-2', datos);
    return pdfService.htmlToPdf(html, { format: 'A4' });
  }

  // -----------------------------------------------------------------
  // Hoja de Descarga (plantilla 1 / ED:05) — GET /informes/hoja-descarga-1.php
  // -----------------------------------------------------------------

  async datosHojaDescarga1(id) {
    const repo = await this.repository();

    const [comunes, cabecera, temp, bultosRows] = await Promise.all([
      this.datosComunesInforme(repo, id),
      repo.cabeceraDescarga1(id),
      repo.temperaturaDescarga1(id),
      repo.bultosDescarga1(id),
    ]);
    const adrLq = await this.construirBloqueAdrLq(
      repo,
      id,
      comunes.peligrosidad,
      (i, p, s) => repo.filasSeccionDescarga(i, p, s),
      false
    );

    let bultostotales = 0;
    for (const fila of bultosRows) {
      bultostotales += Number(fila.bultos || 0);
    }
    if (bultostotales === 0 && bultosRows.length > 0 && definido(bultosRows[0].btotales)) {
      bultostotales = bultosRows[0].btotales;
    }

    return {
      imagenes: this.imagenesEstaticas(),
      finalizada: comunes.finalizada,
      fecha: comunes.fecha,
      muelle: comunes.muelle,
      fechaCarga: comunes.fechaCarga,
      propietario: cabecera.propietario || '',
      albaran: cabecera.albaran || '',
      nombre: cabecera.nombre || '',
      apellidos: cabecera.apellidos || '',
      dni: cabecera.dni || '',
      telefono: cabecera.telefono || '',
      poblacion: cabecera.poblacion || '',
      da: cabecera.DA || '',
      transportista: cabecera.transportista || '',
      precinto: cabecera.precinto || 'N/A',
      matriculatractora: cabecera.matriculatractora || '',
      matricularemolque: cabecera.matricularemolque || '',
      temp: definido(temp.value) ? 'SI' : 'NO',
      rango: temp.rango || 'NO',
      tempmedida: definido(temp.value) ? temp.value : 'N/A',
      comparaciontemp: temp.comparacion_temp || 'N/A',
      checks: comunes.checks,
      observacion: comunes.observacion.value || '',
      operarios: comunes.usuariosTiempo.operarios || '',
      fechainicio: repo.formatearFecha(comunes.usuariosTiempo.fechainicio, 'd-m-Y H:i') || '',
      fechafincd: repo.formatearFecha(comunes.usuariosTiempo.fechafincd, 'd-m-Y H:i') || '',
      bultosRows,
      bultostotales,
      galeria: comunes.galeria,
      adrLq,
    };
  }

  async pdfHojaDescarga1(id) {
    const datos = await this.datosHojaDescarga1(id);
    const html = await this.renderVista('hoja-descarga-1', datos);
    return pdfService.htmlToPdf(html, { format: 'A4' });
  }

  // -----------------------------------------------------------------
  // Etiqueta Genérica (playa) — GET /informes/etiqueta-generica.php
  // -----------------------------------------------------------------

  /**
   * @param {number} id idplanigrid
   * @param {string|null} [albaran] Para un idplanigrid IN agrupado (varios
   *   albaranes bajo la misma cabecera), limita los datos a ese albarán
   *   concreto — ver pdfEtiquetaGenerica.
   */
  async datosEtiquetaGenerica(id, albaran = null) {
    const repo = await this.repository();
    const fila = await repo.etiquetaGenericaData(id, albaran);

    const almacen = fila.almacen || '';
    const propietario = definido(fila.propietario) ? truncar(fila.propietario, 10) : '';
    const referencia = fila.Referencia || '';
    const referenciareducida = definido(fila.Referencia) ? truncar(fila.Referencia, 20) : '';
    const muelle = fila.muelle || '';
    const horacd = definido(fila.horainicio)
      ? truncar(repo.formatearFecha(fila.horainicio, 'd-m-y H:i:s') || '', 28)
      : '';
    const bultos = fila.bultos || '';
    const playa = definido(fila.playa) ? truncar(fila.playa, 12) : '';
    const fechafincd = !definido(fila.fechafincd) ? '(No Culminado)' : '';
    const inout = fila.inout || '';
    const respuestarotura = fila.respuestarotura || '';
    const mostrarGranel = fila.granel === 1 || fila.granel === true;
    const paletsAportados = fila.paletsaportados || '';

    // Sustituye a write2DBarcode() de TCPDF: el QR codifica la misma
    // referencia (igual que el original) para que el operario de playa
    // pueda escanearlo y localizar el idplanigrid/consignación.
    const qrDataUri = referencia ? await QRCode.toDataURL(referencia) : null;

    return {
      imagenes: this.imagenesEstaticas(),
      almacen,
      propietario,
      referencia,
      referenciareducida,
      muelle,
      horacd,
      bultos,
      playa,
      fechafincd,
      inout,
      mostrarGranel,
      paletsAportados,
      mostrarAtencionRotura: respuestarotura === 'NO',
      fontSizeReferencia: tamanoAjustado(referencia, 25, 8, 10),
      // Base 140pt (más grande que el 105pt del PHP original, a petición
      // expresa: el texto IN/OUT debía salir más grande) — solo "IN" (2
      // letras) cabe a ese tamaño sin encoger; "OUT" (3 letras) activa el
      // ajuste proporcional para no desbordar la celda.
      fontSizeInOut: tamanoAjustado(inout, 140, 2, 55),
      qrDataUri,
    };
  }

  /**
   * @param {number[]} idsPlanigrid
   */
  async pdfEtiquetaGenerica(idsPlanigrid) {
    const paginas = [];
    let almacen = '';
    let referencia = '';
    const repo = await this.repository();

    for (const id of idsPlanigrid) {
      // Un idplanigrid IN puede agrupar varios albaranes (Agrupación de
      // Preavisos): antes se imprimía una sola etiqueta con un albarán
      // elegido al azar por el JOIN y se perdían los demás en silencio.
      // Ahora, si hay más de uno, se genera una página por cada albarán.
      // eslint-disable-next-line no-await-in-loop
      const albaranes = await repo.etiquetaGenericaAlbaranes(id);

      if (albaranes.length > 1) {
        for (const albaran of albaranes) {
          // eslint-disable-next-line no-await-in-loop
          const datos = await this.datosEtiquetaGenerica(id, albaran);
          paginas.push(datos);
          almacen = datos.almacen;
          referencia = datos.referencia;
        }
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const datos = await this.datosEtiquetaGenerica(id);
      paginas.push(datos);
      // Igual que el original: si se piden varios ids a la vez, "almacen" y
      // "referencia" (usados por el entry point para nombrar el fichero)
      // quedan con el valor del último id procesado — no es un bug
      // introducido aquí, es el comportamiento tal cual estaba.
      almacen = datos.almacen;
      referencia = datos.referencia;
    }

    const html = await this.renderVista('etiqueta-generica', { paginas, imagenes: this.imagenesEstaticas() });
    const buffer = await pdfService.htmlToPdf(html, { width: '105mm', height: '148mm' });
    return { buffer, almacen, referencia };
  }

  // -----------------------------------------------------------------
  // Etiqueta ROTIN — GET /informes/etiqueta-rotin.php
  // -----------------------------------------------------------------

  async datosEtiquetaRotin(id) {
    const repo = await this.repository();
    const fila = await repo.etiquetaRotinData(id);

    const almacen = fila.almacen || '';
    const propietario = definido(fila.propietario) ? truncar(fila.propietario, 10) : '';
    const referencia = fila.Referencia || '';

    return {
      imagenes: this.imagenesEstaticas(),
      almacen,
      propietario,
      referencia,
    };
  }

  async pdfEtiquetaRotin(id) {
    const datos = await this.datosEtiquetaRotin(id);
    const html = await this.renderVista('etiqueta-rotin', datos);
    const buffer = await pdfService.htmlToPdf(html, { width: '105mm', height: '148mm' });
    return { buffer, almacen: datos.almacen, referencia: datos.referencia };
  }
}

module.exports = new InformesController();
