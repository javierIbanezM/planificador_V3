// Migrado de celectronica/index.php (script inline original).
document.addEventListener('DOMContentLoaded', function () {
    DivContenidoDinamico = document.getElementById('ContenidoDinamico');
    mostrarmuellesADR();
});

function mostrarmuellesADR() {
    const formData = new FormData();
    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(celectronicaApiBase + 'mostrar-muelles-adr.php', options)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        })
        .then(data => {
            if (data.length > 0) {
                var titulo = '<p style="font-size:160%" class="lead mb-0">Muelles pendientes de Firmar documentación</p>';
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
                    html += '<input class="form-control" onclick="muelleseleccionado(this)" id="' + 'Muelle' + item.muelle + '" type="text" value="' + item.muelle + '" style="font-size:150%;background:' + colorestilo + ' ;color: ' + colorfuente + ';height:7.5%;width:15.5%;min-width:50px;max-width:100px;text-align:center;display:inline;margin-top:0.5%;margin-left:25px;margin-right:25px" readonly>';
                });

                DivContenidoDinamico.innerHTML = titulo;
                DivContenidoDinamico.innerHTML += html;
            } else {
                var titulo = '<p class="lead mb-0">No hay muelles pendiente de firmas.</p>'
                DivContenidoDinamico.innerHTML = titulo;
            }
        })
}

function muelleseleccionado(html) {
    const muelle = html.value;

    const formData = new FormData();
    formData.append('muelle', muelle);

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(celectronicaApiBase + 'mostrar-ordenes.php', options)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        })
        .then(data => {
            if (data.length > 0) {
                var titulo = '<p style="font-size:160%" class="lead mb-0">Seleccionar Orden: </p>';
                DivContenidoDinamico.innerHTML = titulo;
                var html = `<table class="table table-bordered table-striped table-sm">
                                    <th>Ruta</th>
                                    <th>Peligrosidad</th>
                                    <tbody id="btabladatos">`;
                data.forEach(item => {
                    html += '<tr onclick="entrafirma(this)" data-id=' + item.id + '>';
                    html += '<td class="text-center" style="background-color:white;">' + item.consignacion + '</td>';
                    html += '<td class="text-center" style="background-color:white;">' + item.peligrosidad + '</td>';
                    html += '</tr>';
                })
                DivContenidoDinamico.innerHTML += html;
                html = `</tbdoy></table>
                    <div style="text-align: right;">
                        <span>Registros en la tabla: </span><span id="contadorbtabladatos">0</span>
                    </div>`;
                DivContenidoDinamico.innerHTML += html;
                document.getElementById("contadorbtabladatos").innerText = document.getElementById("btabladatos").children.length;
            }
        })
}

function entrafirma(html) {
    const id = html.getAttribute('data-id');

    const formData = new FormData();
    formData.append('id', id);

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(celectronicaApiBase + 'entrar-firma.php', options)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            window.location = './firma.php';
        })
}
