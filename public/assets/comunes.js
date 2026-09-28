/*
Migrado de Resources/JS/comunes.js. Los endpoints ahora van contra
public/api/consignacion.php y public/api/muelles.php (con guard de sesión),
y el cierre de sesión usa public/api/logout.php en vez de
funcion=cerrarsesion contra comunes.php.
*/

const funcionesphpModal_consignacion = baseUrl + 'api/consignacion.php';
const funcionesphpModal_muelles = baseUrl + 'api/muelles.php';

// id del registro que se está mostrando actualmente en el modal de
// consignación. El doble clic dispara varias peticiones en paralelo
// (dblclick_cab, dblclick_datos...) sin cancelarse entre sí: si el usuario
// hace doble clic en otra fila antes de que respondan todas, una respuesta
// tardía del registro anterior puede llegar DESPUÉS que la del nuevo y
// sobrescribir parte del modal con datos de la fila equivocada (p.ej.
// tablacab ya muestra el registro nuevo pero tabladatos se queda con el
// anterior). Cada callback comprueba esta variable antes de tocar el DOM y
// descarta la respuesta si ya no corresponde al registro activo.
let idModalConsignacionActivo = null;

function Notificacion(type, title, description) {
  const container = document.getElementById('notificationContainer');

  const notification = document.createElement('div');
  notification.className = `notification alert alert-${Notificacioncolor(type)}`;

  let content = `<strong>${title}</strong> ${description}`;

  notification.innerHTML = content;

  container.insertBefore(notification, container.firstChild);

  setTimeout(() => {
    container.removeChild(notification);
  }, 6000);
}

function Notificacioncolor(type) {
  switch (type.toLowerCase()) {
    case 'alerta':
      return 'warning';
    case 'error':
      return 'danger';
    case 'correcto':
      return 'success';
    default:
      return 'info';
  }
}

function cierresesion() {
  fetch(baseUrl + 'api/logout.php')
    .then(response => response.json())
    .then(data => {
      if (data.status == 'success') {
        window.location.href = baseUrl + 'login.php?entorno=Planificador';
      }
    })
}


function modal(entorno, dataid) {
  switch (entorno) {
    case 'consignacion':
      var id = dataid.getAttribute("data-id");
      idModalConsignacionActivo = id;
      // Cada llamada usa su propio FormData/options: reutilizar el mismo
      // objeto y solo hacer .append('funcion', ...) antes de cada fetch
      // acumulaba varios campos "funcion" en las peticiones siguientes
      // (FormData.append no reemplaza), lo que en Node/multer/busboy hace
      // que req.body.funcion llegue como array y no coincida con el switch
      // del servidor (404 "Función no reconocida").
      var formData = new FormData();
      formData.append('funcion', 'dblclick_cab')
      formData.append('id', id);
      var options = {
        method: 'POST',
        body: formData,
      };

      fetch(funcionesphpModal_consignacion, options)
        .then(response => response.json())
        .then(data => {
          if (id !== idModalConsignacionActivo) {
            return; // el usuario ya abrió otro registro: respuesta obsoleta, se descarta
          }
          var html = '';
          data.forEach(item => {
            html += '<tr data-id="' + item.id + '">';
            html += '<td class="tablaplaning" title="' + item.muelle + '" id="muelle">' + item.muelle + '</td>';
            html += '<td class="tablaplaning" title="' + item.muellereserv + '" id="muellereserv">' + item.muellereserv + '</td>';
            html += '<td class="tablaplaning" title="' + item.prueba + '" style="word-wrap: break-word;white-space: normal;" id="prueba">' + item.prueba + '</td>';
            html += '<td class="tablaplaning" title="' + item.horaprogramada + '" id="horaprogramada">' + item.horaprogramada + '</td>';
            html += '<td class="tablaplaning" title="' + item.fechallegada + '" id="fechallegada">' + item.fechallegada + '</td>';
            html += '<td class="tablaplaning" title="' + item.fechasalida + '" id="fechasalida">' + item.fechasalida + '</td>';
            html += '<td class="tablaplaning" title="' + item.precinto + '" id="precinto">' + item.precinto + '</td>';
            html += '<td class="tablaplaning" title="' + item.bultos + '" id="btotales">' + item.bultos + '</td>';
            html += '<td class="tablaplaning" title="' + item.estadocdmuelles + '" id="estadocdmuelles">' + item.estadocdmuelles + '</td>';
            html += '</tr>';
          });
          document.getElementById("bodytablacab").innerHTML = html;
          var tooltipContent = `
            <div class="text-white p-3">
              Formulario de edición de una C/D<br><br>
              idplanigrid: <strong>${id}</strong>
            </div>`;

          var tooltipElement = document.querySelector('[data-toggle="tooltipidplanigrid"]');

          $(tooltipElement).tooltip('dispose');

          tooltipElement.setAttribute('title', tooltipContent);
          tooltipElement.setAttribute('data-html', 'true');

          $(tooltipElement).tooltip();

          var inout;
          switch (data[0].inout) {
            case 'IN':
              inout = 'Preaviso / Descarga'
              break;
            case 'OUT':
              inout = 'Expedición / Carga'
              break;
          };

          document.getElementById('sonda').checked = data[0].sonda;
          document.getElementById('datalogger').checked = data[0].datalogger;
          document.getElementById('tituloModal').innerText = inout;
        });

      var formDataDatos = new FormData();
      formDataDatos.append('funcion', 'dblclick_datos')
      formDataDatos.append('id', id);
      fetch(funcionesphpModal_consignacion, { method: 'POST', body: formDataDatos })
        .then(response => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(data => {
          if (id !== idModalConsignacionActivo) {
            return; // el usuario ya abrió otro registro: respuesta obsoleta, se descarta
          }
          var html = '';
          data.forEach(item => {
            html += '<tr data-id="' + item.id + '" idplanigrid = ' + item.idplanigrid + '>';
            html += '<td class="tablaplaning"><input class="form-check-input" style="transform:scale(1.2);position:initial;margin-top:0px;margin-left:0px" type="checkbox" value="' + item.id + '" id="flexCheckDefault"></input></td>';
            html += '<td class="tablaplaning" title="' + item.propietario + '">' + item.propietario + '</td>';
            html += '<td class="tablaplaning" title="' + item.pedido + '">' + item.pedido + '</td>';
            html += '<td class="tablaplaning" title="' + item.consignacion + '">' + item.consignacion + '</td>';
            html += '<td class="tablaplaning" title="' + item.transportista + '">' + item.transportista + '</td>';
            html += '<td class="tablaplaning" title="' + item.estado + '">' + item.estado + '</td>';
            html += '<td class="tablaplaning" title="' + item.peligrosidad + '">' + item.peligrosidad + '</td>';
            html += '<td class="tablaplaning" title="' + item.playa + '">' + item.playa + '</td>';
            html += '<td class="tablaplaning" title="' + item.bultos + '">' + item.bultos + '</td>';
            html += '</tr>';
          });
          document.getElementById("btabladatos").innerHTML = html;
          document.getElementById("contadorbtabladatos").innerText = document.getElementById("btabladatos").children.length;
        })
        .catch(error => {
          Notificacion('error', 'Error', 'No se pudieron cargar los datos: ' + error.message);
        })

      var formDataTemprango = new FormData();
      formDataTemprango.append('funcion', 'selecttemprango')
      fetch(funcionesphpModal_consignacion, { method: 'POST', body: formDataTemprango })
        .then(response => response.json())
        .then(data => {
          var html = '<option value="0" style=";color:black;background-color:white;">Sin Temperatura</option>';
          data.forEach(item => {
            var selected = (item.aux !== null) ? 'selected' : ''
            html += '<option value="' + item.id + '" ' + selected + '>' + item.rango + '</option>';
          });
          select = document.getElementById('selecttemprango')
          select.innerHTML = html;
          cssselect = select.style.cssText;
          select.style.cssText = (select.value !== '0') ? cssselect + ';color:white;background-color:red;font-size:115%;' : cssselect + ';color:black;background-color:white;font-size:100%;';
        })

      var formDataAlertamail = new FormData();
      formDataAlertamail.append('funcion', 'alertamail')
      fetch(funcionesphpModal_consignacion, { method: 'POST', body: formDataAlertamail })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success' && data.resultado == 1) {
            bellactiva.style.display = 'block';
            bellinactiva.style.display = 'none';
          } else {
            bellactiva.style.display = 'none';
            bellinactiva.style.display = 'block';
          }
        })

      var btnedit = document.getElementById("btn-edit");
      var btnguardar = document.getElementById("btn-guardar");
      var btncerrar = document.getElementById("btn-cerrar");
      var divgaleriaconsignacion = document.getElementById("divgaleriaconsignacion");
      var divaccionesconsignacion = document.getElementById("divaccionesconsignacion");
      var divquizcalidadconsignacion = document.getElementById("divquizcalidadconsignacion");


      btnedit.style.visibility = "visible";
      btnguardar.style.visibility = "hidden";
      btncerrar.style.visibility = "hidden";
      divgaleriaconsignacion.style.display = "none";
      document.getElementById('flexCheckDefaultdblclick').checked = false;

      divaccionesconsignacion.style.display = "none";
      divquizcalidadconsignacion.style.display = "none";

      $('#modalconsignacion').modal('show');
      break;

    case 'muelle':
      var muelle = dataid;
      document.getElementById("amuelleseleccionado").innerText = muelle;
      var formData = new FormData();
      formData.append('funcion', 'modal_infomuelle')
      formData.append('muelle', muelle);
      var options = {
        method: 'POST',
        body: formData,
      };

      fetch(funcionesphpModal_muelles, options)
        .then(response => response.json())
        .then(data => {
          var html = '';
          data.forEach(item => {
            switch (item["inout"]) {
              case "IN":
                colorfondo = "#FCF2CE";
                colorletras = "Black";
                break;
              case "OUT":
                colorfondo = "White";
                colorletras = "Black";
                break;
            }
            html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '" style="background:' + colorfondo + ';color:' + colorletras + ';">';
            html += '<td class="tablaplaning" title="' + item.propietario + '">' + item.propietario + '</td>';
            html += '<td class="tablaplaning" title="' + item.consignacion + '">' + item.consignacion + '</td>';
            html += '<td class="tablaplaning" title="' + item.muellereserv + '">' + item.muellereserv + '</td>';
            html += '<td class="tablaplaning" title="' + item.fechallegada + '">' + item.fechallegada + '</td>';
            html += '<td class="tablaplaning" title="' + item.fechasalida + '">' + item.fechasalida + '</td>';
            html += '</tr>';
          });
          document.getElementById("bodytablahistmuelles").innerHTML = html;
          document.getElementById("contadortablahistmuelles").innerText = document.getElementById("bodytablahistmuelles").children.length;
        })

      var formDataReserva = new FormData();
      formDataReserva.append('funcion', 'modal_infomuellereserva')
      formDataReserva.append('muelle', muelle);

      fetch(funcionesphpModal_muelles, { method: 'POST', body: formDataReserva })
        .then(response => response.json())
        .then(data => {
          var html = '';
          data.forEach(item => {
            switch (item["inout"]) {
              case "IN":
                colorfondo = "#FCF2CE";
                colorletras = "Black";
                break;
              case "OUT":
                colorfondo = "White";
                colorletras = "Black";
                break;
            }
            html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '" style="background:' + colorfondo + ';color:' + colorletras + ';">';
            html += '<td class="tablaplaning"><input class="form-check-input" style="transform:scale(1.2);position:initial;margin-top:0px;margin-left:0px" type="checkbox" value="' + item.id + '" id="flexCheckDefault"></input></td>';
            html += '<td class="tablaplaning" title="' + item.propietario + '">' + item.propietario + '</td>';
            html += '<td class="tablaplaning" title="' + item.consignacion + '">' + item.consignacion + '</td>';
            html += '<td class="tablaplaning" title="' + item.transportista + '">' + item.transportista + '</td>';
            html += '<td class="tablaplaning" title="' + item.fechaprevista + '">' + item.fechaprevista + '</td>';
            html += '</tr>';
          });
          document.getElementById("bodytablareservmuelles").innerHTML = html;
          document.getElementById("contadortablareservmuelles").innerText = document.getElementById("bodytablareservmuelles").children.length;
        })

      var formDataLogs = new FormData();
      formDataLogs.append('funcion', 'modal_logsmuelles')
      formDataLogs.append('muelle', muelle);

      fetch(funcionesphpModal_muelles, { method: 'POST', body: formDataLogs })
        .then(response => response.json())
        .then(data => {
          var html = '';
          data.forEach(item => {
            html += '<tr>';
            html += '<td class="tablaplaning" title="' + item.fecha + '">' + item.fecha + '</td>';
            html += '<td class="tablaplaning" title="' + item.descripcion + '">' + item.descripcion + '</td>';
            html += '<td class="tablaplaning" title="' + item.usuario + '">' + item.usuario + '</td>';
            html += '<td class="tablaplaning" title="' + item.instruccion + '">' + item.instruccion + '</td>';
            html += '</tr>';
          });
          document.getElementById("bodytablalogsmuelles").innerHTML = html;
          document.getElementById("contadortablalogsmuelles").innerText = document.getElementById("bodytablalogsmuelles").children.length;
        })

      var formDataActivo = new FormData();
      formDataActivo.append('funcion', 'modal_consultaMuelleActivo')
      formDataActivo.append('muelle', muelle);

      fetch(funcionesphpModal_muelles, { method: 'POST', body: formDataActivo })
        .then(response => response.json())
        .then(data => {
          if (data) {
            document.getElementById("switchMuelle").checked = Number(data.habilitado) === 1
            document.getElementById("switchMuelle").setAttribute('Muelle', data.muelle);
          }
        })



      $('#modalmuelles').modal('show');
      break;
    case 'muelles_empezados':
      $('#modalmuellesempezados').modal('show');
      break;
    case 'muelles_operario':
      $('#modalmuellesoperarios').modal('show');
      break;
    case 'muelles_cdsinmuelles':
      $('#modalmuellescdsinmuelles').modal('show');
      break;

  }

}



function seleccionarvisiblesdblclick() {
  var isChecked = document.getElementById('flexCheckDefaultdblclick').checked;
  var btabladatos = document.getElementById('btabladatos');
  var rows = btabladatos.querySelectorAll('tbody tr');

  rows.forEach(function (row) {
    if (row.style.display !== 'none') {
      var checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = isChecked;
      }
    }
  });
}
