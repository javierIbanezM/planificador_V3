// Migrado de cdmuelles/cargadescarga.php (bloque <script> original).
// Flujo principal: selección de muelle, tabla de órdenes, estado de cada
// orden y sus pantallas (quiz de calidad / fotos / bultos), cierre de
// sesión y observaciones. El escaneo ZXing vive en cdmuelles-calidad.js y
// la subida/gestión de fotos en cdmuelles-fotos.js.

let intentosFallidosCodigoBarras = 0;
let sondaIngresadaManualmente = false;
let pinJefeSonda = '';
let DivContenidoDinamico;
let almacen, muelle, inout, usuario, impresora, idplanigrid, id, discrepancia;
let pinjefebultos;
// true cuando EnviarDatosCD detectó contenedores sin escanear en el último
// intento: fuerza discrepancia=1 en continuarEnviarDatosCD sin depender de
// que el atributo "bultos" (total esperado) case exactamente con el conteo
// de contenedores verificados.
let discrepanciaContenedoresPendiente = false;

document.addEventListener('DOMContentLoaded', function () {
    DivContenidoDinamico = document.getElementById('ContenidoDinamico');

    almacen = document.getElementById('almacen').innerText;
    muelle = '';
    inout = '';
    usuario = document.getElementById('usuario').innerText;
    impresora = '';

    mostrarmuelles();
});

function inicio() {
    location.reload(true);
}

function mostrarmuelles() {
    const formData = new FormData();
    formData.append('almacen', almacen);

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'mostrar-muelles.php', options)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        })
        .then(data => {
            if (data.length > 0) {
                var titulo = '<p class="lead mb-0">Seleccione el Muelle que va a Cargar/Descargar</p>'
                var html = '';
                data.forEach(item => {
                    let colorestilo, colorfuente;
                    switch (item.color) {
                        case '1':
                            colorestilo = 'white';
                            colorfuente = 'black';
                            break;
                        case '2':
                            colorestilo = 'yellow';
                            colorfuente = 'black';
                            break;
                        case '3':
                            colorestilo = 'orange';
                            colorfuente = 'white';
                            break;
                        case '4':
                            colorestilo = 'red';
                            colorfuente = 'white';
                            break;
                    }
                    html += '<input class="form-control" onclick="muelleseleccionado(this)" id="' + 'Muelle' + item.muelle + '" type="text" muelle="' + item.muelle + '" value="' + item.muelle + item.empezado + '" style="background:' + colorestilo + ' ;color: ' + colorfuente + ';width:8.5%;min-width:50px;max-width:100px;text-align:center;display:inline;margin-top:0.5%;margin-right:7px" readonly>';
                });

                DivContenidoDinamico.innerHTML = titulo;
                DivContenidoDinamico.innerHTML += html;
            } else {
                var titulo = '<p class="lead mb-0">No hay muelles asignados. En caso de error, contactar con el Jefe de Turno.</p>'
                DivContenidoDinamico.innerHTML = titulo;
            }
        })
}

function muelleseleccionado(item) {
    document.getElementById('overlay').style.display = 'block';
    const muelleSeleccionadoElement = document.getElementById('muelleSeleccionado');
    muelle = item.getAttribute('muelle');
    muelleSeleccionadoElement.textContent += muelle;
    muelleSeleccionadoElement.style.display = 'flex';

    mostrartablaOrdenes(1);
}

function mostrartablaOrdenes(sitio) {
    const formData = new FormData();
    formData.append('almacen', almacen);
    formData.append('muelle', muelle);
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'mostrar-tabla-ordenes.php', options)
        .then(response => response.json())
        .then(data => {
            var titulo = '<p class="lead mb-0">Seleccione la tarea a realizar:</p>';

            var table = document.createElement('table');
            table.className = 'table table-light table-bordered dataTable';

            var thead = document.createElement('thead');
            var headerRow = document.createElement('tr');

            var headerColumnAgrupa = document.createElement('th');
            headerColumnAgrupa.style.width = '0%';
            headerColumnAgrupa.innerHTML = '<input class="form-check-input" style="transform:scale(1.5);position:initial;margin-top:0px;margin-left:0px" type="checkbox" onchange="seleccionarvisibles()" id="flexCheckDefault"></input>';

            var headerColumnCD = document.createElement('th');
            headerColumnCD.className = 'pt-2 pb-2';
            headerColumnCD.textContent = 'Carga/Descarga';

            var headerColumnEstadoCD = document.createElement('th');
            headerColumnEstadoCD.className = 'pt-2 pb-2';
            headerColumnEstadoCD.textContent = 'Estado de Carga';

            var headerColumnUsuarios = document.createElement('th');
            headerColumnUsuarios.className = 'pt-2 pb-2';
            headerColumnUsuarios.textContent = 'Usuarios';

            headerRow.appendChild(headerColumnAgrupa);
            headerRow.appendChild(headerColumnCD);
            headerRow.appendChild(headerColumnEstadoCD);
            headerRow.appendChild(headerColumnUsuarios);

            thead.appendChild(headerRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            tbody.className = 'tabla-body';
            tbody.id = 'tablaOrdenes';

            data.forEach(item => {
                var row = document.createElement('tr');
                row.setAttribute('data-id', item.id);

                switch (item.color) {
                    case 'verde':
                        row.style.backgroundColor = 'limegreen';
                        break;
                    case 'rojo':
                        row.style.backgroundColor = 'red';
                        row.style.color = 'white';
                        break;
                    case 'blanco':
                        break;
                    case 'amarillo':
                        row.style.backgroundColor = 'yellow';
                        row.style.color = 'black';
                        break;
                }

                var ColumnAgrupa = document.createElement('td');
                ColumnAgrupa.className = 'tablaplaning';
                ColumnAgrupa.style.textAlign = 'center';
                ColumnAgrupa.style.padding = '0px';
                ColumnAgrupa.innerHTML = '<input class="form-check-input" style="transform:scale(1.5);position:initial;margin-top:0px;margin-left:0px;text-align:center;padding:0px" type="checkbox" value="' + item.id + '" id="flexCheckDefault"></input>';

                var ColumnCD = document.createElement('td');
                ColumnCD.className = 'tablaplaning';
                ColumnCD.textContent = item.consignacion;
                ColumnCD.onclick = function () {
                    consultaestado(this.parentElement);
                };

                var ColumnEstadoCD = document.createElement('td');
                ColumnEstadoCD.className = 'tablaplaning';
                ColumnEstadoCD.textContent = item.estadocarga;
                ColumnEstadoCD.onclick = function () {
                    consultaestado(this.parentElement);
                };

                var ColumnUsuarios = document.createElement('td');
                ColumnUsuarios.className = 'tablaplaning';
                ColumnUsuarios.textContent = item.usuarios;
                ColumnUsuarios.onclick = function () {
                    consultaestado(this.parentElement);
                };

                row.appendChild(ColumnAgrupa);
                row.appendChild(ColumnCD);
                row.appendChild(ColumnEstadoCD);
                row.appendChild(ColumnUsuarios);

                tbody.appendChild(row);
            });

            table.appendChild(tbody);

            if (sitio == 1) {
                DivContenidoDinamico.innerHTML = titulo;
            } else {
                DivContenidoDinamico.innerHTML += titulo;
            }
            DivContenidoDinamico.appendChild(table);
        })
    document.getElementById('overlay').style.display = 'none';
}

function seleccionarvisibles() {
    var isChecked = document.getElementById('flexCheckDefault').checked;
    var tbody = document.getElementById('tablaOrdenes');
    var rows = tbody.querySelectorAll('tr');

    rows.forEach(function (row) {
        if (row.style.display !== 'none') {
            var checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = isChecked;
            }
        }
    });
}

function esObjetoHTML(elemento) {
    return elemento instanceof HTMLElement;
}

// Migrado de funcion=AsigVariablesession, restringido a una lista blanca de
// claves en el servidor (ver SesionController::CLAVES_PERMITIDAS).
function variablesesion(valor, opcion) {
    const formData = new FormData();
    formData.append('valor', valor);
    formData.append('opcion', opcion);
    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'variable-sesion.php', options)
        .then(response => {
            response.text();
        })
}

function consultaestado(dataid) {
    const OrdenSeleccionadaElement = document.getElementById('OrdenSeleccionada');
    if (esObjetoHTML(dataid)) {
        idplanigrid = dataid.getAttribute("data-id");
        OrdenSeleccionadaElement.textContent = "Orden: " + dataid.cells[0].innerText;
        OrdenSeleccionadaElement.style.display = 'inline';
    } else {
        idplanigrid = idplanigrid;
    }
    variablesesion('id', idplanigrid);

    const formData = new FormData();
    formData.append('id', idplanigrid);

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'consultar-estado.php', options)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        })
        .then(data => {
            inout = data.inout;
            switch (data.estado) {
                case 'Quiz de Calidad':
                    botonquiz()
                    break;

                case 'Fotografia Inicial':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden();
                    mostrarimgorden('INICIAL');
                    break;

                case 'Fotografía Sonda':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden();
                    mostrarimgorden('SONDA');
                    break;

                case 'Fotografía Datalogger':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden();
                    mostrarimgorden('DATALOGGER');
                    break;

                case 'Escanear Código':
                    iniciarEscaneoDesdeConsultaEstado();
                    break;

                case 'Fotografía Precinto':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden();
                    mostrarimgorden('PRECINTO');
                    break;

                case 'Finalizada':
                    // Solo se llega aquí cuando de verdad no queda nada
                    // pendiente (avanzarEstadoTrasFoto no marca 'Finalizada'
                    // mientras falte Datalogger o Precinto activados, en ese
                    // caso el switch ya habría entrado en esos otros casos
                    // antes). No tiene sentido reabrir "Indicar Bultos" para
                    // un pedido ya finalizado: se recarga la página, igual
                    // que en entrada, para volver al menú de selección de
                    // muelle.
                    alert('Carga descarga finalizada Correctamente :)');
                    inicio();
                    break;

                case 'Pendiente Almacen':
                case 'Aprobación del Jefe de turno':
                    mostrartablaOrdenes(2);
                    DivContenidoDinamico.innerHTML = `
        <div class="col-auto text-center pt-2 pb-2" id="SeleccionPedidos" style="display:block;background: white;padding-bottom:20px;max-height:70%;overflow:auto;">
            <div class="text-center" style="width:100%;background:white;">
                <select id="playaIN" style="display:none;width:20%;position:absolute;top:5%;left:5%;">
                    <!-- Se escribe por script -->
                </select>
                <p class="lead">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="botonobservaciones()" style="margin-right:8px;vertical-align:middle;">Ver observaciones</button>
                </p>
                <div id="divInputContenedor" style="display:none;margin:10px 0;">
                    <input type="text" id="inputContenedorGlobal" placeholder="Escanee o escriba nº contenedor" style="width:65%" onkeydown="if(event.key==='Enter'){event.preventDefault();verificarContenedorGlobal(this);}">
                    <button type="button" class="btn btn-primary btn-sm" onclick="verificarContenedorGlobal(document.getElementById('inputContenedorGlobal'))">Verificar</button>
                </div>
                <input id="campoOtro" maxlength="50" placeholder="Playa" style="display:none;width:20%;position:absolute;top:5%;right:5%;color:red">
                <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" id="cambiapqpl" onclick="cambiapqpl()" style="display:none;position:absolute;top:1%;right:1%;" fill="currentColor" class="bi bi-boxes" viewBox="0 0 16 16">
                    <path d="M7.752.066a.5.5 0 0 1 .496 0l3.75 2.143a.5.5 0 0 1 .252.434v3.995l3.498 2A.5.5 0 0 1 16 9.07v4.286a.5.5 0 0 1-.252.434l-3.75 2.143a.5.5 0 0 1-.496 0l-3.502-2-3.502 2.001a.5.5 0 0 1-.496 0l-3.75-2.143A.5.5 0 0 1 0 13.357V9.071a.5.5 0 0 1 .252-.434L3.75 6.638V2.643a.5.5 0 0 1 .252-.434zM4.25 7.504 1.508 9.071l2.742 1.567 2.742-1.567zM7.5 9.933l-2.75 1.571v3.134l2.75-1.571zm1 3.134 2.75 1.571v-3.134L8.5 9.933zm.508-3.996 2.742 1.567 2.742-1.567-2.742-1.567zm2.242-2.433V3.504L8.5 5.076V8.21zM7.5 8.21V5.076L4.75 3.504v3.134zM5.258 2.643 8 4.21l2.742-1.567L8 1.076zM15 9.933l-2.75 1.571v3.134L15 13.067zM3.75 14.638v-3.134L1 9.933v3.134z"/>
                </svg>
                <table class="table table-light table-bordered dataTable">
                    <thead>
                        <tr>
                            <th class="pt-2 pb-2">Albarán</th>
                            <th class="pt-2 pb-2">Bultos</th>
                        </tr>
                    </thead>
                    <tbody class="tabla-body" id="tbodypedidospreavisos">
                        <!-- Se escribe por Script -->
                    </tbody>
                </table>

                <div style="display:none" id="DivIndicarPlayaRecepcion">
                    <p class="mt-2" style="color:red"><strong>Indicar la playa donde descargó la mercancía:</strong></p>
                    <input id="Playarecepcion" type="text" placeholder="E999" autocomplete="off" autocomplete="new-password">
                    <hr>
                </div>

                <div style="display:none" id="AutorizaciónJefeEquipobultos">
                    <p class="mt-2" style="color:red">Aprobación de cargar en discrepancia<br>Notificar a Jefe de turno para que apruebe discrepancia</p>
                    <p id="detalleDiscrepanciaContenedores" style="color:red;font-size:smaller;white-space:pre-line;"></p>
                    <input id="pinjefebultos" type="password" placeholder="Pin Jefe de turno" autocomplete="off" autocomplete="new-password">
                    <hr>
                </div>

                <button type="button" class="btn btn-primary" id="EnviarDatosCD" onclick="EnviarDatosCD()" style="margin-top:10px;">Finalizar</button>
            </div>
        </div>
    `;
                    entrarorden2(idplanigrid);
                    break;

                case 'Fotografía de transcurso':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden();
                    mostrarimgorden('TRANSCURSO');
                    break;

                case 'Fotografía Final':
                    DivContenidoDinamico.innerHTML = plantillaImagenesOrden(true);
                    mostrarimgorden('FINAL');
                    break;
            }
        })
}

function cierresesion() {
    const formData = new FormData();
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'cerrar-sesion.php', options)
        .then(response => {
            return response.json();
        })
        .then(data => {
            window.location.href = "index.php?almacen=" + data.almacen;
        })
}

function entrarorden2(dataid) {
    btncheckcalidad.style.display = 'block';
    btnobservaciones.style.display = 'block';
    btncamera.style.display = 'block';
    mostraralbaranes(dataid);
}

function cambiapqpl() {
    if (document.getElementById('bultostotalespq')) {
        consultaestado(idplanigrid);
    } else {
        SeleccionPedidos.innerHTML = `
    <div class="text-center" style="width:100%;background:white;">
                <p class="lead">Indicar Bultos totales</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" id="cambiapqpl" onclick="cambiapqpl()" style="display:block;position:absolute;top:1%;right:1%;" fill="currentColor" class="bi bi-boxes" viewBox="0 0 16 16">
                    <path d="M7.752.066a.5.5 0 0 1 .496 0l3.75 2.143a.5.5 0 0 1 .252.434v3.995l3.498 2A.5.5 0 0 1 16 9.07v4.286a.5.5 0 0 1-.252.434l-3.75 2.143a.5.5 0 0 1-.496 0l-3.502-2-3.502 2.001a.5.5 0 0 1-.496 0l-3.75-2.143A.5.5 0 0 1 0 13.357V9.071a.5.5 0 0 1 .252-.434L3.75 6.638V2.643a.5.5 0 0 1 .252-.434zM4.25 7.504 1.508 9.071l2.742 1.567 2.742-1.567zM7.5 9.933l-2.75 1.571v3.134l2.75-1.571zm1 3.134 2.75 1.571v-3.134L8.5 9.933zm.508-3.996 2.742 1.567 2.742-1.567-2.742-1.567zm2.242-2.433V3.504L8.5 5.076V8.21zM7.5 8.21V5.076L4.75 3.504v3.134zM5.258 2.643 8 4.21l2.742-1.567L8 1.076zM15 9.933l-2.75 1.571v3.134L15 13.067zM3.75 14.638v-3.134L1 9.933v3.134z"/>
                </svg>

                <input type="number" id="bultostotalespq" placeholder="Bultos totales" />
                <p id="notapq" style="color:red;"></p>
                <div style="display:none" id="AutorizaciónJefeEquipobultos">
                    <p class="mt-2" style="color:red">Aprobación de cargar en discrepancia<br>Notificar a Jefe de turno para que apruebe discrepancia</p>
                    <input id="pinjefebultos" type="password" placeholder="Pin Jefe de turno">
                </div>

                <button type="button" class="btn btn-primary" id="EnviarDatosCD" onclick="EnviarDatosCDPQ()">Finalizar</button>
            </div>
    `;
    }
}

function EnviarDatosCDPQ() {
    if (!bultostotalespq.value) {
        alert('Introduce los bultos totales de la carga de esta consignación.');
        return;
    }
    const formData = new FormData();
    formData.append('id', id);
    formData.append('bultos', bultostotalespq.value);
    formData.append('usuario', usuario)

    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'enviar-datos-cdpq.php', options)
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.resultado === 'correcto') {
                consultaestado(idplanigrid);
            } else {
                notapq.innerHTML = '<strong>Discrepancia</strong><br>NO son ' + bultostotalespq.value + ', Deberás realizar carga convencional';
            }
        })
}

function mostraralbaranes(idplanigridParam) {
    id = idplanigridParam
    pinjefebultos = document.getElementById("pinjefebultos")
    const formData = new FormData();
    formData.append('id', id);
    const options = {
        method: 'POST',
        body: formData,
    };

    setTimeout(function () {
        fetch(cdmuellesApiBase + 'mostrar-albaranes.php', options)
            .then(response => {
                return response.json();
            })
            .then(data => {
                if (data.length >= 10) {
                    document.getElementById('cambiapqpl').style.display = 'block';
                }
                var html = '';
                var ispinjefebultos = '';
                inout = data[0].inout;
                if (data[0].inout == "IN") {
                    playaIN.style.display = 'block'
                    const formDataUbic = new FormData();
                    formDataUbic.append('id', id);
                    fetch(cdmuellesApiBase + 'select-ubicaciones.php', { method: 'POST', body: formDataUbic })
                        .then(response => response.json())
                        .then(data => {
                            var html = '<option value="Seleccionar" style=";color:black;background-color:white;">Seleccionar</option>';
                            data.forEach(item => {
                                html += '<option value="' + item.ubicacion + '">' + item.ubicacion + '</option>';
                            });
                            html += '<option value="Otra opción" style=";color:black;background-color:white;">Otra Opción</option>';
                            const select = document.getElementById('playaIN')
                            select.innerHTML = html;
                            select.addEventListener('change', function () {
                                var selectedOption = select.options[select.selectedIndex].value;
                                if (selectedOption === 'Otra opción') {
                                    campoOtro.style.display = 'block';
                                } else {
                                    campoOtro.style.display = 'none';
                                }
                            })
                            const cssselect = select.style.cssText;
                            select.style.cssText = (select.value !== '0') ? cssselect + ';font-size:115%;' : cssselect + ';color:black;background-color:white;font-size:100%;';
                        })
                } else { playaIN.style.display = 'none' }
                data.forEach(item => {
                    ispinjefebultos = item.estadocdmuelles;
                    html += '<tr albaran="' + item.albaran + '" inout="' + item.inout + '" bultos="' + item.bultos + '" idplanigrid="' + item.idplanigrid + '">';
                    html += '    <td style="text-align:center;width:30%; padding: 12px 2px">' + item.albaran + '</td>';
                    if (item.inout === 'OUT') {
                        // Salida: en vez de +/- a ciegas, se verifica cada
                        // contenedor esperado (API Whales) por escaneo o a
                        // mano, con un único input global compartido por toda
                        // la carga (ver divInputContenedor/verificarContenedorGlobal)
                        // en vez de uno por pedido: si la consignación está
                        // agrupada, el operario no tiene que acertar en qué
                        // fila escanea cada contenedor.
                        html += '    <td style="text-align:center;width:60%; padding:5px;">';
                        html += '        <span id="valorBultos">' + item.bultoscargados + '</span>';
                        html += '        <div id="contenedoresLista" style="margin:5px 0;"></div>';
                        html += '    </td>';
                    } else {
                        html += '    <td style="text-align:center;width:60%; padding:0px;">';
                        html += '        <button style="font-size:130%;margin-right:5%;" onclick="decrementarBultos(this)"> - </button>';
                        html += '        <span id="valorBultos">' + item.bultoscargados + '</span>';
                        html += '        <button style="font-size:130%;margin-left:5%;" onclick="incrementarBultos(this)"> + </button>';
                        html += '    </td>';
                    }
                    html += '</tr>';
                });
                document.getElementById('tbodypedidospreavisos').innerHTML = html;
                document.getElementById('tbodypedidospreavisos').setAttribute('inout', inout);

                if (inout === 'OUT') {
                    document.getElementById('divInputContenedor').style.display = 'block';
                    document.querySelectorAll('#tbodypedidospreavisos tr').forEach(row => cargarContenedoresAlbaran(row));
                } else {
                    document.getElementById('divInputContenedor').style.display = 'none';
                }
                if (ispinjefebultos === 5) {
                    document.getElementById('AutorizaciónJefeEquipobultos').style.display = "block";
                    colorestbodypedidospreavisos();
                } else {
                    document.getElementById('AutorizaciónJefeEquipobultos').style.display = "none";
                }
                pinjefebultos.value = '';
            });
    }, 3000);
}

function colorestbodypedidospreavisos() {
    if (document.getElementById('tbodypedidospreavisos').getAttribute('inout') == 'OUT') {
        var cantfilas = document.getElementById('tbodypedidospreavisos').getElementsByTagName('tr').length;
        var filas = document.getElementById('tbodypedidospreavisos').querySelectorAll('tr');

        discrepancia = 0;

        for (var i = 0; i < cantfilas; i++) {
            var bultos = filas[i].getAttribute('bultos');
            var spanInnerText = filas[i].getElementsByTagName('span')[0].innerText;
            if (bultos === spanInnerText) {
                filas[i].style.backgroundColor = "limegreen";
                filas[i].style.color = "black";
            } else {
                discrepancia = 1;
                filas[i].style.backgroundColor = "red";
                filas[i].style.color = "white";
            }
        }
    } else {
        discrepancia = 0;
    }
}

function incrementarBultos(button) {
    document.getElementById('overlay').style.display = 'flex';
    var row = button.closest('tr');
    var albaran = row.getAttribute('albaran');
    idplanigrid = row.getAttribute('idplanigrid');
    inout = row.getAttribute('inout');

    if (inout == 'IN') {
        if (playaIN.value.trim() === 'Seleccionar') {
            alert('Playa vacía, por favor indique playa para continuar.');
            document.getElementById('overlay').style.display = 'none';
            playaIN.focus();
            return;
        } else if (playaIN.value.trim() === 'Otra opción' && campoOtro.style.display !== 'none' && campoOtro.value.trim() === '') {
            alert('Por favor, ingrese una opción válida en el campo de texto.');
            document.getElementById('overlay').style.display = 'none';
            campoOtro.focus();
            return;
        }
    }

    var valorBultosElement = row.querySelector('[id="valorBultos"]');
    var valorBultosMas1 = parseInt(valorBultosElement.innerText) + 1;
    var bultostotales = parseInt(row.getAttribute('bultos'));

    const formData = new FormData();
    formData.append('albaran', albaran);
    formData.append('idplanigrid', idplanigrid);
    formData.append('usuario', usuario);
    var contenedor = button.getAttribute('data-contenedor');
    if (contenedor) {
        formData.append('contenedor', contenedor);
    }
    if (playaIN.value.trim() !== null) {
        if (campoOtro.style.display === 'block') {
            formData.append('playa', campoOtro.value.trim());
        } else {
            formData.append('playa', playaIN.value);
        }
    }
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'incrementar-bultos.php', options)
        .then(response => response.json())
        .then(data => {
            if (data.status == 'success') {
                valorBultosElement.innerText = valorBultosMas1;
                document.getElementById('overlay').style.display = 'none';
                document.getElementById('AutorizaciónJefeEquipobultos').style.display = 'none';
            }
        });

    if (bultostotales === null || isNaN(bultostotales) && inout === 'OUT') {
        if (valorBultosMas1 % 6 === 0) {
            const formDataEstado = new FormData();
            formDataEstado.append('estado', 4);
            formDataEstado.append('id', idplanigrid);
            fetch(cdmuellesApiBase + 'cambiar-estado.php', { method: 'POST', body: formDataEstado })
                .then(response => response.json())
                .then(data => {
                    if (data.status == 'success') {
                        document.getElementById('overlay').style.display = 'none';
                        consultaestado(id);
                    }
                });
        }
    } else if (bultostotales >= 4) {
        var umbral = parseInt(bultostotales / 2);
        if (umbral == valorBultosElement.innerText) {
            const formDataEstado = new FormData();
            formDataEstado.append('estado', 4);
            formDataEstado.append('id', idplanigrid);
            fetch(cdmuellesApiBase + 'cambiar-estado.php', { method: 'POST', body: formDataEstado })
                .then(response => response.json())
                .then(data => {
                    if (data.status == 'success') {
                        document.getElementById('overlay').style.display = 'none';
                        consultaestado(id);
                    }
                });
        }
    }
}

function decrementarBultos(button) {
    document.getElementById('overlay').style.display = 'flex';
    var row = button.closest('tr');
    var albaran = row.getAttribute('albaran');
    idplanigrid = row.getAttribute('idplanigrid');
    var valorBultosElement = row.querySelector('[id="valorBultos"]');
    var valorBultos = parseInt(valorBultosElement.innerText);
    var valorBultosMenos1 = valorBultos - 1;

    if (valorBultos > 0) {
        const formData = new FormData();
        formData.append('albaran', albaran);
        formData.append('idplanigrid', idplanigrid);
        formData.append('usuario', usuario);
        const options = {
            method: 'POST',
            body: formData,
        };
        fetch(cdmuellesApiBase + 'decrementar-bultos.php', options)
            .then(response => response.json())
            .then(data => {
                if (data.status == 'success') {
                    valorBultosElement.innerText = valorBultosMenos1;
                    document.getElementById('AutorizaciónJefeEquipobultos').style.display = 'none';
                    document.getElementById('overlay').style.display = 'none';
                }
            })
    } else {
        document.getElementById('overlay').style.display = 'none';
    }
}

// Verificación de contenedores por albarán (salida/OUT): sustituye al +/-
// manual. Se consulta al API de pedidos (Whales) la lista de contenedores
// esperados y se van marcando en verde a medida que el operario los
// escanea (o los escribe a mano, ambas vías rellenan igual el input).
function cargarContenedoresAlbaran(row) {
    const lista = row.querySelector('#contenedoresLista');
    if (!lista) {
        return Promise.resolve();
    }

    lista.innerHTML = 'Consultando contenedores…';

    const formData = new FormData();
    formData.append('idplanigrid', row.getAttribute('idplanigrid'));
    formData.append('albaran', row.getAttribute('albaran'));

    // Devuelve la promesa del fetch para que quien necesite esperar a que la
    // foto de contenedores esté al día (p.ej. reintentarEscaneoTrasRefrescoWhales)
    // pueda encadenarla, en vez de asumir que ya ha terminado.
    return fetch(cdmuellesApiBase + 'contenedores-albaran.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // data.containers ya trae "verificado" calculado en servidor
                // (planigrid_cdmuelles.contenedor), compartido entre
                // dispositivos: si ya lo escaneó otro terminal, aquí sale
                // marcado en verde desde el principio.
                // codigos trae todos los alias válidos para este bulto (p.ej.
                // en SAGUNTO, el palet y cada contenedor que va dentro de él):
                // escanear cualquiera de ellos verifica el bulto entero.
                const containers = data.containers.map(c => ({
                    container: c.container,
                    codigos: Array.isArray(c.codigos) && c.codigos.length ? c.codigos : [c.container],
                    verificado: !!c.verificado,
                }));
                row.setAttribute('data-containers', JSON.stringify(containers));
                renderizarContenedores(row);

                // El número de "Bultos" se sincroniza SIEMPRE con el
                // recuento real de verificados en servidor, en vez de
                // fiarse de la suma/resta incremental (+1 al escanear, -1 al
                // quitar): si alguna de esas llamadas no llegó a tiempo o
                // falló, o lo tocó otro dispositivo, este refresco corrige
                // el número en vez de arrastrar el desajuste.
                const valorBultosElement = row.querySelector('[id="valorBultos"]');
                if (valorBultosElement) {
                    valorBultosElement.innerText = containers.filter(c => c.verificado).length;
                }
            } else {
                lista.innerHTML = '<span style="color:red">' + (data.message || 'Error al consultar contenedores') + '</span>';
            }
        })
        .catch(() => {
            lista.innerHTML = '<span style="color:red">Error de conexión al consultar contenedores</span>';
        });
}

function renderizarContenedores(row) {
    const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
    const lista = row.querySelector('#contenedoresLista');

    // Solo se muestran los ya verificados (en verde). Los pendientes no se
    // pintan, para que el operario no vea de antemano la numeración de los
    // contenedores que faltan y tenga que escanearlos/escribirlos a ciegas.
    lista.innerHTML = containers
        .filter(c => c.verificado)
        .map(c =>
            '<span style="display:inline-block;margin:2px;padding:2px 8px;border-radius:4px;font-size:smaller;background:#28a745;color:white">'
            + c.container
            + ' <span style="cursor:pointer;font-weight:bold" onclick="quitarContenedor(this)" title="Quitar contenedor">×</span>'
            + '</span>'
        ).join('');
}

// Quita un contenedor ya verificado por error (p.ej. no cabe en la carga):
// borra su bulto en servidor y resta 1 de "Bultos", igual que si nunca se
// hubiera escaneado. A diferencia del "-" de entrada (que solo sabe quitar
// el último bulto sumado), esto borra el contenedor exacto pulsado.
function quitarContenedor(spanX) {
    const contenedorSpan = spanX.parentElement;
    const contenedor = contenedorSpan.textContent.replace('×', '').trim();
    const row = contenedorSpan.closest('tr');

    quitarContenedorPorValor(row, contenedor).catch(() => {
        alert('Error de conexión al quitar el contenedor.');
    });
}

// Núcleo reutilizable de "quitar contenedor": llama al backend para borrar
// su bulto en planigrid_cdmuelles y actualiza la foto/contador en pantalla.
// Lo usa tanto el click en la "×" (quitarContenedor) como la comprobación
// automática al Finalizar (ver EnviarDatosCD), cuando un contenedor que
// estaba validado en verde ha dejado de existir en Whales.
function quitarContenedorPorValor(row, contenedor) {
    const albaran = row.getAttribute('albaran');
    const idplanigridFila = row.getAttribute('idplanigrid');

    const formData = new FormData();
    formData.append('idplanigrid', idplanigridFila);
    formData.append('albaran', albaran);
    formData.append('usuario', usuario);
    formData.append('contenedor', contenedor);

    return fetch(cdmuellesApiBase + 'quitar-contenedor.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                alert('No se pudo quitar el contenedor ' + contenedor + ': ' + (data.message || 'error desconocido'));
                return;
            }

            // Si el contenedor ya no viene en la foto (porque se refrescó
            // antes contra Whales y ha desaparecido del todo), no hay nada
            // que marcar en data-containers: renderizarContenedores() ya no
            // lo pintará al no estar en la lista. Si sigue en la foto (caso
            // del click manual en la "×"), se marca como no verificado.
            const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
            const candidato = containers.find(c => c.container === contenedor);
            if (candidato) {
                candidato.verificado = false;
                row.setAttribute('data-containers', JSON.stringify(containers));
            }
            renderizarContenedores(row);

            const valorBultosElement = row.querySelector('[id="valorBultos"]');
            if (valorBultosElement) {
                valorBultosElement.innerText = Math.max(0, parseInt(valorBultosElement.innerText) - 1);
            }
        });
}

// Input único compartido por toda la carga (haya uno o varios pedidos
// agrupados): el operario escanea sin tener que acertar a qué pedido
// pertenece cada contenedor. Se busca el contenedor en el pool combinado de
// TODAS las filas y, si coincide, se marca verificado y se suma el bulto en
// la fila (pedido/albarán) a la que realmente pertenece.
function verificarContenedorGlobal(input) {
    const valor = input.value.trim();
    if (valor === '') {
        return;
    }

    const filas = Array.from(document.querySelectorAll('#tbodypedidospreavisos tr'));

    // Antes de comprobar, refresca qué ha verificado ya OTRO dispositivo en
    // cada pedido del grupo (consulta ligera solo a nuestra propia tabla, no
    // vuelve a llamar a Whales) — así, si dos PDAs están en la misma C/D,
    // cada escaneo se compara contra el estado más reciente en vez de uno
    // desactualizado.
    Promise.all(filas.map(row => {
        const formDataRefresco = new FormData();
        formDataRefresco.append('idplanigrid', row.getAttribute('idplanigrid'));
        formDataRefresco.append('albaran', row.getAttribute('albaran'));

        return fetch(cdmuellesApiBase + 'contenedores-verificados.php', { method: 'POST', body: formDataRefresco })
            .then(response => response.json())
            .then(data => {
                if (data.status !== 'success') {
                    return;
                }
                // Se refresca en los dos sentidos: si otro dispositivo lo
                // verificó, se pone en true; si otro dispositivo lo quitó
                // (quitarContenedor), ya no aparecerá en data.verificados y
                // hay que ponerlo en false, o este dispositivo seguiría
                // mostrándolo como verificado sin estarlo ya.
                const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
                containers.forEach(c => {
                    c.verificado = data.verificados.includes(c.container);
                });
                row.setAttribute('data-containers', JSON.stringify(containers));
                renderizarContenedores(row);

                // El número de "Bultos" de arriba también se queda
                // desactualizado si el bulto lo sumó otro dispositivo; se
                // pone al día con el mismo refresco (un contenedor
                // verificado = un bulto, en este flujo por escaneo).
                const valorBultosElement = row.querySelector('[id="valorBultos"]');
                if (valorBultosElement) {
                    valorBultosElement.innerText = data.verificados.length;
                }
            })
            .catch(() => {
                // Si falla el refresco de esta fila, no bloquea el escaneo:
                // sigue con lo que ya tenía cargado (la comprobación en
                // servidor al sumar el bulto sigue actuando como último
                // seguro).
            });
    })).then(() => {
        confirmarEscaneoContenedorGlobal(input, filas, valor);
    });
}

// Busca en la foto YA CARGADA (en memoria) en qué fila hay un contenedor
// pendiente que coincida. No consulta nada por red.
function buscarFilaConContenedorPendiente(filas, valor) {
    for (const row of filas) {
        const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
        if (containers.some(c => c.codigos.includes(valor) && !c.verificado)) {
            return row;
        }
    }
    return null;
}

// Refresca contra Whales la foto de contenedores de todas las filas dadas
// y, si algún contenedor que estaba verificado en verde ha dejado de existir
// en el pedido (se quitó en Whales después de haberlo escaneado), lo quita
// de verdad — mismo camino que pulsar la "×" — restando su bulto y
// haciéndolo desaparecer, en vez de dejar el contador desactualizado hasta
// Finalizar. La usan tanto cada escaneo que no encuentra coincidencia local
// (antes de darlo por no perteneciente a la carga) como EnviarDatosCD.
function refrescarYReconciliarContenedores(filas) {
    const verificadosAntes = filas.map(row => {
        const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
        return containers.filter(c => c.verificado).map(c => c.container);
    });

    return Promise.all(filas.map(row => cargarContenedoresAlbaran(row))).then(() => {
        const eliminaciones = [];
        filas.forEach((row, i) => {
            const nombresAhora = JSON.parse(row.getAttribute('data-containers') || '[]').map(c => c.container);
            verificadosAntes[i].forEach(contenedor => {
                if (!nombresAhora.includes(contenedor)) {
                    eliminaciones.push(quitarContenedorPorValor(row, contenedor));
                }
            });
        });
        return Promise.all(eliminaciones);
    });
}

function confirmarEscaneoContenedorGlobal(input, filas, valor) {
    input.value = '';

    const filaCandidata = buscarFilaConContenedorPendiente(filas, valor);

    if (!filaCandidata) {
        // No está en la foto actual: puede ser que de verdad no pertenezca a
        // esta carga, o que se haya añadido en Whales DESPUÉS de que se
        // cargara la pantalla (la foto de contenedores se toma una sola vez
        // al entrar). Antes de rechazarlo, se vuelve a preguntar a Whales
        // para todos los pedidos de la C/D y se reintenta una vez con datos
        // frescos — los contenedores ya verificados se mantienen igual,
        // porque cargarContenedoresAlbaran() calcula "verificado" contra
        // planigrid_cdmuelles (BD), no contra lo que hubiera en memoria; y si
        // alguno desapareció del todo de Whales, aquí mismo se resta su
        // bulto (ver refrescarYReconciliarContenedores).
        refrescarYReconciliarContenedores(filas).then(() => {
            const filaTrasRefresco = buscarFilaConContenedorPendiente(filas, valor);

            if (!filaTrasRefresco) {
                input.style.backgroundColor = '#f8d7da';
                setTimeout(() => { input.style.backgroundColor = ''; }, 800);
                alert('Ese contenedor no pertenece a esta carga, o ya estaba verificado.');
                input.focus();
                return;
            }

            registrarContenedorVerificado(filaTrasRefresco, valor);
            input.focus();
        });
        return;
    }

    registrarContenedorVerificado(filaCandidata, valor);
    input.focus();
}

function registrarContenedorVerificado(filaCandidata, valor) {
    const containers = JSON.parse(filaCandidata.getAttribute('data-containers') || '[]');
    const candidato = containers.find(c => c.codigos.includes(valor) && !c.verificado);
    candidato.verificado = true;
    filaCandidata.setAttribute('data-containers', JSON.stringify(containers));
    // Al pintarse en su propia fila (renderizarContenedores/quitarContenedor
    // ya leen idplanigrid/albaran de esa fila), el contenedor aparece bajo
    // el pedido al que realmente pertenece, sin depender de en qué fila
    // estaba el foco cuando se escaneó, y la "×" para quitarlo sigue
    // funcionando igual que antes.
    renderizarContenedores(filaCandidata);

    // Reutiliza el mismo mecanismo que el botón "+" (mismos efectos:
    // discrepancia, avance de estado a mitad de bultos, etc.) sin duplicar
    // esa lógica aquí. Se guarda siempre el código CANÓNICO del bulto
    // (candidato.container), no el alias físico escaneado (valor): así,
    // sea cual sea el contenedor/palet que se escanee de un mismo bulto, en
    // BD (planigrid_cdmuelles.contenedor) y en otros dispositivos siempre
    // se compara contra el mismo valor.
    const botonTemporal = document.createElement('button');
    botonTemporal.setAttribute('data-contenedor', candidato.container);
    filaCandidata.appendChild(botonTemporal);
    incrementarBultos(botonTemporal);
    botonTemporal.remove();
}

function EnviarDatosCD() {
    if (inout !== 'OUT') {
        discrepanciaContenedoresPendiente = false;
        continuarEnviarDatosCD();
        return;
    }

    // Antes de dar la carga por finalizada, una última comprobación contra
    // Whales: puede haber contenedores nuevos sin escanear (añadidos al
    // pedido después de cargar/refrescar la pantalla) o, al revés,
    // contenedores que SÍ se escanearon y ya no existen en Whales (se
    // quitaron del pedido después de validarlos) — la idea es que al
    // finalizar, lo que quede en verde sea exactamente lo que sigue siendo
    // válido según Whales en ese momento.
    document.getElementById('overlay').style.display = 'flex';
    const filas = Array.from(document.querySelectorAll('#tbodypedidospreavisos tr'));

    refrescarYReconciliarContenedores(filas).then(() => {
        const pendientes = [];
        filas.forEach(row => {
            const containers = JSON.parse(row.getAttribute('data-containers') || '[]');
            const faltan = containers.filter(c => !c.verificado).length;
            if (faltan > 0) {
                pendientes.push(row.getAttribute('albaran') + ': ' + faltan + ' contenedor' + (faltan > 1 ? 'es' : '') + ' sin escanear');
            }
        });

        const detalle = document.getElementById('detalleDiscrepanciaContenedores');

        // Igual que la discrepancia de bultos manual (+/-): no se bloquea
        // sin más, se pide autorización del Jefe de turno con su pin (mismo
        // panel AutorizaciónJefeEquipobultos/pinjefebultos que
        // continuarEnviarDatosCD ya sabe tramitar), indicando aquí qué
        // pedido/albarán tiene contenedores pendientes.
        discrepanciaContenedoresPendiente = pendientes.length > 0;
        if (detalle) {
            detalle.textContent = discrepanciaContenedoresPendiente
                ? 'Contenedores sin escanear:\n' + pendientes.join('\n')
                : '';
        }

        continuarEnviarDatosCD();
    });
}

function continuarEnviarDatosCD() {
    colorestbodypedidospreavisos();
    // No depende únicamente de que el atributo "bultos" (total esperado)
    // case con el conteo de contenedores verificados: si EnviarDatosCD ya
    // detectó contenedores sin escanear contra Whales, eso manda igual.
    if (discrepanciaContenedoresPendiente) {
        discrepancia = 1;
    }
    document.getElementById('overlay').style.display = 'flex';
    if (discrepancia === 0) {
        const formData = new FormData();
        formData.append('idplanigrid', idplanigrid);
        formData.append('usuario', usuario);
        formData.append('inout', inout);
        formData.append('almacen', almacen);
        const options = {
            method: 'POST',
            body: formData,
        };
        fetch(cdmuellesApiBase + 'finalizar-carga.php', options)
            .then(response => response.json())
            .then(data => {
                switch (data.status) {
                    case 'success':
                        document.getElementById('AutorizaciónJefeEquipobultos').style.display = "none";
                        document.getElementById('overlay').style.display = 'none';
                        mostrartablaOrdenes();
                        consultaestado(idplanigrid);
                        break;
                    case 'error':
                        alert('Ha habido un error, verifique su conexión a internet y si no, contacte con Jefe de turno');
                        break;
                }
            });
    } else {
        if (pinjefebultos.value !== '') {
            const formData = new FormData();
            formData.append('pin', pinjefebultos.value);
            formData.append('observacion', 'permitirdiscrepancia');
            formData.append('usuario', usuario);
            formData.append('idplanigrid', idplanigrid);

            const options = {
                method: 'POST',
                body: formData,
            };

            fetch(cdmuellesApiBase + 'pin-jefe.php', options)
                .then(response => {
                    if (!response.ok) {
                        document.getElementById('overlay').style.display = 'none';
                        throw new Error(`Error de red: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    switch (data.status) {
                        case 'success':
                            document.getElementById('AutorizaciónJefeEquipobultos').style.display = "none";
                            document.getElementById('overlay').style.display = 'none';
                            pinjefebultos.value = '';
                            consultaestado(idplanigrid);
                            break;

                        case 'NoEncargado':
                            document.getElementById('overlay').style.display = 'none';
                            alert('No es un pin de encargado');
                            break;

                        case 'error':
                            document.getElementById('overlay').style.display = 'none';
                            alert(`Error: ${data.message}`);
                            break;
                    }
                })
                .catch(error => {
                    document.getElementById('overlay').style.display = 'none';
                    console.error('Error en la solicitud:', error);
                    alert('Ha habido un error en la solicitud.');
                });

        } else {
            document.getElementById('AutorizaciónJefeEquipobultos').style.display = "block";
            pinjefebultos = document.getElementById("pinjefebultos")
            const formData = new FormData();
            formData.append('id', idplanigrid);
            formData.append('estado', 5);
            fetch(cdmuellesApiBase + 'cambiar-estado.php', { method: 'POST', body: formData })
                .then(response => response.json())
                .then(data => {
                    switch (data.status) {
                        case 'success':
                            document.getElementById('overlay').style.display = 'none';
                            break;
                        case 'error':
                            break;
                    }
                });
        }
    }
}

function botonobservaciones() {
    DivContenidoDinamico.innerHTML = `
        <div class="col-auto text-center" id="DivCheckCalidad" style="display:block;background:white;margin-top:auto;border:1px; border-style:solid;">
            <p class="mb-0 lead" style="margin:10px;">Observaciones y Manipulados</p>
            <div class="container" style="max-height:60%;overflow:auto;">
                <div>
                    <div id="DivObservaciones" class="thumbnail-container">
                        <!-- Se escriben por script -->
                    </div>
                </div>
                <button type="button" class="btn btn-primary" id="Continuarbutton" onclick="consultaestado(id)" style="margin-top:10px;margin-bottom:10px;">Continuar</button>
            </div>
        </div>
    `;
    Observaciones(idplanigrid);
}

function Observaciones(idplanigridParam) {
    id = idplanigridParam;
    const formData = new FormData();
    formData.append('id', id);
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'observaciones.php', options)
        .then(response => {
            return response.json();
        })
        .then(data => {
            var html = '';
            html += '<strong>Matrícula Tractora: </strong>' + data[0].matriculatractora + '<br>';
            html += '<strong>Matrícula Remolque: </strong>' + data[0].matricularemolque + '<br>';
            html += '<strong>Ruta: </strong>' + data[0].consignación + '<br>';
            html += '<strong>Observación Planificador:<a style="color:red">' + data[0].Observación_Planificador + '</strong></a><br>';

            data.forEach(item => {
                html += '<strong>Pedido/albarán: </strong>' + item.referencia + '<br>';
                html += '<strong>Playa: </strong>' + item.playa + '<br>';
                html += '<strong>Manipulados: </strong>' + item.manipulado + '<br>';
            });

            document.getElementById('DivObservaciones').innerHTML = html;
        })
}
