/*
Migrado de Resources/JS/Calendario.js. Los endpoints ahora van contra
public/api/calendario.php (con guard de sesión). Las funciones
dblclick_cab/dblclick_datos/selecttemprango/logsdblclickconsignacion que
existían duplicadas en Resources/PHP/Calendario.php no se migran: eran
código muerto (comunes.js->modal() siempre llama al módulo Consignacion
compartido, no a un endpoint propio de Calendario).
*/

const funcionesphp = baseUrl + 'api/calendario.php';

document.addEventListener('DOMContentLoaded', function () {
  tabla = document.getElementById('tabla-body');
  fechaCampo = document.getElementById('fechaconsultar');

  var fechaActual = new Date();
  var anio = fechaActual.getFullYear();
  var mes = ('0' + (fechaActual.getMonth() + 1)).slice(-2);
  var dia = ('0' + fechaActual.getDate()).slice(-2);
  var fechaFormateada = anio + '-' + mes + '-' + dia;
  fechaCampo.value = fechaFormateada;
  selcalendario = '';

  intotal1 = 0, intotal2 = 0, intotal3 = 0, intotal4 = 0, intotal5 = 0, intotal6 = 0, intotal7 = 0;
  outtotal1 = 0, outtotal2 = 0, outtotal3 = 0, outtotal4 = 0, outtotal5 = 0, outtotal6 = 0, outtotal7 = 0;

  CalendarioProgramado();
  cambiacalendario();
  fechaCampo.addEventListener('change', function () {
    cambiacalendario();
  });

})

function asignatotalizadores() {
  document.getElementById('totalLunes').innerHTML = 'I: ' + intotal1 + ' - ' + 'O: ' + outtotal1 + ' | T: ' + (intotal1 + outtotal1);
  document.getElementById('totalMartes').innerHTML = 'I: ' + intotal2 + ' - ' + 'O: ' + outtotal2 + ' | T: ' + (intotal2 + outtotal2);
  document.getElementById('totalMiércoles').innerHTML = 'I: ' + intotal3 + ' - ' + 'O: ' + outtotal3 + ' | T: ' + (intotal3 + outtotal3);
  document.getElementById('totalJueves').innerHTML = 'I: ' + intotal4 + ' - ' + 'O: ' + outtotal4 + ' | T: ' + (intotal4 + outtotal4);
  document.getElementById('totalViernes').innerHTML = 'I: ' + intotal5 + ' - ' + 'O: ' + outtotal5 + ' | T: ' + (intotal5 + outtotal5);
  document.getElementById('totalSábado').innerHTML = 'I: ' + intotal6 + ' - ' + 'O: ' + outtotal6 + ' | T: ' + (intotal6 + outtotal6);
  document.getElementById('totalDomingo').innerHTML = 'I: ' + intotal7 + ' - ' + 'O: ' + outtotal7 + ' | T: ' + (intotal7 + outtotal7);
}

function cambiacalendario() {
  var selectedDate = new Date(fechaCampo.value);
  var daysOfWeek = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',];

  for (var i = 1; i <= 7; i++) {
    var dayElement = document.getElementById(daysOfWeek[i]);
    var formattedDate = formatDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + i - selectedDate.getDay()));
    dayElement.innerHTML = daysOfWeek[i] + ' ' + formattedDate + '<br><a id="total' + daysOfWeek[i] + '"></a>';
  }
  selcalendario();
}

function formatDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();

  return (day < 10 ? '0' : '') + day + '/' + (month < 10 ? '0' : '') + month + '/' + year;
}


function CalendarioReal() {
  selcalendario = CalendarioReal;
  let formData = new FormData();
  formData.append('funcion', 'CalendarioReal');
  formData.append('fechaconsultada', fechaCampo.value);

  const options = {
    method: 'POST',
    body: formData,
  };

  fetch(funcionesphp, options)
    .then(response => response.json())
    .then(data => {
      creatabla(data);
      calendarioseleccionado.innerHTML = '<strong>Calendario Seleccionado: <a style="color:orange">REAL</a><strong>';
    });


}


function CalendarioProgramado() {
  selcalendario = CalendarioProgramado;
  let formData = new FormData();
  formData.append('funcion', 'CalendarioProgramado');
  formData.append('fechaconsultada', fechaCampo.value);

  const options = {
    method: 'POST',
    body: formData,
  };

  fetch(funcionesphp, options)
    .then(response => response.json())
    .then(data => {
      creatabla(data);
      calendarioseleccionado.innerHTML = '<strong>Calendario Seleccionado: <a style="color:orange">Programado</a><strong>';
    });

}


function creatabla(data) {
  document.getElementById('tabla-body').innerHTML = '';
  let xtramoh = '';
  let xfila = -1;
  let comtramo = -1;
  intotal1 = 0, intotal2 = 0, intotal3 = 0, intotal4 = 0, intotal5 = 0, intotal6 = 0, intotal7 = 0;
  outtotal1 = 0, outtotal2 = 0, outtotal3 = 0, outtotal4 = 0, outtotal5 = 0, outtotal6 = 0, outtotal7 = 0;
  in1 = 0, in2 = 0, in3 = 0, in4 = 0, in5 = 0, in6 = 0, in7 = 0;
  out1 = 0, out2 = 0, out3 = 0, out4 = 0, out5 = 0, out6 = 0, out7 = 0;
  conttramo1 = 0, conttramo2 = 0, conttramo3 = 0, conttramo4 = 0, conttramo5 = 0, conttramo6 = 0, conttramo7 = 0;

  for (j = 0; j < data.length; j++) {

    th = data[j].tramoh.substring(0, 5);
    if (xtramoh !== th) {
      xtramoh = th;
      if (j !== 0) {
        creafilaenblanco('');
        xfila = xfila + 1;
        tabla.rows[xfila].bgColor = '#fcf2ce';
        tabla.rows[xfila].align = 'center';
        for (let i = 1; i <= 7; i++) {
          let inValue = parseInt(window[`in${i}`], 10) || 0;
          let outValue = parseInt(window[`out${i}`], 10) || 0;

          tabla.rows[xfila].cells[i].innerHTML = '↑ I: ' + inValue + ' - O: ' + outValue + ' ↑';

          if (inValue + outValue > 6) {
            tabla.rows[xfila].cells[i].bgColor = 'red';
            tabla.rows[xfila].cells[i].style['color'] = 'white';
          }
        }
      }

      intotal1 = intotal1 + in1, intotal2 = intotal2 + in2, intotal3 = intotal3 + in3, intotal4 = intotal4 + in4, intotal5 = intotal5 + in5, intotal6 = intotal6 + in6, intotal7 = intotal7 + in7
      outtotal1 = outtotal1 + out1, outtotal2 = outtotal2 + out2, outtotal3 = outtotal3 + out3, outtotal4 = outtotal4 + out4, outtotal5 = outtotal5 + out5, outtotal6 = outtotal6 + out6, outtotal7 = outtotal7 + out7
      in1 = 0, in2 = 0, in3 = 0, in4 = 0, in5 = 0, in6 = 0, in7 = 0;
      out1 = 0, out2 = 0, out3 = 0, out4 = 0, out5 = 0, out6 = 0, out7 = 0;
      conttramo1 = 0, conttramo2 = 0, conttramo3 = 0, conttramo4 = 0, conttramo5 = 0, conttramo6 = 0, conttramo7 = 0;

      creafilaenblanco(xtramoh);
      xfila = xfila + 1;
      comtramo = xfila;
    }

    van = xfila;
    sn = 1;
    for (z = comtramo; z <= van; z++) {

      for (i = 1; i <= 7; i++) {
        const Diax = `Dia${i}`;
        const inout = data[j][Diax].substring(0, data[j][Diax].indexOf(' '));
        const id = data[j][Diax].substring(data[j][Diax].lastIndexOf(' ') + 1);
        const valor = data[j][Diax].substring(data[j][Diax].indexOf(' ') + 6, data[j][Diax].lastIndexOf(' '));

        if (data[j][Diax] !== '') {

          if (tabla.rows[z].cells[i].innerHTML == '') {

            tabla.rows[z].cells[i].innerHTML = valor;
            sn = 0;

            if (inout !== '') {
              if (inout == 'IN') {
                window[`in${i}`] = window[`in${i}`] + 1;
              } else {
                window[`out${i}`] = window[`out${i}`] + 1;
              }
            }


            switch (inout) {
              case 'IN':
                tabla.rows[z].cells[i].bgColor = '#FCF2CE';
                break;
              case 'OUT':
                tabla.rows[z].cells[i].bgColor = '#85C1E9';
                tabla.rows[z].cells[i].style['color'] = 'White';
                break;
            }


            tabla.rows[z].cells[i].setAttribute('data-id', id);
            tabla.rows[z].cells[i].align = 'center';
            tabla.rows[z].cells[i].ondblclick = function () { modal('consignacion', this); };
            break;
          } else {
            if (z == van) {
              creafilaenblanco('');
              xfila = xfila + 1;
              tabla.rows[xfila].cells[i].innerHTML = valor;
              if (inout !== '') {
                if (inout == 'IN') {
                  window[`in${i}`] = window[`in${i}`] + 1;
                } else {
                  window[`out${i}`] = window[`out${i}`] + 1;
                }
              }
              sn = 0;
              switch (inout) {
                case 'IN':

                  tabla.rows[xfila].cells[i].bgColor = '#FCF2CE';
                  break;
                case 'OUT':

                  tabla.rows[xfila].cells[i].bgColor = '#85C1E9';
                  tabla.rows[xfila].cells[i].style['color'] = 'White';
                  break;
              }

              tabla.rows[xfila].cells[i].setAttribute('data-id', id);
              tabla.rows[xfila].cells[i].align = 'center';
              tabla.rows[xfila].cells[i].ondblclick = function () { modal('consignacion', this); };
            }
          }
        }
      } if (sn == 0) {
        break;
      }
    }
  }
  asignatotalizadores()

}

function creafilaenblanco(xtramoh) {
  var fila = tabla.insertRow();
  var numColumnas = 8

  fila.style.lineHeight = '12px';
  fila.style.fontSize = '95%';
  celdatramoh = fila.insertCell(0);
  celdatramoh.innerHTML = xtramoh;
  celdatramoh.align = 'center';

  for (var i = 1; i < numColumnas; i++) {
    var celda = fila.insertCell(i);
    celda.innerHTML = "";
  }
}
