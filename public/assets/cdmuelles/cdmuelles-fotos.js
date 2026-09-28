// Migrado de cdmuelles/cargadescarga.php: pantallas y lógica de subida de
// fotos (inicial / sonda / precinto / transcurso / final / extra).

// Número de precinto esperado (pg.precinto), usado para verificar el que
// escriba el operario en la pantalla de Fotografía Precinto de una salida.
let precintoEsperado = '';

// En salida (carga), el número de precinto se verifica aquí, junto con su
// foto, en vez de al principio del Quiz de Calidad (donde el precinto físico
// aún no existe porque el remolque no se ha cargado ni sellado todavía).
function mostrarInputPrecinto() {
    const formData = new FormData();
    formData.append('id', idplanigrid);
    formData.append('usuario', usuario);
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'entrar-orden1.php', options)
        .then(response => response.json())
        .then(data => {
            const filaPrecinto = data.find(item => item.tipo === 'precinto');
            precintoEsperado = filaPrecinto ? filaPrecinto.precintocentralita : '';

            if (precintoEsperado === '') {
                return;
            }

            const contenedor = document.createElement('div');
            contenedor.id = 'DivPrecintoNumero';
            contenedor.style.margin = '10px';
            contenedor.innerHTML = `
                <p class="mb-1">Indique el número de precinto</p>
                <input type="text" id="precintoNumero" autocomplete="off">
            `;
            document.getElementById('observacionimgorden').insertAdjacentElement('afterend', contenedor);
        });
}
//
// NOTA DE MIGRACIÓN: el original repetía este mismo bloque HTML cinco veces
// (uno por cada caso del switch en consultaestado, más botonimagenextra),
// solo con diferencias puntuales (bloque de impresoras y el manejador del
// botón "Sí" en la pantalla FINAL). Aquí se factoriza en
// plantillaImagenesOrden() para que sea más mantenible; el HTML resultante
// es el mismo.
function plantillaImagenesOrden(esFinal) {
    const onclickSi = esFinal ? 'salirimgokselecorder()' : 'salirimgok()';
    const bloqueImpresoras = esFinal ? `
        <div class="container" id="divimpresoras" style="display:none">
            <a id="textoescojaimpresora">Debe recoger informe, escoja impresora</a>
            <div class="row" style="justify-content:center;padding:1% 0%">
                <div class="btn-group btn-group-toggle" data-toggle="buttons">

                </div>
            </div>
        </div>` : '';

    return `
        <div class="col-auto text-center" id="DivIMGOrden" style="display:block;background:white;margin-top:auto;padding-bottom:10px">
            <a class="btn btn-primary" style="border-radius: 100%; padding: 1px 9px 1px 9px; position: absolute; left: 10px; top: 5px" href="./CheckCalidadAyuda.pdf">?</a>
            <button class="btn btn-danger" onclick="salirimg()" style="position:absolute;right:10px;top:5px;padding-top:0px;padding-bottom:0px;padding-right:5px;padding-left:5px">X</button>
            <p class="mb-0 lead" style="margin:10px;">Imágenes de la orden C/D</p>
            <h5 id="observacionimgorden" style="color:red; display:none"></h5>
            <form id="imageForm" enctype="multipart/form-data">
                <input type="file" name="image[]" accept="image/*" multiple maxlength="5">
                <input type="submit" value="Subir" id="submitButton" onclick="subidaficheros(event)">
            </form>
            <div style="position: relative; width: 100%;">

            <div id="Divimagenesminiaturas" class="thumbnail-container" style="
                width: 100%;
                overflow-x: auto;
                white-space: nowrap;
                position: relative;
                scrollbar-color: #888 #e0e0e0;
                scrollbar-width: thin;
            ">
                <!-- Imágenes insertadas por JavaScript -->
            </div>

            <div style="
                position: absolute;
                top: 0;
                right: 0;
                width: 50px;
                height: 100%;
                background: linear-gradient(to right, transparent, rgba(255,255,255,0.95));
                pointer-events: none;
                z-index: 10;">
            </div>

            </div>

            <style>
            #Divimagenesminiaturas::-webkit-scrollbar {
                height: 10px;
            }
            #Divimagenesminiaturas::-webkit-scrollbar-track {
                background: #e0e0e0;
            }
            #Divimagenesminiaturas::-webkit-scrollbar-thumb {
                background-color: #888;
                border-radius: 5px;
                border: 2px solid #e0e0e0;
            }
            #Divimagenesminiaturas::-webkit-scrollbar-thumb:hover {
                background-color: #555;
            }
            </style>
            ${bloqueImpresoras}
            <div id="continuarimgok" style="display: none; color: red; text-align: center; margin-top: 10px;">
                <h5 class="mb-2">¿Es correcta la nueva imagen?</h5>
                <button id="btn-si" type="button" class="btn btn-success mx-1" onclick="${onclickSi}" style="width: 80px;">Sí</button>
                <button id="btn-no" type="button" class="btn btn-danger mx-1" onclick="borrarUltimaImagen()" style="width: 80px;">No</button>
            </div>
            <div id="mensajeEliminarUltimaFoto" style="display:none; color: red; text-align: center; margin-top: 10px; font-size: 1.25rem;">
                Se ha eliminado la última foto, suba otra de nuevo.
            </div>
            <br><div id="mensajeEliminadoManual" style="display:none; color: red; text-align: center; margin-top: 10px; font-size: 1.10rem;">
                Usted está borrando manualmente las fotos.
            </div>
        </div>
    `;
}

function mostrarimgorden(tipo) {
    btncheckcalidad.style.display = 'block';
    btnobservaciones.style.display = 'block';
    switch (tipo) {
        case 'INICIAL':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto inicial de la orden';
            observacionimgorden.style.display = 'inline';
            break;

        case 'SONDA':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto sonda de la orden';
            observacionimgorden.style.display = 'inline';
            break;

        case 'DATALOGGER':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto del datalogger';
            observacionimgorden.style.display = 'inline';
            break;

        case 'PRECINTO':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto del precinto';
            observacionimgorden.style.display = 'inline';
            if (inout === 'OUT') {
                mostrarInputPrecinto();
            }
            break;

        case 'TRANSCURSO':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto durante el transcurso de la orden';
            observacionimgorden.style.display = 'inline';
            break;

        case 'FINAL':
            granelPreguntaRespondida = false;
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto final de la orden';
            observacionimgorden.style.display = 'inline';
            if (inout === 'IN') {
                const formData = new FormData();
                const options = {
                    method: 'POST',
                    body: formData,
                };

                fetch(cdmuellesApiBase + 'select-impresoras.php', options)
                    .then(response => response.json())
                    .then(data => {
                        let html = '';
                        if (data.length === 0) {
                            // Sin impresoras activas para este almacén
                            // (select-impresoras.php ya filtra activa=1, así
                            // que esto cubre tanto "no hay ninguna dada de
                            // alta" como "todas están a activa=0"): no se
                            // puede imprimir la etiqueta, pero la carga ya
                            // quedó finalizada al subir la foto final
                            // (avanzarEstadoTrasFoto pone estadocdmuelles=7
                            // ahí mismo), así que basta con recargar para
                            // volver al menú de selección de muelle.
                            document.getElementById('textoescojaimpresora').style.display = 'none';
                            html = '<button type="button" class="btn btn-primary" onclick="inicio()">Continuar</button>';
                        } else {
                            data.forEach(item => {
                                html += '<label class="btn btn-success" onclick="botonimpresora(this)" id="' + item.impresora + '">';
                                html += '<input type="radio" name="options" onclick="botonimpresora(this)" autocomplete="off">' + item.descripcion;
                                html += '</label>';
                            });
                        }
                        let grupobotones = document.querySelector('.btn-group.btn-group-toggle');
                        grupobotones.innerHTML += html;
                    })
                    .catch(error => console.error('Error:', error));
            }
            break;

        case 'EXTRA':
            observacionimgorden = document.getElementById('observacionimgorden');
            observacionimgorden.setAttribute('tipo', tipo);
            observacionimgorden.textContent = 'Suba foto Extra de la orden';
            observacionimgorden.style.display = 'inline';
            break;
    }

    mostrarimagenesorden();
}

function borrarUltimaImagen() {
    const formData = new FormData();
    formData.append('id', idplanigrid);
    formData.append('descripcion', descripcion);
    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'atras-estado.php', options)
        .catch(error => {
            console.error('Error al volver al estado anterior', error);
        });

    const container = document.getElementById('Divimagenesminiaturas');
    const imagenes = container.querySelectorAll('div[style*="inline-block"]');

    if (imagenes.length === 0) {
        alert('No hay imágenes para eliminar.');
        return;
    }

    const ultimaImagen = imagenes[imagenes.length - 1];
    const idfoto = ultimaImagen.dataset.idfoto;

    if (idfoto) {
        eliminarFoto(idfoto);
    } else {
        console.error('No se pudo obtener el ID de la última imagen.');
    }
    document.getElementById('continuarimgok').style.display = 'none';
    document.getElementById('mensajeEliminarUltimaFoto').style.display = 'block';
    document.getElementById('mensajeEliminadoManual').style.display = 'none';
}

function mostrarimagenesorden() {
    const formData = new FormData();
    formData.append('id', idplanigrid);
    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'mostrar-imagenes-orden.php', options)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('Divimagenesminiaturas');
            container.innerHTML = '';

            data.forEach(item => {
                switch (item.status) {
                    case 'SIFOTO':
                        const containerElement = document.createElement('div');
                        containerElement.style.position = 'relative';
                        containerElement.style.display = 'inline-block';
                        containerElement.dataset.idfoto = item.id;

                        const imageElement = document.createElement('img');
                        imageElement.src = item.rutafichero + '?t=' + new Date().getTime();
                        imageElement.style.objectFit = 'cover';
                        imageElement.style.width = '150px';
                        imageElement.style.height = '150px';
                        imageElement.style.marginRight = '25px';
                        imageElement.style.display = 'block';
                        containerElement.appendChild(imageElement);

                        const eyeIcon = document.createElement('img');
                        eyeIcon.src = assetsBase + 'img/ojito_abierto.png';
                        eyeIcon.alt = 'Ampliar imagen';
                        eyeIcon.title = 'Ampliar imagen';
                        eyeIcon.style.position = 'absolute';
                        eyeIcon.style.top = '-3px';
                        eyeIcon.style.left = '2px';
                        eyeIcon.style.width = '30px';
                        eyeIcon.style.height = '30px';
                        eyeIcon.style.opacity = '0.8';
                        eyeIcon.style.pointerEvents = 'none';
                        eyeIcon.style.filter = `
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px black)
                                `;
                        eyeIcon.style.border = 'none';
                        containerElement.appendChild(eyeIcon);

                        const descriptionElement = document.createElement('div');
                        descriptionElement.innerHTML = item.descripcion;
                        descriptionElement.style.textAlign = 'center';
                        containerElement.appendChild(descriptionElement);

                        const deleteIcon = document.createElement('img');
                        deleteIcon.src = assetsBase + 'img/cerrar.png';
                        deleteIcon.alt = 'Borrar imagen';
                        deleteIcon.title = 'Borrar imagen';
                        deleteIcon.style.position = 'absolute';
                        deleteIcon.style.top = '0';
                        deleteIcon.style.right = '25';
                        deleteIcon.style.cursor = 'pointer';
                        deleteIcon.style.zIndex = '10';
                        deleteIcon.style.pointerEvents = 'auto';
                        deleteIcon.style.filter = `
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px black)
                            `;
                        deleteIcon.style.border = 'none';
                        deleteIcon.setAttribute('onclick', `eliminarFoto(${item.id});`);
                        containerElement.appendChild(deleteIcon);

                        container.appendChild(containerElement);

                        imageElement.addEventListener('click', () => {
                            const existingPreview = document.getElementById('imagenPreview');

                            if (existingPreview) {
                                existingPreview.remove();
                            } else {
                                const previewOverlay = document.createElement('div');
                                previewOverlay.id = 'imagenPreview';
                                previewOverlay.style.position = 'fixed';
                                previewOverlay.style.top = '0';
                                previewOverlay.style.left = '0';
                                previewOverlay.style.width = '100vw';
                                previewOverlay.style.height = '100vh';
                                previewOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
                                previewOverlay.style.display = 'flex';
                                previewOverlay.style.alignItems = 'center';
                                previewOverlay.style.justifyContent = 'center';
                                previewOverlay.style.zIndex = '1000';
                                previewOverlay.style.padding = '0';
                                previewOverlay.style.margin = '0';

                                const imgWrapper = document.createElement('div');
                                imgWrapper.style.position = 'relative';
                                imgWrapper.style.display = 'flex';
                                imgWrapper.style.flexDirection = 'column';
                                imgWrapper.style.alignItems = 'center';
                                imgWrapper.style.justifyContent = 'center';

                                const previewImg = document.createElement('img');
                                previewImg.src = item.rutafichero + '?t=' + new Date().getTime();
                                previewImg.style.maxWidth = '95%';
                                previewImg.style.maxHeight = '95%';
                                previewImg.style.boxShadow = '0 0 15px #fff';
                                imgWrapper.appendChild(previewImg);

                                const closeIcon = document.createElement('img');
                                closeIcon.src = assetsBase + 'img/ojito_cerrado.png';
                                closeIcon.alt = 'Cerrar imagen';
                                closeIcon.title = 'Toca para cerrar';
                                closeIcon.style.position = 'absolute';
                                closeIcon.style.top = '5px';
                                closeIcon.style.left = '15px';
                                closeIcon.style.width = '30px';
                                closeIcon.style.height = '30px';
                                closeIcon.style.opacity = '0.9';
                                closeIcon.style.pointerEvents = 'none';
                                closeIcon.style.filter = `
                                brightness(0.4)
                                saturate(5)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px white)
                                drop-shadow(0 0 1px black)
                                `;
                                closeIcon.style.border = 'none';

                                imgWrapper.appendChild(closeIcon);
                                previewOverlay.appendChild(imgWrapper);

                                previewOverlay.addEventListener('click', () => {
                                    previewOverlay.remove();
                                });

                                document.body.appendChild(previewOverlay);
                            }
                        });
                        break;
                    case 'NOFOTO':
                        // Nunca se ejecuta en la práctica: el backend original
                        // solo asignaba este status dentro del bucle de filas,
                        // y sin filas el array de datos llega vacío. Se
                        // conserva por fidelidad con el original.
                        if (typeof observacionimg !== 'undefined') {
                            observacionimg.value = 'Recuerda que debes hacer fotos de Inicio, media y finalización de carga';
                        }
                        break;
                }
            });
        })
        .catch(error => {
            console.error('Error al recuperar imágenes:', error);
        });
}

function subidaficheros() {
    event.preventDefault();

    document.getElementById('overlay').style.display = 'flex';
    const inputArchivo = document.querySelector('input[type="file"]');
    observacionimgorden = document.getElementById('observacionimgorden');
    descripcion = observacionimgorden.getAttribute('tipo');
    const LimiteDeFicherosASubir = 5;

    if (inputArchivo.files.length === 0) {
        document.getElementById('overlay').style.display = 'none';
        alert("Debes anexar un archivo antes de subirlo.");
        return;
    }

    if (inputArchivo.files.length > LimiteDeFicherosASubir) {
        document.getElementById('overlay').style.display = 'none';
        alert('Por favor, selecciona un máximo de ' + LimiteDeFicherosASubir + ' archivos, si necesitas subir más tendrás que repetir el proceso seleccionando los demás ficheros');
        return;
    }

    const form = document.getElementById('imageForm');
    // new FormData(form) ya incluye los ficheros del <input type="file"
    // name="image[]"> automáticamente; no hay que volver a añadirlos (eso
    // duplicaba cada foto subida: dos filas/dos ficheros por cada una).
    const formData = new FormData(form);
    formData.append('id', idplanigrid);
    formData.append('usuario', usuario);
    formData.append('descripcion', descripcion);
    formData.append('inout', inout);

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(cdmuellesApiBase + 'subir-imagen.php', options)
        .then(response => response.json())
        .then(data => {
            data.forEach(result => {
                if (result.status === 'success') {
                    inputArchivo.value = '';
                    document.getElementById('overlay').style.display = 'none';
                    // La ventana de impresoras (solo existe en la foto FINAL
                    // de entrada) no debe aparecer aquí: primero hay que
                    // confirmar que la imagen es correcta y, si es entrada,
                    // responder si es descarga a granel. Solo entonces se
                    // muestra (ver guardarGranelYVolverAImpresoras()).
                    continuarimgok.style.display = 'inline';
                    mostrarimagenesorden();
                    setTimeout(() => {
                        const scrollContainer = document.getElementById('Divimagenesminiaturas');
                        if (scrollContainer) {
                            scrollContainer.scrollLeft = scrollContainer.scrollWidth;
                        }
                    }, 500);
                    document.getElementById('mensajeEliminarUltimaFoto').style.display = 'none';
                    document.getElementById('btn-no').style.display = 'inline';
                    document.getElementById('mensajeEliminadoManual').style.display = 'none';
                } else {
                    alert(result.message);
                }
            });
        });
}

// Se pone a true tras responder la pregunta de granel (guardarGranelYVolverAImpresoras).
// Antes de eso, pulsar una impresora solo confirma la foto ("¿Es correcta?");
// después, pulsar una impresora imprime y cierra la carga directamente.
let granelPreguntaRespondida = false;

function botonimpresora(boton) {
    impresora = boton.getAttribute('id');

    if (granelPreguntaRespondida) {
        imprimirYFinalizar();
        return;
    }

    document.getElementById('continuarimgok').style.display = 'inline';
}

function imprimirYFinalizar() {
    const formData = new FormData();
    formData.append('informe', 'EtiGen');
    formData.append('impresora', impresora);
    formData.append('idplanigrid', idplanigrid);
    const options = {
        method: 'POST',
        body: formData,
    };
    fetch(cdmuellesApiBase + 'imprimir-informes.php', options)
        .then(response => response.json())
        .then(data => {
            // Entrada: tras Final no queda ningún paso más (a diferencia de
            // salida, que puede tener Datalogger/Precinto pendientes), así
            // que se da la carga por finalizada. mostrartablaOrdenes(1) solo
            // refrescaba la tabla del mismo muelle; hay que recargar la
            // página para volver al menú de selección de muelle (inicio()
            // hace location.reload(true), y al cargar de nuevo la página se
            // muestra automáticamente ese menú).
            alert("Carga descarga finalizada Correctamente :)");
            inicio();
        })
        .catch(error => {
            // imprimir-informes.php hace una llamada curl a un servidor
            // externo y ejecuta la impresión de forma síncrona: si tarda
            // demasiado o falla, puede no devolver JSON válido y
            // response.json() rechaza la promesa. Sin este catch, eso
            // dejaba al usuario sin ningún aviso (ni de éxito ni de error).
            console.error('Error al imprimir y finalizar', error);
            alert('No se pudo completar la impresión/finalización. Vuelva a pulsar el botón de la impresora para reintentarlo.');
        });
}

function salirimg() {
    mostrartablaOrdenes(1)
}

function salirimgok() {
    if (observacionimgorden.getAttribute('tipo') === 'PRECINTO' && inout === 'OUT' && precintoEsperado !== '') {
        const precintoInput = document.getElementById('precintoNumero');
        const precintoValue = precintoInput ? precintoInput.value.trim() : '';

        if (precintoValue === '') {
            alert('Por favor, indique el número de precinto.');
            return;
        }

        if (precintoValue !== precintoEsperado.trim()) {
            alert('Precinto incorrecto, vuelva a intentar ó verifique el precinto físico con Jefe de turno');
            return;
        }
    }

    consultaestado(idplanigrid)
}

function salirimgokselecorder() {
    if (inout == 'IN') {
        // Entrada: antes de imprimir la etiqueta y dar la carga por
        // finalizada, se pregunta si la descarga fue a granel. La pantalla
        // de "escoger impresora" (con la que se llegó hasta aquí) vuelve a
        // aparecer después, y es al pulsar la impresora ahí cuando se
        // imprime de verdad y se cierra la carga (ver botonimpresora()).
        //
        // Desactivado temporalmente a petición: no preguntar por ahora, se
        // guarda directamente como "no es granel" (mostrarPreguntaGranel()
        // sigue definida más abajo por si se reactiva).
        guardarGranelYVolverAImpresoras(false, null);
        return;
    }
    // No asumir que la foto final es siempre el último paso: en salida
    // puede quedar Datalogger y/o Precinto pendientes (ver
    // UploadsRepository::avanzarEstadoTrasFoto, caso 'FINAL'). Se consulta
    // el estado real y se deja que el switch de consultaestado() decida
    // qué toca a continuación.
    consultaestado(idplanigrid)
}

function mostrarPreguntaGranel() {
    document.getElementById('continuarimgok').style.display = 'none';
    // La ventana de impresoras ya se muestra al subir la foto final; hay que
    // ocultarla mientras se pregunta por el granel/palets para que no quede
    // visible por debajo, y se vuelve a mostrar en
    // guardarGranelYVolverAImpresoras() al terminar (responda "no" o
    // complete los palets aportados).
    const divimpresoras = document.getElementById('divimpresoras');
    if (divimpresoras) {
        divimpresoras.style.display = 'none';
    }

    const contenedor = document.createElement('div');
    contenedor.id = 'DivPreguntaGranel';
    contenedor.style.margin = '10px';
    contenedor.innerHTML = `
        <p class="mb-1">¿Es descarga a granel?</p>
        <label><input type="radio" name="respuestaGranel" value="si"> Sí</label>
        <label style="margin-left:15px"><input type="radio" name="respuestaGranel" value="no"> No</label>
        <br>
        <button type="button" class="btn btn-primary mt-2" onclick="continuarGranel()">Continuar</button>
    `;
    document.getElementById('observacionimgorden').insertAdjacentElement('afterend', contenedor);
}

function continuarGranel() {
    const seleccionado = document.querySelector('input[name="respuestaGranel"]:checked');

    if (!seleccionado) {
        alert('Seleccione una opción.');
        return;
    }

    document.getElementById('DivPreguntaGranel').remove();

    if (seleccionado.value === 'no') {
        guardarGranelYVolverAImpresoras(false, null);
        return;
    }

    const contenedor = document.createElement('div');
    contenedor.id = 'DivPaletsAportados';
    contenedor.style.margin = '10px';
    contenedor.innerHTML = `
        <p class="mb-1">¿Cuántos palets ha aportado?</p>
        <input type="number" id="inputPaletsAportados" min="0" style="width:80px">
        <button type="button" class="btn btn-primary mx-1" onclick="confirmarPaletsAportados()">Continuar</button>
    `;
    document.getElementById('observacionimgorden').insertAdjacentElement('afterend', contenedor);
}

function confirmarPaletsAportados() {
    const input = document.getElementById('inputPaletsAportados');
    const palets = input.value.trim();

    if (palets === '' || parseInt(palets, 10) < 0) {
        alert('Indique un número de palets válido.');
        return;
    }

    document.getElementById('DivPaletsAportados').remove();
    guardarGranelYVolverAImpresoras(true, palets);
}

function guardarGranelYVolverAImpresoras(esGranel, palets) {
    const formData = new FormData();
    formData.append('idplanigrid', idplanigrid);
    formData.append('granel', esGranel ? '1' : '0');
    if (palets !== null) {
        formData.append('palets', palets);
    }

    fetch(cdmuellesApiBase + 'guardar-granel.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(() => {
            // Ya se respondió a granel: la próxima vez que pulsen una
            // impresora en el menú de abajo, se imprime y se cierra la
            // carga directamente (ver botonimpresora()).
            granelPreguntaRespondida = true;
            document.getElementById('divimpresoras').style.display = 'block';
        });
}

function eliminarFoto(idfoto) {
    const formData = new FormData();
    formData.append('idfoto', idfoto);
    formData.append('usuario', usuario);
    formData.append('idplanigrid', idplanigrid);
    const options = {
        method: 'POST',
        body: formData,
    }
    fetch(cdmuellesApiBase + 'eliminar-foto.php', options)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                mostrarimagenesorden();
            } else {
                console.error('Error:', data.message);
            }
        })
    document.getElementById('btn-no').style.display = 'none';
    document.getElementById('mensajeEliminadoManual').style.display = 'inline';
    document.getElementById('mensajeEliminarUltimaFoto').style.display = 'none';
}

function botonimagenextra() {
    DivContenidoDinamico.innerHTML = plantillaImagenesOrden(false);
    mostrarimgorden('EXTRA');
}
