/*
Migrado de Resources/JS/Histórico.js (unificado con Histórico2.php, ver
informe de migración). Los endpoints ahora van contra
public/api/historico.php.
*/

const funcionesphp = baseUrl + 'api/historico.php';

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

  const checkTodoHistorico = document.getElementById('mostrarTodoHistorico');
  if (checkTodoHistorico) {
    checkTodoHistorico.addEventListener('change', function () {
      actualizarTabla(page);
    });
  }

  actualizarTabla(page);
});

function actualizartablas(page) {
  if (page === "Histórico") {
    var formData = new FormData();
    formData.append('funcion', 'historico_planigrid');
    var checkTodoHistorico = document.getElementById('mostrarTodoHistorico');
    if (checkTodoHistorico && checkTodoHistorico.checked) {
      formData.append('todo', '1');
    }
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
          html += '<td class="tablaplaning">' + item.Tipo_de_carga + '</td>';
          html += '<td class="tablaplaning">' + item.propietario + '</td>';
          html += '<td class="tablaplaning">' + item.consignacion + '</td>';
          html += '<td class="tablaplaning">' + item.fecha_prevista + '</td>';
          html += '<td class="tablaplaning">' + item.muelle + '</td>';
          html += '<td class="tablaplaning">' + item.Mreservado + '</td>';
          html += '<td class="tablaplaning">' + item.Observaciones + '</td>';
          html += '<td class="tablaplaning">' + item.Transportista + '</td>';
          html += '<td class="tablaplaning">' + item.OrdenCompra + '</td>';
          html += '<td class="tablaplaning">' + item.rango + '</td>';
          html += '<td class="tablaplaning">' + item.precinto + '</td>';
          html += '<td class="tablaplaning">' + item.hora_programada + '</td>';
          html += '<td class="tablaplaning">' + item.h_llegada + '</td>';
          html += '<td class="tablaplaning">' + item.H_Reg_Muelle + '</td>';
          html += '<td class="tablaplaning">' + item.T_M_Asig + '</td>';
          html += '<td class="tablaplaning">' + item.h_salida + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondoestadocarga + ';color:' + colorletraestadocarga + '">' + item.EstadoCarga + '</td>';
          html += '</tr>';
        });
        document.getElementById("tabla-body").innerHTML = html;

        var cantidad = parseInt(document.getElementById('cantidadRegistros').value);
        filtrarRegistros(cantidad);
        mostrarFilasEnPagina(1)
        Notificacion('Correcto', 'Actualizado', 'Tabla actualizada')
      });
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
    filtros.push($('#filtro-columna' + i).val().toLowerCase());
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
