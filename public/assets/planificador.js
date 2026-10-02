/*
Migrado de Resources/JS/Planificador.js. Los endpoints ahora van contra
public/api/planificador.php (con guard de sesión) en vez de
Resources/PHP/Planificador.php directamente.
*/

const funcionesphp = baseUrl + 'api/planificador.php';

document.addEventListener('DOMContentLoaded', function () {
  const filtros = document.querySelectorAll('.filtro-columna');
  filtros.forEach(filtro => {
    filtro.addEventListener('input', function () {
      filtrarRegistros(parseInt(document.getElementById('cantidadRegistros').value));
    });
  });

  selector = document.getElementById('cantidadRegistros');
  selector.addEventListener('change', function () {
    cambioselector(selector.value);
  });
  actualizarTabla(page);
  comprobarPosiblesReruteos();
});

// Posibles OUT duplicados por cambio de ruta: un pedido que ya se cargó y
// finalizó en un muelle, pero que al cambiar de ruta en Whales genera una
// C/D nueva sin muelle asignado (ver análisis en
// server/modules/planificador/repository.js, posiblesReruteos). Ya no se
// despliega solo: se muestra un botón con el número de avisos pendientes, y
// al pulsarlo se abre/cierra la lista completa. La fusión la dispara el
// botón de cada aviso (fusionarReruteo), que mueve fotos/bultos/quiz de la
// antigua a la nueva y copia su estado — "Agrupar" NO sirve para estos casos
// (crea un idplanigrid tercero y exige mismo muelle). Tras fusionar uno, el
// contador baja solo y si no queda ninguno el botón desaparece.
function comprobarPosiblesReruteos() {
  if (page !== 'Planificador') {
    return;
  }

  const formData = new FormData();
  formData.append('funcion', 'posiblesReruteos');
  fetch(funcionesphp, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(filas => {
      const contenedor = document.getElementById('avisoReruteos');
      if (!contenedor || !Array.isArray(filas) || filas.length === 0) {
        return;
      }

      const items = filas.map(f =>
        '<li>Pedido de <strong>' + f.propietario + '</strong> (' + f.transportista + '): '
        + 'C/D <strong>' + f.idplanigridAntiguo + '</strong> (' + f.consignacionAntigua + ') ya finalizada en muelle '
        + (f.muelleAntiguo || '?') + ' el ' + f.finalizadoEl + ', parece haberse re-rutado a la C/D nueva '
        + '<strong>' + f.idplanigridNuevo + '</strong> (' + f.consignacionNueva + '), sin muelle asignado. '
        + '<button type="button" class="btn btn-sm btn-outline-danger" onclick="fusionarReruteo(' + f.idplanigridAntiguo + ', ' + f.idplanigridNuevo + ', this)">Mover fotos/bultos/quiz a la nueva</button>'
        + '</li>'
      ).join('');

      contenedor.innerHTML =
        '<button type="button" class="btn btn-warning btn-sm" id="botonAvisoReruteos" onclick="toggleListaReruteos()" style="margin:10px 0;">'
        + '⚠ Posibles cargas duplicadas por cambio de ruta (<span id="contadorReruteos">' + filas.length + '</span>)'
        + '</button>'
        + '<div id="listaReruteos" style="display:none;margin:8px 0;padding:10px;border:1px solid #ffc107;border-radius:4px;background:#fff8e6;">'
        + 'Revisa si corresponde antes de pulsar — mueve el trabajo ya hecho (fotos, bultos escaneados, quiz de calidad) a la C/D nueva y retira la antigua.'
        + '<ul style="margin:8px 0 0 0;">' + items + '</ul>'
        + '</div>';
    })
    .catch(() => {
      // Aviso best-effort: si falla la consulta, no bloquea el resto de la página.
    });
}

function toggleListaReruteos() {
  const lista = document.getElementById('listaReruteos');
  if (!lista) {
    return;
  }
  lista.style.display = lista.style.display === 'none' ? 'block' : 'none';
}

// Mueve a la C/D nueva el trabajo físico ya hecho en la antigua (fotos,
// bultos escaneados, quiz de calidad) y copia su estado — ver
// PlanificadorRepository.fusionarReruteo. Pide confirmación explícita antes
// de escribir nada en BD; la antigua queda retirada (eliminado=1).
function fusionarReruteo(idAntiguo, idNuevo, boton) {
  const confirmado = confirm(
    'Vas a mover a la C/D ' + idNuevo + ' las fotos, bultos escaneados y respuestas del quiz de calidad '
    + 'de la C/D ' + idAntiguo + ' (ya finalizada), y copiar su estado. La C/D ' + idAntiguo + ' quedará retirada.\n\n'
    + 'No se puede deshacer desde aquí. ¿Confirmas?'
  );
  if (!confirmado) {
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Moviendo…';

  const formData = new FormData();
  formData.append('funcion', 'fusionarReruteo');
  formData.append('idAntiguo', idAntiguo);
  formData.append('idNuevo', idNuevo);

  fetch(funcionesphp, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
      Notificacion(data.Notificacion, data.Asunto, data.Message);
      if (data.status === 'success') {
        boton.closest('li').remove();
        actualizarContadorReruteos();
        actualizartablas(page);
      } else {
        boton.disabled = false;
        boton.textContent = 'Mover fotos/bultos/quiz a la nueva';
      }
    })
    .catch(() => {
      Notificacion('Error', 'Error de conexión', 'No se pudo completar el movimiento.');
      boton.disabled = false;
      boton.textContent = 'Mover fotos/bultos/quiz a la nueva';
    });
}

// Tras fusionar un aviso, baja el contador del botón; si no queda ninguno,
// quita el botón y la lista enteros (ya no hay nada que mostrar).
function actualizarContadorReruteos() {
  const contenedor = document.getElementById('avisoReruteos');
  const lista = document.getElementById('listaReruteos');
  if (!contenedor || !lista) {
    return;
  }

  const pendientes = lista.querySelectorAll('li').length;
  if (pendientes === 0) {
    contenedor.innerHTML = '';
    return;
  }

  const span = document.getElementById('contadorReruteos');
  if (span) {
    span.textContent = pendientes;
  }
}

function actualizartablas(page) {
  if (page === "Planificador") {
    var formData = new FormData();
    formData.append('funcion', 'planigrid');
    var options = {
      method: 'POST',
      body: formData,
    };
    Notificacion('neutro', 'Cargando registros', 'Se está actualizando la tabla')
    fetch(funcionesphp, options)
      .then(response => response.json())
      .then(data => {
        var html = '';
        data.forEach(item => {
          switch (item["in-out"]) {
            case "IN":
              colorfondo = "#FCF2CE";
              colorletras = "Black";
              break;
            case "OUT":
              colorfondo = "White";
              colorletras = "Black";
              break;
          }
          switch (item.colorestadocarga) {
            case 'verde':
              colorfondoestadocarga = 'limegreen';
              colorletraestadocarga = 'white';
              break;
            case 'rojo':
              colorfondoestadocarga = 'red';
              colorletraestadocarga = 'white';
              break;
            case 'blanco':
              colorfondoestadocarga = 'white';
              colorletraestadocarga = 'black';
              break;
            case 'amarillo':
              colorfondoestadocarga = 'yellow';
              colorletraestadocarga = 'black';
              break;
          }
          html += '<tr inout="' + item["in-out"] + '" ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '" style="background:' + colorfondo + ';color:' + colorletras + ';">';
          html += '<td class="tablaplaning"><input class="form-check-input" style="transform:scale(1.2);position:initial;margin-top:0px;margin-left:0px" type="checkbox" value="' + item.id + '" id="flexCheckDefault"></input></td>';
          html += '<td class="tablaplaning" title="' + item.propietario + '">' + item.propietario + '</td>';
          html += '<td class="tablaplaning" title="' + item.consignacion + '">' + item.consignacion + '</td>';
          html += '<td class="tablaplaning" title="' + item.fecha_prevista + '">' + item.fecha_prevista + '</td>';
          html += '<td class="tablaplaning" title="' + item.muelle + '">' + item.muelle + '</td>';
          html += '<td class="tablaplaning" title="' + item.Mreservado + '">' + item.Mreservado + '</td>';
          html += '<td class="tablaplaning" title="' + item.Observaciones + '">' + item.Observaciones + '</td>';
          html += '<td class="tablaplaning" title="' + item.Transportista + '">' + item.Transportista + '</td>';
          html += '<td class="tablaplaning" title="' + item.OrdenCompra + '">' + item.OrdenCompra + '</td>';
          html += '<td class="tablaplaning" title="' + item.hora_programada + '">' + item.hora_programada + '</td>';
          html += '<td class="tablaplaning" title="' + item.h_llegada + '">' + item.h_llegada + '</td>';
          html += '<td class="tablaplaning" title="' + item.bultos + '">' + item.bultos + '</td>';
          html += '<td class="tablaplaning" title="' + item.estado + '">' + item.estado + '</td>';
          html += '<td class="tablaplaning" title="' + item.rango + '">' + item.rango + '</td>';
          html += '<td class="tablaplaning" title="' + item.precinto + '">' + item.precinto + '</td>';
          html += '<td class="tablaplaning" title="' + item.peligrosidad + '">' + item.peligrosidad + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondoestadocarga + ';color:' + colorletraestadocarga + '">' + item.EstadoCarga + '</td>';
          html += '</tr>';
        });
        document.getElementById("tabla-body").innerHTML = html;

        var cantidad = parseInt(document.getElementById('cantidadRegistros').value);
        filtrarRegistros(cantidad);
        Notificacion('Correcto', 'Actualizado', 'Tabla actualizada')
      });
  }
}

function seleccionarvisibles() {
  var isChecked = document.getElementById('flexCheckDefault').checked;
  var tbody = document.getElementById('tabla-body');
  var rows = tbody.querySelectorAll('tbody tr');

  rows.forEach(function (row) {
    if (row.style.display !== 'none') {
      var checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    }
  });
}

function etigen() {
  var selectedRows = [];
  var tbody = document.getElementById('tabla-body');
  var rows = tbody.querySelectorAll('tr');

  rows.forEach(function (row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      selectedRows.push(row.getAttribute('data-id'));
    }
  });
  var ids = selectedRows.join(',');

  var url = baseUrl + `informes/etiqueta-generica.php?idplanigrid=${ids}&salida=i&almacen=SAGUNTO`;
  window.open(url, '_blank');
}

function agruparcd() {
  var selectedRows = [];
  var tbody = document.getElementById('tabla-body');
  var rows = tbody.querySelectorAll('tbody tr');

  rows.forEach(function (row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    if (checkbox && checkbox.checked) {
      selectedRows.push(row.getAttribute('data-id'));
    }
  });
  if (selectedRows.length > 0) {
    var formData = new FormData();
    formData.append('funcion', 'agruparcd');
    formData.append('selectedrows', selectedRows);
    var options = {
      method: 'POST',
      body: formData,
    };
    Notificacion('neutro', 'Proceso de agrupación en Curso', 'Se está agrupando las C/D seleccionadas, en cuanto termine saldrá confirmación.')
    fetch(funcionesphp, options)
      .then(response => response.json())
      .then(data => {
        Notificacion(data.Notificacion, data.Asunto, data.Message)
      })
  } else {
    Notificacion('Error', 'Ninguna C/D seleccionada', 'Seleccione Cargas/Descargas para poder agruparlas en una sola');
  }
}

function filtrarPorTipo(tipo) {
  var filas = document.querySelectorAll('#table-main tbody tr');

  filas.forEach(function (fila) {
    var inoutTipo = fila.getAttribute('inout');

    if (inoutTipo === tipo) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

function filtrarRegistros(cantidad) {
  var filtros = [];
  var columnas = 17;

  for (var i = 1; i <= columnas; i++) {
    if (i === 1) {
      filtros.push('');
    } else {
      filtros.push($('#filtro-columna' + i).val().toLowerCase());
    }
  }

  $('#table-main tbody tr').each(function () {
    var $mostrarFila = true;
    var fila = $(this);

    var columnasTexto = [];
    fila.find('td').each(function () {
      columnasTexto.push($(this).text().toLowerCase());
    });

    for (var i = 0; i < columnas; i++) {
      if (filtros[i] !== '' && columnasTexto[i].indexOf(filtros[i]) === -1) {
        $mostrarFila = false;
        break;
      }
    }

    if ($mostrarFila) {
      fila.show();
    } else {
      fila.hide();
    }
  });

  $('#table-main tbody tr:visible').slice(cantidad).hide();
}

function quitarFiltros(page) {
  var filtros = document.getElementsByClassName("filtro-columna");
  for (var i = 0; i < filtros.length; i++) {
    filtros[i].value = "";
  }
  var cantidad = parseInt(document.getElementById('cantidadRegistros').value);
  actualizartablas(page, cantidad);
};

let FILAS_POR_PAGINA = 12;
let paginaActual = 1;

function cambioselector(cantidad) {
  FILAS_POR_PAGINA = parseInt(cantidad);
  const filas = document.querySelectorAll('#table-main tbody tr');
  for (let i = 0; i < filas.length; i++) {
    if (i < FILAS_POR_PAGINA) {
      filas[i].style.display = 'table-row';
    } else {
      filas[i].style.display = 'none';
    }
  }
  paginaActual = 1;
  mostrarFilasEnPagina(paginaActual);
}

function mostrarFilasEnPagina(pagina) {
  const filas = document.querySelectorAll('#table-main tbody tr');
  const inicio = (pagina - 1) * FILAS_POR_PAGINA;
  const fin = inicio + FILAS_POR_PAGINA;

  filas.forEach((fila, index) => {
    fila.style.display = index >= inicio && index < fin ? 'table-row' : 'none';
  });
  paginaActual = pagina;
  mostrarPaginacion();
}

function mostrarPaginacion() {
  const filas = document.querySelectorAll('#table-main tbody tr');
  const totalFilas = filas.length;
  const totalPaginas = Math.ceil(totalFilas / FILAS_POR_PAGINA);
  const paginacion = document.getElementById('paginacion');

  let inicioPaginacion = Math.max(1, Math.min(paginaActual - 5, totalPaginas - 9));
  let finPaginacion = Math.min(totalPaginas, inicioPaginacion + 9);

  let htmlPaginacion = `<nav><ul class="pagination">`;

  if (paginaActual > 1) {
    htmlPaginacion += `<li class="page-item"><button class="page-link" onclick="mostrarFilasEnPagina(1)">Inicio</button></li>`;
  }

  if (paginaActual > 1) {
    htmlPaginacion += `<li class="page-item"><button class="page-link" onclick="mostrarFilasEnPagina(${paginaActual - 1})">Anterior</button></li>`;
  }

  for (let i = inicioPaginacion; i <= finPaginacion; i++) {
    const activeStyle = i === paginaActual ? 'border-color: blue;background: blue;color: white' : '';
    htmlPaginacion += `<li class="page-item"><button class="page-link" style="${activeStyle}" onclick="mostrarFilasEnPagina(${i})">${i}</button></li>`;
  }

  if (paginaActual < totalPaginas) {
    htmlPaginacion += `<li class="page-item"><button class="page-link" onclick="mostrarFilasEnPagina(${paginaActual + 1})">Siguiente</button></li>`;
  }

  if (paginaActual < totalPaginas) {
    htmlPaginacion += `<li class="page-item"><button class="page-link" onclick="mostrarFilasEnPagina(${totalPaginas})">Último</button></li>`;
  }

  htmlPaginacion += `</ul></nav>`;
  paginacion.innerHTML = htmlPaginacion;
}

function actualizarTabla(page) {
  actualizartablas(page);
  mostrarFilasEnPagina(paginaActual);
}
