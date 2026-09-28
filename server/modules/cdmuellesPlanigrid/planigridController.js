'use strict';

const database = require('../../config/database');
const PlanigridCdRepository = require('./planigridRepository');

/**
 * Estado de carga/descarga del kiosco PDA. Réplica literal de
 * src/Modules/Cdmuelles/PlanigridCdController.php.
 */
class PlanigridCdController {
  async repository() {
    return new PlanigridCdRepository(await database.connection());
  }

  async guardarGranel(idplanigrid, granel, palets) {
    try {
      const repository = await this.repository();
      await repository.guardarGranel(
        idplanigrid,
        granel === '1',
        palets !== null && palets !== '' ? parseInt(palets, 10) : null
      );
      return { status: 'success' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  async mostrarMuelles(almacen) {
    const repository = await this.repository();
    const filas = await repository.muellesOcupados(almacen);
    return filas.map((fila) => ({
      muelle: fila.muelle,
      color: fila.coloresvisorcd,
      empezado: fila.fechainforme !== null ? '*' : '',
    }));
  }

  async mostrarTablaOrdenes(almacen, muelle) {
    const repository = await this.repository();
    const filas = await repository.tablaOrdenes(almacen, muelle);
    return filas.map((fila) => ({
      id: fila.id,
      consignacion: fila.consignacion,
      estadocarga: fila.EstadoCarga,
      usuarios: fila.OperariosInvolucrados ?? '',
      color: fila.color,
    }));
  }

  async consultaEstado(id) {
    const repository = await this.repository();
    const fila = await repository.consultaEstado(id);

    if (fila === null) {
      return { status: 'failure' };
    }

    return { status: 'success', estado: fila.estado, inout: fila.inout };
  }

  async cambiaEstado(estado, id) {
    try {
      const repository = await this.repository();
      await repository.cambiaEstado(estado, id);
      return { status: 'success' };
    } catch (e) {
      return { status: 'failure' };
    }
  }

  async atrasEstadoCdmuelles(id, descripcion) {
    const repository = await this.repository();
    await repository.atrasEstadoCdmuelles(id, descripcion);

    return [{ status: 'success', message: 'Se ha reseteado el estado' }];
  }

  async entrarOrden1(id) {
    const repository = await this.repository();
    const filas = await repository.entrarOrden1(id);
    return filas.map((fila) => ({
      inout: fila.inout === 'IN' ? 'descarga' : 'carga',
      idplanigrid: fila.idplanigrid,
      id: fila.id,
      campohtml: fila.campohtml,
      tipo: fila.tipo,
      value: fila.value ?? '',
      precintocentralita: fila.precintocentralita ?? '',
      rango: fila.rango ?? '',
      sonda: fila.sonda ?? '',
      seccion: fila.seccion ?? '',
    }));
  }

  async mostrarAlbaranes(id) {
    const repository = await this.repository();
    const filas = await repository.mostrarAlbaranes(id);
    return filas.map((fila) => ({
      idplanigrid: fila.idplanigrid,
      albaran: fila.albaran,
      bultos: fila.bultos ?? '',
      bultoscargados: fila.bultoscargados ?? '0',
      // El original leía $mostrar['fechafinCD'], una columna que esta
      // consulta nunca selecciona: siempre valía '' en producción. Se
      // conserva el mismo valor por compatibilidad.
      fechafincd: '',
      inout: fila.inout,
      estadocdmuelles: fila.estadocdmuelles,
    }));
  }

  async observaciones(id) {
    const repository = await this.repository();
    const filas = await repository.observaciones(id);
    return filas.map((fila) => ({
      id: fila.id,
      consignación: fila.consignación,
      manipulado: fila.manipulado ?? '',
      referencia: fila.referencia ?? '',
      Observación_Planificador: fila.Observación_Planificador ?? '',
      matriculatractora: fila.matriculatractora ?? '',
      matricularemolque: fila.matricularemolque ?? '',
      playa: fila.playa ?? '',
    }));
  }

  async finalizarCarga(idplanigrid, usuario) {
    try {
      const repository = await this.repository();
      await repository.finalizarCarga(idplanigrid, usuario);
      return { status: 'success' };
    } catch (e) {
      return { status: 'error' };
    }
  }
}

module.exports = new PlanigridCdController();
