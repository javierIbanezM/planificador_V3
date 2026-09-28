/*
Migrado de Resources/JS/Visor de almacén.js. Los endpoints ahora van contra
public/api/visor-almacen.php.
*/

const funcionesphp = baseUrl + 'api/visor-almacen.php';

let circle;
let intervalTime = 40000;
let stepTime = 100;
let stepPercentage = (stepTime / intervalTime) * 100;
let progressInterval;
let tableChangeInterval;
let isAutoUpdateEnabled = true;

function startProgressCircle() {
  if (!isAutoUpdateEnabled) return;

  circle.style.strokeDasharray = '0, 100';
  let progressValue = 0;

  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(function () {
    progressValue += stepPercentage;
    circle.style.strokeDasharray = `${progressValue}, 100`;

    if (progressValue >= 100) {
      clearInterval(progressInterval);
    }
  }, stepTime);
}

function cambiarTablas() {
  const divconsignacionpreparadas = document.getElementById('divconsignacionpreparadas');
  const divpreavisossinrecep = document.getElementById('divpreavisossinrecep');
  const divconsignacionnopreparadas = document.getElementById('divconsignacionnopreparadas');
  const divpreavporllegar = document.getElementById('divpreavporllegar');


  if (divconsignacionpreparadas.style.display === 'none') {
    divconsignacionpreparadas.style.display = 'block';
    divpreavisossinrecep.style.display = 'none';
    divconsignacionnopreparadas.style.display = 'block';
    divpreavporllegar.style.display = 'none';
  } else {
    divconsignacionpreparadas.style.display = 'none';
    divpreavisossinrecep.style.display = 'block';
    divconsignacionnopreparadas.style.display = 'none';
    divpreavporllegar.style.display = 'block';
  }

  startProgressCircle();

  resetTableChangeInterval();
}

function startTableChangeInterval() {
  if (!isAutoUpdateEnabled) return;

  tableChangeInterval = setInterval(function () {
    startProgressCircle();

    cambiarTablas();

  }, intervalTime);
}

function resetTableChangeInterval() {
  if (tableChangeInterval) {
    clearInterval(tableChangeInterval);
  }
  startTableChangeInterval();
}

function toggleAutoUpdate() {
  isAutoUpdateEnabled = !isAutoUpdateEnabled;

  if (isAutoUpdateEnabled) {
    startProgressCircle();
    startTableChangeInterval();
    document.getElementById('closeAautoUpdate').style.display = 'none';
    circle.style.display = 'block';
    circlebg.style.display = 'block';
  } else {
    clearInterval(progressInterval);
    clearInterval(tableChangeInterval);
    circle.style.strokeDasharray = '0, 100';
    document.getElementById('closeAautoUpdate').style.display = 'block';
    circle.style.display = 'none';
    circlebg.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  circle = document.getElementById('circle');

  actualizartablas("Visor de almacén");

  setInterval(function () {
    actualizartablas("Visor de almacén");
  }, 60000);

  startProgressCircle();

  startTableChangeInterval();

});


function actualizartablas(page) {
  if (page === "Visor de almacén") {
    // Cada llamada usa su propio FormData/options: reutilizar el mismo
    // objeto y solo hacer .append('funcion', ...) antes de cada fetch
    // acumulaba varios campos "funcion" en las peticiones siguientes
    // (FormData.append no reemplaza). En PHP no daba error porque $_POST se
    // quedaba con el último valor duplicado, pero en Node/multer/busboy los
    // campos repetidos llegan como array y req.body.funcion deja de
    // coincidir con el switch (404 "Función no reconocida").
    var formData = new FormData();
    formData.append('funcion', 'visordealmacen_consigenlanave');
    var options = {
      method: 'POST',
      body: formData,
    };

    fetch(funcionesphp, options)
      .then(response => response.json())
      .then(data => {
        var html = '';
        var colorfondo = '';
        var colorletras = '';
        data.forEach(item => {
          switch (item.coloresvisorcd) {
            case "B":
              colorfondo = "White";
              colorletras = "black";
              break;
            case "A":
              colorfondo = "Yellow";
              colorletras = "black";
              break;
            case "N":
              colorfondo = "Orange";
              colorletras = "White";
              break;
            case "R":
              colorfondo = "Red";
              colorletras = "White";
              break;
            case "V":
              colorfondo = "limegreen";
              colorletras = "White";
              break;
          }
          html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '">';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.Muelle + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.Playa + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.propietario + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.consignacion + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.Observaciones + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.transportista + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.fechaprevista + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.fechallegada + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item["Asign. m"] + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item["T. M. Asig"] + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.estado + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.estadocd + '</td>';
          html += '</tr>';
        })
        document.getElementById("tabla-visoralmacencd").innerHTML = html;
      })

    var formData2 = new FormData();
    formData2.append('funcion', 'visordealmacen_consigpreparadas');
    fetch(funcionesphp, { method: 'POST', body: formData2 })
      .then(response => response.json())
      .then(data => {
        var html = '';
        data.forEach(item => {
          html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '">';
          html += '<td class="tablaplaning">' + item.propietario + '</td>';
          html += '<td class="tablaplaning">' + item.consignacion + '</td>';
          html += '<td class="tablaplaning">' + item.estado + '</td>';
          html += '<td class="tablaplaning">' + item.fecha_prevista + '</td>';
          html += '<td class="tablaplaning">' + item.hora_programada + '</td>';
          html += '</tr>';
        })
        document.getElementById("tabla-consignacionespreparadas").innerHTML = html;
        document.getElementById("contadorconsignacionespreparadas").innerText = document.getElementById("tabla-consignacionespreparadas").children.length;
      })

    var formData3 = new FormData();
    formData3.append('funcion', 'visordealmacen_preavsinrecep');
    fetch(funcionesphp, { method: 'POST', body: formData3 })
      .then(response => response.json())
      .then(data => {
        var html = '';
        data.forEach(item => {
          switch (item.colores) {
            case "B":
              colorfondo = "White";
              colorletras = "black";
              break;
            case "A":
              colorfondo = "Yellow";
              colorletras = "black";
              break;
            case "N":
              colorfondo = "Orange";
              colorletras = "White";
              break;
            case "R":
              colorfondo = "Red";
              colorletras = "White";
              break;
          }
          html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '">';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.propietario + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.albaran + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.ubicacion + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.bultosdescargados + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.estado + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.fechafinalizado + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.tiemposinrecepcionar + '</td>';
          html += '</tr>';
        })
        document.getElementById("tabla-preavisossinrecep").innerHTML = html;
        document.getElementById("contadorpreavisossinrecep").innerText = document.getElementById("tabla-preavisossinrecep").children.length;
      })

    var formData4 = new FormData();
    formData4.append('funcion', 'visordealmacen_consignopreparadas');
    fetch(funcionesphp, { method: 'POST', body: formData4 })
      .then(response => response.json())
      .then(data => {
        var html = '';
        var colorfondo = '';
        var colorletras = '';
        data.forEach(item => {
          switch (item.colores) {
            case "B":
              colorfondo = "White";
              colorletras = "black";
              break;
            case "A":
              colorfondo = "Yellow";
              colorletras = "black";
              break;
            case "N":
              colorfondo = "Orange";
              colorletras = "White";
              break;
            case "R":
              colorfondo = "Red";
              colorletras = "White";
              break;
          }
          html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '">';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.propietario + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.consignacion + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.estado + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.fecha_prevista + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.hora_programada + '</td>';
          html += '</tr>';
        })
        document.getElementById("tabla-consignacionesnopreparadas").innerHTML = html;
        document.getElementById("contadorconsignacionesnopreparadas").innerText = document.getElementById("tabla-consignacionesnopreparadas").children.length;
      })

    var formData5 = new FormData();
    formData5.append('funcion', 'visordealmacen_preavporllegar');
    fetch(funcionesphp, { method: 'POST', body: formData5 })
      .then(response => response.json())
      .then(data => {
        var html = '';
        data.forEach(item => {
          switch (item.colores) {
            case "B":
              colorfondo = "White";
              colorletras = "black";
              break;
            case "A":
              colorfondo = "Yellow";
              colorletras = "black";
              break;
            case "N":
              colorfondo = "Orange";
              colorletras = "White";
              break;
            case "R":
              colorfondo = "Red";
              colorletras = "White";
              break;
          }
          html += '<tr ondblclick="modal(\'consignacion\',this)" data-id="' + item.id + '">';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.propietario + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.albaran + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.transportista + '</td>';
          html += '<td class="tablaplaning" style="background:' + colorfondo + ';color:' + colorletras + '">' + item.progr + '</td>';
          html += '</tr>';
        })
        document.getElementById("tabla-preavisosporllegar").innerHTML = html;
        document.getElementById("contadorpreavisosporllegar").innerText = document.getElementById("tabla-preavisosporllegar").children.length;
      })

  }
}
