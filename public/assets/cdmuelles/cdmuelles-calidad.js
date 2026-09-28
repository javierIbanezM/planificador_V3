// Migrado de cdmuelles/cargadescarga.php: quiz de calidad, aprobaciones de
// jefe de turno y escaneo de códigos de barras (ZXing) para la sonda.

function botonquiz() {
    DivContenidoDinamico.innerHTML = `
        <div class="col-auto text-center" id="DivCheckCalidad" style="display:block;background:white;margin-top:auto;border:1px; border-style:solid;position:relative;">
            <a class="btn btn-primary" style="border-radius: 100%; padding: 1px 9px 1px 9px; position: absolute; left: 10px; top: 5px" href="./CheckCalidadAyuda.pdf">?</a>
            <button class="btn btn-danger" onclick="consultaestado(id)" style="position:absolute;right:10px;top:5px;padding-top:0px;padding-bottom:0px;padding-right:5px;padding-left:5px">X</button>
            <p class="mb-0 lead" style="margin:10px;font-size:105%">Marque las Casillas según su criterio</p>
                <div style="max-height:70%;overflow:auto">
                    <table class="table table-light table-bordered dataTable">
                        <thead>
                            <tr>
                                <th class="pt-2 pb-2">Preguntas</th>
                                <th class="pt-2 pb-2">Respuestas</th>
                            </tr>
                        </thead>
                        <tbody id="tbodycheckcalidad" class="tabla-body">
                            <!-- Se escribe por Script -->
                        </tbody>
                    </table>
                    <div style="display:none; padding: 20px 0px;background-color:red;" id="AutorizaciónJefeEquipocheckcalidad">
                        <p style="color:white"><strong>Aprobación de Continuar</strong><br>Notificar a Jefe de turno para que revise Quiz calidad</p>
                        <input id="pinjefecheckcalidad" type="password" placeholder="Pin Jefe de turno">
                        <p style="color:white" id="observacionjefedeturno"></p>
                    </div>
                    <button type="button" class="btn btn-primary" id="enviarButton" onclick="verificarCasillas()" style="margin-top:10px;margin-bottom:10px; margin-right:5px">Enviar check</button>
                    <button class="btn btn-success" id="btn-todo-ok" onclick="MarcarChecksOk()" style="display:none;margin-top:10px;margin-bottom:10px; margin-right:5px">Todo Ok</button>
                    <button class="btn btn-warning" id="btn-reset-quiz" onclick="resetcheck()" style="margin-top:10px;margin-bottom:10px; margin-right:5px">reset</button>
                </div>
            <p class="mb-0" id="errorMensaje" style="display: block; color: red;">Es obligatorio marcar todas las casillas.</p>
        </div>
    `;
    QuizCalidad(idplanigrid);
}

function MarcarChecksOk() {
    var selectItems = document.getElementsByClassName("checks-calidad");
    for (var i = 0; i < selectItems.length; i++) {
        selectItems[i].value = "SI";
    }
}

function resetcheck() {
    var selectItems = document.getElementsByClassName("checks-calidad");
    for (var i = 0; i < selectItems.length; i++) {
        selectItems[i].value = "";
    }
    document.getElementById('observacion').innerText = '';
    document.getElementById("btn-todo-ok").style.display = 'none';
}

// Migrado del case 'Escanear Código' embebido en consultaestado(). Es un
// bloque exploratorio: solo muestra en pantalla los códigos detectados
// (#result), no llama a ningún endpoint ni actualiza estado alguno de la
// orden. Se conserva tal cual, solo movido a una función con nombre.
function iniciarEscaneoDesdeConsultaEstado() {
    DivContenidoDinamico.innerHTML = `
        <input type="file" id="fileInput" accept="image/*" />
        <p id="result">Esperando imagen...</p>
    `;

    if (typeof ZXing === 'undefined') {
        const script = document.createElement('script');
        script.src = './resources/zxing_reader.js';
        script.onload = initZXing;
        document.head.appendChild(script);
    } else {
        initZXing();
    }

    function initZXing() {
        ZXing().then(module => {
            window.zxing = module;

            const fileInput = document.getElementById('fileInput');
            const result = document.getElementById('result');

            fileInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;

                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    const ptr = window.zxing._malloc(data.length);
                    window.zxing.HEAPU8.set(data, ptr);

                    try {
                        const results = window.zxing.readBarcodesFromPixmap(ptr, canvas.width, canvas.height, 4, "", 0);
                        const count = results.size();

                        if (count === 0) {
                            result.textContent = "No se detectó ningún código.";
                        } else {
                            let textos = [];
                            for (let i = 0; i < count; i++) {
                                const readResult = results.get(i);
                                textos.push(readResult.text || JSON.stringify(readResult));
                            }
                            result.textContent = "Códigos detectados: " + textos.join(", ");
                        }
                    } catch (err) {
                        result.textContent = "Error al leer código: " + err;
                    }

                    window.zxing._free(ptr);
                };

                const reader = new FileReader();
                reader.onload = e => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

// Lector físico (láser/imager) de la PDA: en modo "teclado" manda el
// código como si se tecleara muy rápido, normalmente rematado con Enter/Tab.
// Primera versión: el input #sonda era "readonly" siempre y se capturaba
// solo el evento "keydown" a mano. Con una pistola USB (PC) funcionaba, pero
// en la PDA Datalogic Memor 11 el campo no se rellenaba nunca — un campo
// "readonly" en Android muchas veces no llega ni a activar el IME/teclado
// virtual, y el lector de esa PDA entrega el código por esa vía (a
// diferencia de la pistola USB, que simula pulsaciones de hardware reales).
// Por eso el campo ya NO es readonly, y en vez de "keydown" se escucha
// "input" (se dispara siempre, venga el texto de donde venga: hardware, IME
// o pegado). Para seguir bloqueando el tecleo manual sin autorización se
// comprueban dos cosas: que el origen no sea un pegado/arrastre
// (event.inputType), y que el ritmo de escritura sea de escáner — no solo
// respecto al carácter anterior (una racha corta de tecleo rápido podría
// colar), sino también de media desde el primer carácter del código actual,
// para que un tecleo humano irregular pero rápido en algún punto tampoco
// cuele.
let sondaBuffer = '';
let sondaUltimoInputTime = 0;
let sondaInicioBufferTime = 0;
const SONDA_ESCANER_MAX_GAP_MS = 30;
// Se pone a true solo tras aprobación de jefe de turno
// (introducirManualSonda): a partir de ahí el operario SÍ puede teclear
// libremente, así que el filtro de abajo se desactiva.
let sondaManualAutorizada = false;

// Foto de precinto (entrada): se sube directamente desde el propio Quiz de
// Calidad, en cuanto se selecciona el fichero, en vez de esperar a un envío
// conjunto — así el operario ve al momento si ha subido bien, y el envío
// del Quiz solo comprueba esta variable en vez de tener que gestionar el
// fichero pendiente.
let precintoFotoSubida = false;

function subirFotoPrecinto(inputFile) {
    if (inputFile.files.length === 0) {
        return;
    }

    const estadoFoto = document.getElementById('estadoFotoPrecinto');
    if (estadoFoto) {
        estadoFoto.textContent = 'Subiendo foto…';
        estadoFoto.style.color = '';
    }

    const formData = new FormData();
    formData.append('image[]', inputFile.files[0]);
    formData.append('id', id);
    formData.append('usuario', usuario);
    // "PRECINTO_QUIZ" y no "PRECINTO": subir-imagen.php llama siempre a
    // avanzarEstadoTrasFoto(descripcion), y el caso 'PRECINTO' de ahí
    // adelanta el estado del pedido — pero aquí seguimos en pleno Quiz de
    // Calidad (estado 1), sin haberlo enviado todavía, así que no debe
    // tocar el estado. Al no coincidir con ningún case, cae en el
    // "default => null" y no cambia nada; el avance real lo hace el envío
    // del Quiz (enviarCheck), como con el resto de campos.
    formData.append('descripcion', 'PRECINTO_QUIZ');
    formData.append('inout', inout);

    fetch(cdmuellesApiBase + 'subir-imagen.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            const exito = Array.isArray(data) && data.some(resultado => resultado.status === 'success');
            precintoFotoSubida = exito;

            if (!estadoFoto) {
                return;
            }

            if (exito) {
                estadoFoto.textContent = '✔ Foto subida';
                estadoFoto.style.color = 'green';
            } else {
                estadoFoto.textContent = 'Error al subir la foto, vuelva a intentarlo';
                estadoFoto.style.color = 'red';
            }
        })
        .catch(() => {
            precintoFotoSubida = false;
            if (estadoFoto) {
                estadoFoto.textContent = 'Error de conexión al subir la foto';
                estadoFoto.style.color = 'red';
            }
        });
}

// Verificación de precinto en entrada (IN): en vez de ser un campo más
// dentro de la tabla del Quiz de Calidad, es una pantalla propia que se
// muestra ANTES de que aparezca el Quiz — sin verificar y fotografiar el
// precinto no se puede romper para abrir el camión, así que no tiene
// sentido dejar ver el resto de preguntas todavía. No toca el estado del
// pedido (sigue en 1, Quiz de Calidad); una vez validado, se muestra el
// Quiz normal, con la fila de precinto ya rellenada y bloqueada.
let precintoQuizVerificado = false;
let precintoQuizNumeroEsperado = '';
let datosQuizPendiente = null;

function mostrarVerificacionPrecintoQuiz(precintocentralita, datosQuiz) {
    precintoFotoSubida = false;
    precintoQuizNumeroEsperado = precintocentralita;
    datosQuizPendiente = datosQuiz;

    const html = `
        <tr>
            <td colspan="2" style="padding:15px;text-align:center">
                <p class="mb-1" style="color:red"><strong>Verifique y fotografíe el precinto antes de continuar</strong><br>Sin romper el precinto no se puede abrir el camión.</p>
                <p class="mb-1">Indique el número de precinto</p>
                <input type="text" id="precintoNumeroQuiz" autocomplete="off" style="width:60%;margin-bottom:8px">
                <br>
                <input type="file" id="fotoPrecintoQuiz" accept="image/*" capture="environment" style="display:block;margin:8px auto;width:80%" onchange="subirFotoPrecinto(this)">
                <span id="estadoFotoPrecinto" style="display:block;font-size:smaller"></span>
                <button type="button" class="btn btn-primary mt-2" onclick="continuarVerificacionPrecintoQuiz()">Continuar</button>
            </td>
        </tr>
    `;

    document.getElementById('tbodycheckcalidad').innerHTML = html;
    document.getElementById('tbodycheckcalidad').setAttribute('data-id', id);
    document.getElementById('btn-todo-ok').style.display = 'none';
    // "Enviar check" y "reset" pertenecen a la pantalla del Quiz, no a
    // esta: si se dejan visibles y se pulsan aquí, intentan actuar sobre
    // campos del Quiz (p.ej. #observacion) que todavía no existen y se
    // bloquean sin avisar. Se ocultan mientras se ve esta pantalla y se
    // vuelven a mostrar en renderizarTablaQuizCalidad().
    document.getElementById('enviarButton').style.display = 'none';
    document.getElementById('btn-reset-quiz').style.display = 'none';
}

function continuarVerificacionPrecintoQuiz() {
    const numeroInput = document.getElementById('precintoNumeroQuiz');
    const numeroValue = numeroInput.value.trim();

    if (numeroValue === '') {
        alert('Por favor, indique el número de precinto.');
        return;
    }

    if (numeroValue !== precintoQuizNumeroEsperado.trim()) {
        alert('Precinto incorrecto, vuelva a intentar ó verifique el precinto físico con Jefe de turno');
        return;
    }

    if (!precintoFotoSubida) {
        alert('Por favor, suba la foto del precinto antes de continuar.');
        return;
    }

    precintoQuizVerificado = true;
    renderizarTablaQuizCalidad(datosQuizPendiente);
}

function escanearSonda() {
    sondaBuffer = '';
    sondaUltimoInputTime = 0;
    sondaInicioBufferTime = 0;

    const input = document.getElementById('sonda');
    input.value = '';
    input.placeholder = 'Escaneando… lea el código';
    input.focus();
}

function manejarEntradaSonda(event) {
    const input = event.target;

    if (sondaManualAutorizada) {
        // Autorizado por jefe de turno: tecleo manual normal, sin filtrar.
        sondaBuffer = input.value;
        return;
    }

    // Pegar o arrastrar texto entrega el código completo en un único evento
    // "input" con varios caracteres de golpe, exactamente igual que un
    // escaneo real visto desde fuera — pero inputType sí distingue el
    // origen, así que esto se descarta siempre, sea cual sea la velocidad.
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') {
        input.value = sondaBuffer;
        return;
    }

    const nuevoValor = input.value;
    const caracteresAnadidos = nuevoValor.length - sondaBuffer.length;
    const ahora = Date.now();

    if (caracteresAnadidos <= 0) {
        // Borrado u otro cambio que no añade texto: nunca es un escaneo.
        input.value = sondaBuffer;
        sondaInicioBufferTime = 0;
        return;
    }

    if (sondaInicioBufferTime === 0) {
        sondaInicioBufferTime = ahora;
    }

    const gap = sondaUltimoInputTime === 0 ? 0 : ahora - sondaUltimoInputTime;
    const ritmoMedio = (ahora - sondaInicioBufferTime) / nuevoValor.length;
    sondaUltimoInputTime = ahora;

    const pareceEscaneo = caracteresAnadidos > 1
        || (gap <= SONDA_ESCANER_MAX_GAP_MS && ritmoMedio <= SONDA_ESCANER_MAX_GAP_MS);

    if (pareceEscaneo) {
        sondaBuffer = nuevoValor;
        return;
    }

    // No parece un escaneo (tecleo demasiado lento, aunque haya alguna
    // pulsación suelta rápida): se descarta el cambio y se reinicia el
    // cronómetro del ritmo, para que el siguiente carácter cuente como el
    // primero de un posible código nuevo.
    input.value = sondaBuffer;
    sondaInicioBufferTime = 0;
}

// Escape manual para cuando el lector físico falla: pide el mismo pin de
// jefe de turno que ya usaba el flujo anterior, y reutiliza
// introducirManualSonda() para desbloquear el campo.
function solicitarAutorizacionSondaManual() {
    document.getElementById('sonda').style.display = 'none';
    document.getElementById('AutorizaciónJefeEquipocheckcalidadSonda').style.display = 'block';
    document.getElementById('pinjefecheckcalidadSonda').focus();
}

function introducirManualSonda() {
    const pinJefe = document.getElementById('pinjefecheckcalidadSonda');
    pinJefeSonda = document.getElementById('pinjefecheckcalidadSonda').value;

    pinJefe.focus();
    if (pinJefeSonda !== '') {
        const formData = new FormData();
        formData.append('pin', pinJefeSonda);
        formData.append('usuario', usuario);
        formData.append('idplanigrid', idplanigrid);

        const options = {
            method: 'POST',
            body: formData,
        };

        fetchPromise = fetch(cdmuellesApiBase + 'pin-jefe-sonda.php', options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error de red: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                switch (data.status) {
                    case 'success':
                        sondaManualAutorizada = true;
                        sondaIngresadaManualmente = true;
                        document.getElementById('AutorizaciónJefeEquipocheckcalidadSonda').style.display = "none";
                        document.getElementById('sonda').style.display = "block";
                        document.getElementById('sonda').value = '';
                        document.getElementById('sonda').placeholder = "Escriba aquí la Sonda";
                        document.getElementById('sonda').setAttribute('autocomplete', 'off');
                        document.getElementById('sonda').focus();
                        break;

                    case 'NoEncargado':
                        alert('No es un pin de encargado');
                        break;

                    case 'error':
                        alert(`Error: ${data.message}`);
                        break;
                }
            })
    } else {
        alert('Rellene Pin de jefe de turno para continuar.');
        document.getElementById('overlay').style.display = 'none';
        return;
    }
}

// El campo campohtml viene de la BD con rutas de imagen relativas al
// proyecto original (../Informes/Images/...), que ya no existen con la
// nueva estructura de public/. Se reescriben a la ruta real de assets/.
function corregirRutaImagenCampohtml(campohtml) {
    return campohtml.replace(/\.\.\/Informes\/Images\//gi, assetsBase + 'informes/');
}

function QuizCalidad(idplanigridParam) {
    id = idplanigridParam;
    sondaBuffer = '';
    sondaUltimoInputTime = 0;
    sondaInicioBufferTime = 0;
    sondaManualAutorizada = false;
    sondaIngresadaManualmente = false;
    precintoFotoSubida = false;
    precintoQuizVerificado = false;
    const formData = new FormData();
    formData.append('id', id);
    formData.append('usuario', usuario);
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'entrar-orden1.php', options)
        .then(response => {
            return response.json();
        })
        .then(data => {
            const filaPrecinto = data.find(item => item.tipo === 'precinto' && item.inout !== 'carga' && item.precintocentralita !== '');

            if (filaPrecinto) {
                mostrarVerificacionPrecintoQuiz(filaPrecinto.precintocentralita, data);
                return;
            }

            renderizarTablaQuizCalidad(data);
        });
}

function renderizarTablaQuizCalidad(data) {
    var html = '';
    var currentSection = '';
    data.forEach(item => {
        switch (item.tipo) {
                    case 'sonda':
                        if (item.sonda !== '') {
                            html += `
                                    <tr question="${item.id}" tipocampo="${item.tipo}">
                                        <td style="padding:7px 0px 7px 2px;font-size:smaller;width:50%;box-sizing:border-box;vertical-align:top">
                                            ${corregirRutaImagenCampohtml(item.campohtml)}
                                            <input type="text" id="sonda" style="display:block;margin-top:5px;width:100%;box-sizing:border-box" placeholder="Pulse Escanear" autocomplete="off" oninput="manejarEntradaSonda(event)" onpaste="return sondaManualAutorizada" ondrop="return sondaManualAutorizada">
                                            <div style="display:none; padding: 20px 0px; background-color:red; text-align: center;" id="AutorizaciónJefeEquipocheckcalidadSonda">
                                                <p style="color:white"><strong>Aprobación de Continuar</strong><br>Notificar a Jefe de turno para que introduzca manualmente la Sonda</p>
                                                <input style="height: 30px;" id="pinjefecheckcalidadSonda" type="password" placeholder="Pin Jefe de turno">
                                                <button id="btn-manualInputSonda" class="btn btn-primary" onclick="introducirManualSonda()">Siguiente</button>
                                                <p style="color:white" id="observacionjefedeturnoSonda"></p>
                                            </div>
                                        </td>
                                        <td style="font-size:14px;text-align:center;box-sizing:border-box;vertical-align:top">
                                            <button id="btn-escanear" class="btn btn-primary" onclick="escanearSonda()">📷 Escanear</button>
                                            <br>
                                            <a href="#" style="font-size:smaller" onclick="event.preventDefault();solicitarAutorizacionSondaManual()">¿No lee el lector? Autorización de jefe de turno</a>
                                        </td>
                                    </tr>
                                `;
                        }
                        break;
                    case 'precinto':
                        // En salida (carga) el precinto se verifica al final,
                        // junto con su foto (ver cdmuelles-fotos.js), no aquí.
                        // En entrada, el número y la foto ya se pidieron y
                        // verificaron en la pantalla previa a este Quiz (ver
                        // mostrarVerificacionPrecintoQuiz) — aquí solo se
                        // muestra ya relleno, sin poder modificarlo.
                        if (item.precintocentralita !== '' && item.inout !== 'carga') {
                            html += '<tr question="' + item.id + '" tipocampo="' + item.tipo + '">';
                            html += '<td style="padding:7px 0px 7px 2px;font-size:smaller;px;width:50%">' + corregirRutaImagenCampohtml(item.campohtml) + '</td>';
                            html += '<td colspan="2" id="precinto" precinto="' + item.precintocentralita + '" style="font-size:14px;width:25px;text-align:center;color:green">✔ ' + item.precintocentralita + '</td>';
                            html += '</tr>';
                        }
                        break;
                    case 'temperatura':
                        if (item.rango !== '') {
                            html += '<tr question="' + item.id + '" tipocampo="' + item.tipo + '">';
                            html += '<td style="padding:7px 0px 7px 2px;font-size:smaller;px;width:50%">La ' + item.inout + ' tiene temperatura, indique la temperatura medida <a style="color:red">(' + item.rango + ')</a></td>';
                            html += '<td colspan="2" style="font-size:14px;width:25px;text-align:center"><input type="number" style="width:60%" id="temperatura" temprango="' + item.rango + '" value="' + item.value + '"></td>'
                            html += '</tr>';
                        }
                        break;
                    case 'quizcalidadobservacion':
                        html += '<tr>';
                        html += '<td colspan="2" style="font-size:14px;width:300px;text-align:center">' + corregirRutaImagenCampohtml(item.campohtml) + '</td></tr>';
                        html += '<tr question="' + item.id + '" tipocampo="' + item.tipo + '"><td colspan="2" id="observacion" style="font-size:14px;width:25px;text-align:center" contenteditable>' + item.value + '</td>';
                        html += '</tr>';
                        break;
                    case 'quizcalidad':
                        html += '<tr question="' + item.id + '" tipocampo="' + item.tipo + '">';
                        html += '<td style="padding:7px 0px 7px 2px;font-size:smaller;px;width:95%">' + corregirRutaImagenCampohtml(item.campohtml) + '</td>';
                        html += '<td style="padding:0px;font-size:small;width:5%;text-align:center">';
                        html += '<select class="checks-calidad">';
                        html += '<option value="SI" ' + (item.value === 'SI' ? 'selected' : '') + '>SI</option>';
                        html += '<option value="NO" ' + (item.value === 'NO' ? 'selected' : '') + '>No</option>';
                        html += '<option value="" ' + (item.value === '' ? 'selected' : '') + '></option>';
                        html += '</select>';
                        html += '</td>';
                        html += '</tr>';
                        break;
                    case 'ADR':
                    case 'LQ':
                        if (item.seccion !== currentSection) {
                            currentSection = item.seccion;
                            html += '<tr><td colspan="2" style="text-align:center;background-color:orange;font-weight: bold;">ADR/LQ ' + currentSection + '</td></tr>';
                        }
                        html += '<tr question="' + item.id + '" tipocampo="' + item.tipo + '">';
                        html += '<td style="padding:7px 0px 7px 2px;font-size:smaller;px;width:95%">' + corregirRutaImagenCampohtml(item.campohtml) + '</td>';
                        html += '<td style="padding:0px;font-size:small;width:5%;text-align:center">';
                        html += '<select class="checks-calidad">';
                        html += '<option value="SI" ' + (item.value === 'SI' ? 'selected' : '') + '>SI</option>';
                        html += '<option value="NO" ' + (item.value === 'NO' ? 'selected' : '') + '>No</option>';
                        html += '<option value="" ' + (item.value === '' ? 'selected' : '') + '></option>';
                        html += '</select>';
                        html += '</td>';
                        html += '</tr>';

                }
            });
    document.getElementById("tbodycheckcalidad").innerHTML = html;
    document.getElementById("tbodycheckcalidad").setAttribute('data-id', id);
    document.getElementById("btn-todo-ok").style.display = 'none';
    document.getElementById('enviarButton').style.display = 'inline-block';
    document.getElementById('btn-reset-quiz').style.display = 'inline-block';
}

function verificarCasillas() {
    document.getElementById('overlay').style.display = 'flex';
    const selects = document.querySelectorAll('.checks-calidad');
    let observacionRequired = false;
    let opcionespormarcar = false;
    let pinjeferequired = false;
    let aprobado = true;
    let fetchPromise = Promise.resolve();
    let valueobservacionjefedeturno = '';
    let observacionjefedeturno = document.getElementById('observacionjefedeturno');
    let cno = 0;
    let causasAprobadas = [];

    selects.forEach(select => {
        const selectedValue = select.value;
        if (selectedValue === 'NO') {
            cno = cno + 1;
            valueobservacionjefedeturno = cno + ' Respuestas Negativas por aprobar';
            observacionjefedeturno.innerHTML = valueobservacionjefedeturno;
            observacionRequired = true;
            document.getElementById('AutorizaciónJefeEquipocheckcalidad').style.display = 'block';
            pinjeferequired = true;
            document.getElementById('overlay').style.display = 'none';
            return;
        }
        if (selectedValue === '') {
            opcionespormarcar = true;
        }
    });

    if (cno > 0) {
        causasAprobadas.push('respuesta NO');
    }

    if (opcionespormarcar) {
        alert('Faltan opciones por marcar');
        document.getElementById('overlay').style.display = 'none';
        return;
    }

    const observacionInput = document.getElementById('observacion');
    const observacionValue = observacionInput.innerText.trim();

    if (observacionRequired && observacionValue === '') {
        alert('Por favor, rellene el campo de observación debido a una respuesta "NO". Una vez notifique la observación deberá ser aprobada por jefe de turno.');
        document.getElementById('overlay').style.display = 'none';
        return;
    }

    // El número y la foto de precinto ya se verificaron en la pantalla
    // previa (mostrarVerificacionPrecintoQuiz), antes incluso de que este
    // Quiz se mostrara — este id="precinto" solo aparece en la tabla si
    // había uno pendiente, así que si existe, precintoQuizVerificado debe
    // ser true; esto es solo una red de seguridad por si acaso.
    const precintoInput = document.getElementById('precinto');

    if (precintoInput && !precintoQuizVerificado) {
        alert('Por favor, verifique el precinto antes de continuar.');
        document.getElementById('overlay').style.display = 'none';
        return;
    }

    const sondaInput = document.getElementById('sonda');

    if (sondaInput) {
        const sondaValue = sondaInput.value.trim();

        if (sondaValue === '') {
            alert('Por favor, rellene el campo de sonda.');
            document.getElementById('overlay').style.display = 'none';
            return;
        }

        if (sondaIngresadaManualmente) {
            const formData = new FormData();
            formData.append('numSonda', sondaValue);
            formData.append('pin', pinJefeSonda);
            formData.append('usuario', usuario);
            formData.append('idplanigrid', idplanigrid);

            fetch(cdmuellesApiBase + 'logs-sonda-manual.php', {
                method: 'POST',
                body: formData
            });
        }
    }

    const temperaturaInput = document.getElementById('temperatura');

    if (temperaturaInput) {
        const temperaturaValue = temperaturaInput.value.trim();
        if (temperaturaValue === '') {
            alert('Por favor, rellene el campo de temperatura.');
            document.getElementById('overlay').style.display = 'none';
            return;
        } else {
            const temprango = temperaturaInput.getAttribute('temprango');
            const limites = temprango.match(/\d+/g);
            const limiteInferior = parseInt(limites[0]);
            const limiteSuperior = parseInt(limites[1]);
            if (temperaturaValue >= limiteInferior && temperaturaValue <= limiteSuperior) {
                // dentro de rango
            } else {
                valueobservacionjefedeturno += '<br>La temperatura está fuera del rango';
                observacionjefedeturno.innerHTML = valueobservacionjefedeturno;
                document.getElementById('AutorizaciónJefeEquipocheckcalidad').style.display = 'block';
                pinjeferequired = true;

                document.getElementById('overlay').style.display = 'none';
            }
        }
    }

    const pinjefecheckcalidadInput = document.getElementById('pinjefecheckcalidad');
    const pinjefecheckcalidadValue = pinjefecheckcalidadInput.value.trim();

    if (pinjeferequired) {
        if (pinjefecheckcalidadValue !== '') {
            const formData = new FormData();
            formData.append('pin', pinjefecheckcalidadInput.value);
            formData.append('observacion', 'continuarquiznoaprobado');
            formData.append('causas', causasAprobadas.join(', '));
            const sondaInput2 = document.getElementById('sonda');
            const numeroSondaManual = sondaInput2 ? sondaInput2.value.trim() : '';

            if (numeroSondaManual !== '') {
                formData.append('numSonda', numeroSondaManual);
            }
            formData.append('usuario', usuario);
            formData.append('idplanigrid', idplanigrid);

            const options = {
                method: 'POST',
                body: formData,
            };

            fetchPromise = fetch(cdmuellesApiBase + 'pin-jefe.php', options)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error de red: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    switch (data.status) {
                        case 'success':
                            document.getElementById('AutorizaciónJefeEquipocheckcalidad').style.display = "none";
                            pinjefecheckcalidadInput.value = '';
                            aprobado = true;
                            break;

                        case 'NoEncargado':
                            alert('No es un pin de encargado');
                            aprobado = false;
                            break;

                        case 'error':
                            alert(`Error: ${data.message}`);
                            break;
                    }
                })
        } else {
            alert('Rellene Pin de jefe de turno para continuar.');
            document.getElementById('overlay').style.display = 'none';
            return;
        }
    }

    fetchPromise.then(() => {
        if (aprobado == false) {
            document.getElementById('overlay').style.display = 'none';
            return;
        }

        document.getElementById('overlay').style.display = 'flex';
        var tabla = document.getElementById("tbodycheckcalidad");
        var filas = tabla.getElementsByTagName("tr");
        var preguntasYRespuestas = [];
        var observacion = "";

        for (var i = 0; i < filas.length; i++) {
            var fila = filas[i];
            var tipoCampo = fila.getAttribute("tipocampo");

            switch (tipoCampo) {
                case 'quizcalidadobservacion':
                    var preguntaId = fila.getAttribute("question");
                    observacion = fila.querySelector("#observacion").textContent.trim();
                    if (observacion === '') {
                        observacion = null;
                    }
                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: observacion
                    });
                    break;
                case 'quizcalidad':
                    var preguntaId = fila.getAttribute("question");
                    var respuesta = fila.querySelector("select").value;

                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: respuesta
                    });
                    break;
                case 'precinto':
                    var preguntaId = fila.getAttribute("question");
                    // El texto visible lleva el check "✔ " delante; el valor
                    // real (ya verificado) está en el atributo precinto=.
                    var precinto = fila.querySelector("#precinto").getAttribute('precinto').trim();
                    if (precinto === '') {
                        precinto = null;
                    }
                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: precinto
                    });
                    break;
                case 'sonda':
                    var preguntaId = fila.getAttribute("question");
                    var sonda = fila.querySelector("#sonda").value.trim();
                    if (sonda === '') {
                        sonda = null;
                    }
                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: sonda
                    });
                    break;
                case 'temperatura':
                    var preguntaId = fila.getAttribute("question");
                    var temperatura = fila.querySelector("#temperatura").value.trim();
                    if (temperatura === '') {
                        temperatura = null;
                    }
                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: temperatura
                    });
                    break;
                case 'ADR':
                case 'LQ':
                    var preguntaId = fila.getAttribute("question");
                    var respuesta = fila.querySelector("select").value;
                    preguntasYRespuestas.push({
                        pregunta: preguntaId,
                        respuesta: respuesta
                    });
                    break;

            }
        }
        const formData = new FormData();
        formData.append('id', id);
        formData.append('usuario', usuario);
        formData.append('preguntasYRespuestas', JSON.stringify(preguntasYRespuestas));
        const options = {
            method: 'POST',
            body: formData,
        };
        fetch(cdmuellesApiBase + 'enviar-check.php', options)
            .then(response => {
                return response.json();
            })
            .then(data => {
                switch (data.status) {
                    case 'Insertado':
                        document.getElementById('overlay').style.display = 'none';
                        botonobservaciones();
                        break;
                    default:
                        document.getElementById('overlay').style.display = 'none';
                        botonobservaciones();
                        break;
                }
            });
    });
}
