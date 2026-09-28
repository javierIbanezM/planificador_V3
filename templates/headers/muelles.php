<?php
/** @var string $page */
use App\Config\AppConfig;

if (!isset($_SESSION['almacen'])) {
    header('Location: ' . AppConfig::baseUrl() . 'index.php');
    exit;
}

$baseUrl = AppConfig::baseUrl();
?>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<div class="container-fluid">
    <div class="row align-items-center">
        <div class="col-sm text-center"><a class="h1" style="align-item:center;text-align:center;font-size: 4vh"><?php echo htmlspecialchars($page, ENT_QUOTES) ?></a></div>
        <div class="col-sm text-center" style="padding:0px">
            <div class="container col-7" id="ContenedorMuelles" style="padding:0px;min-width:600px;text-align:center;">
            <!-- Se añaden por script -->
            </div>
        </div>
        <div id="contenedorinfomuelles" style="margin-top:auto; text-align:center;">
            <div style="display:inline-block; vertical-align:top;">
                <table>
                    <tr style="text-align:center;">
                        <td><a id="contadormuellesoperarios" style="font-size:300%; color:white;"></a></td>
                        <td><a id="contadormuellesocupados" style="font-size:300%;"></a></td>
                        <td><a id="contadorcdsinmuelle" style="font-size:300%; color:white;"></a></td>
                    </tr>
                    <tr>
                        <td class="tablaplaning" style="border:0px; border-top: ridge; border-top-color:white;">
                            <a style="color:white;  font-size:100%;"><strong>Operarios</strong></a>
                        </td>
                        <td class="tablaplaning" style="border:0px; border-top: ridge; border-top-color:white;">
                            <a style="color:white; font-size:100%;"><strong>Muelles</strong></a>
                        </td>
                        <td class="tablaplaning" style="border:0px; border-top: ridge; border-top-color:white;">
                            <a style="color:white; font-size:100%;"><strong>CD Sin Muelle</strong></a>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
    <a style="margin: -2px 0px;padding: 0px;color:white;display:block; text-align:center;">
        <strong>AZA Logistics</strong> debe rechazar cualquier mercancía a descargar que no está correctamente identificada mediante su documentación (packing list o similar). En horario central, comunicarse con el ROC para su resolución con el cliente.
        <br>Toda <strong>carga/descarga</strong> que venga 30 min después de la hora programada, se comunicará con Almacén para conocer la hora que puede cargar/descargar. Podrá <strong>no cargarse/descargarse</strong>.
        <a style="display:block; text-align:center;padding:0px"><strong><mark style="background-color:red; color:white;">Si la mercancía está a temperatura controlada no se pueden abrir puertas en el exterior</mark></strong></a>

    </a>
    <hr style="height:1px;background-color:white;margin: 1px 0px 10px 0px;">
</div>

<script>


function actualizarColoresTextbox() {
    fetch("<?php echo $baseUrl ?>api/muelles-estado.php")
        .then(response => response.json())
        .then(datos => {
            let container = document.getElementById('ContenedorMuelles');
            container.innerHTML = '';

            for (let i = 0; i < datos.length; i++) {
                let muelle = datos[i].muelle;
                let muellesocupados = datos[i].muelles_ocupados;
                let muelleinhabilitado = datos[i].habilitado;
                let empezado = datos[i].empezado;
                let coloresvisorcd = datos[i].coloresvisorcd;
                let colorestilo;
                let colorfuente;

                if (muelleinhabilitado == 1) {
                    switch (coloresvisorcd) {
                        case '0':
                            colorestilo = '#00C04D';
                            colorfuente = 'white';
                            break;
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
                        default:
                            colorestilo = '#00C04D';
                            colorfuente = 'white';
                            break;
                    }
                } else {
                    colorestilo = 'gray';
                    colorfuente = 'white';
                }

                let input = document.createElement('input');
                input.className = 'form-control';
                input.id = 'Muelle' + muelle;
                input.type = 'text';
                input.value = muelle+empezado;
                input.style.background = colorestilo;
                input.style.color = colorfuente;
                input.style.width = '8.5%';
                input.style.minWidth = '50px';
                input.style.maxWidth = '100px';
                input.style.textAlign = 'center';
                input.style.display = 'inline';
                input.style.marginTop = '0.5%';
                input.style.marginRight = '2px';
                input.style.cursor = 'default';
                input.readOnly = true;
                input.setAttribute('ondblclick', `modal('muelle', '${muelle}');`);

                container.appendChild(input);
            }

            contadormuellesoperarios.innerHTML = '<strong>'+(datos[datos.length-1].total_muelles_empezados-datos[datos.length-1].total_muelles_finalizados)+'</strong>';
            contadormuellesoperarios.setAttribute('ondblclick', `modal('muelles_operario')`)
            contadormuellesocupados.innerHTML = '<strong>'+datos[datos.length-1].total_muelles_ocupados+'</strong>';
            contadormuellesocupados.setAttribute('ondblclick', `modal('muelles_empezados')`);
            contadorcdsinmuelle.innerHTML = '<strong>'+datos[datos.length-1].cdsinmuelle+'</strong>';
            contadorcdsinmuelle.setAttribute('ondblclick', `modal('muelles_cdsinmuelles')`);
            if (datos[datos.length-1].total_muelles_ocupados >= 6) {
                contadormuellesocupados.style.color = 'red';
            } else if (datos[datos.length-1].total_muelles_ocupados == 5) {
                contadormuellesocupados.style.color = 'orange';
            } else if (datos[datos.length-1].total_muelles_ocupados >= 3) {
                contadormuellesocupados.style.color = 'yellow';
            } else if (datos[datos.length-1].total_muelles_ocupados >= 1) {
                contadormuellesocupados.style.color = 'lightyellow';
            } else {
                contadormuellesocupados.style.color = 'white';
            }
        })
        .catch(error => {
            console.error('Error al obtener los datos:', error);
        });
}

let spanTooltip = document.createElement('span');
spanTooltip.innerHTML = `<span style="bottom:5px;vertical-align:bottom;" tabindex="0" data-toggle="tooltip" data-html="true" data-placement="bottom" title="
    <div class='text-white p-3'>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-success me-2'></div>
        <div style='background:#00C04D;width:20px;height:20px;color: white;text-align:center;margin-right:5px;'>V</div>
        Disponible
    </div>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-gray me-2'></div>
        <div style='background:gray;width:20px;height:20px;color: white;text-align:center;margin-right:5px;'>G</div>
        Inhabilitado
    </div>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-white me-2'></div>
        <div style='background:white;width:20px;height:20px;color: black;text-align:center;margin-right:5px;'>B</div>
        Ocupado
    </div>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-yellow me-2'></div>
        <div style='background:yellow;width:20px;height:20px;color: black;text-align:center;margin-right:5px;'>A</div>
        Ocupado > 30Min
    </div>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-orange me-2'></div>
        <div style='background:orange;width:20px;height:20px;color: white;text-align:center;margin-right:5px;'>N</div>
        Ocupado > 60Min
    </div>
    <div class='d-flex align-items-center'>
        <div class='color-indicador bg-red me-2'></div>
        <div style='background:red;width:20px;height:20px;color: white;text-align:center;margin-right:5px;'>R</div>
        Ocupado > 90Min
    </div>
    <hr>
    <strong>N*</strong>: El <strong>*</strong> indica que se ha empezado el proceso de C/D en el muelle.
    <br><br>
    <strong>Operarios</strong>: Operarios involucrados en cargas y descargas en X cantidad de muelles.
    <br><br>
    <strong>Muelles</strong>: Muelles ocupados actualmente.
    <br><br>
    <strong>CD Sin Muelle</strong>: C/D en espera de muelle.
    </div>
    <hr>
    Intervalo de Actualización cada minuto.
">
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" class="bi bi-info-circle" viewBox="0 0 16 16">
<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
<path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
</svg>
</span>`;

contenedorinfomuelles.appendChild(spanTooltip);
$(function () {
$('[data-toggle="tooltip"]').tooltip()
})

actualizarColoresTextbox();
setInterval(actualizarColoresTextbox, 60000);

</script>
