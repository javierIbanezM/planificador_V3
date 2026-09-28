'use strict';

const database = require('../../config/database');
const ConfiguracionRepository = require('./repository');

/** Controlador del módulo Configuración. Réplica de src/Modules/Configuracion/ConfiguracionController.php. */
class ConfiguracionController {
  async repository() {
    return new ConfiguracionRepository(await database.connection());
  }

  async crearAlmacen(datos, usuario) {
    const repository = await this.repository();
    const exito = await repository.crearAlmacen(
      String(datos.almacen || ''),
      String(datos.descripcion || ''),
      String(datos.direccion || ''),
      String(datos.cp || ''),
      String(datos.poblacion || ''),
      String(datos.pais || ''),
      String(datos.direccioncarga || ''),
      usuario
    );

    return { status: exito ? 'success' : 'error' };
  }

  async eliminarAlmacen(almacen, usuario) {
    const repository = await this.repository();
    const exito = await repository.eliminarAlmacen(almacen, usuario);

    return { status: exito ? 'success' : 'error' };
  }

  async maestroAlmacenes() {
    const repository = await this.repository();
    const filas = await repository.maestroAlmacenes();

    return filas.map((fila) => ({
      almacen: fila.almacen ?? '',
      descripcion: fila.descripcion ?? '',
      direccion: fila.direccion ?? '',
      cp: fila.cp ?? '',
      poblacion: fila.poblacion ?? '',
      pais: fila.pais ?? '',
      direccioncarga: fila.direccioncarga ?? '',
      status: fila.status ?? '',
      eliminable: fila.eliminable ?? '',
    }));
  }

  async logsMaestro(maestro) {
    const repository = await this.repository();
    const filas = await repository.logsMaestro(maestro);

    return filas.map((fila) => ({
      fecha: repository.formatearFecha(fila.fecha, 'd-m-y H:i') ?? '',
      descripcion: fila.descripcion ?? '',
      usuario: fila.usuario ?? '',
      instruccion: fila.instruccion ?? '',
    }));
  }

  async maestroVariablesDelSistema() {
    const repository = await this.repository();
    const filas = await repository.maestroVariablesDelSistema();

    return filas.map((fila) => ({
      Nombre: fila.Nombre,
      Descripción: fila.Descripción,
      Activo: fila.Activo,
      Valor: fila.Valor ?? '',
      Tipo: fila.Tipo ?? '',
    }));
  }

  async maestroAutomatizaciones() {
    const repository = await this.repository();
    const filas = await repository.maestroAutomatizaciones();

    return filas.map((fila) => ({
      Nombre: fila.nombre,
      Descripción: fila.descripcion,
      Activo: fila.activo,
      Valor: fila.valor ?? '',
      Tipo: fila.tipo ?? '',
    }));
  }
}

module.exports = new ConfiguracionController();
