<?php
/** @var string $page */
use App\Config\AppConfig;
$baseUrl = AppConfig::baseUrl();
?>
<div style="display: flex;justify-content: flex-end;">
    <!-- Contenedor para Salidas y Entradas -->
    <div style="display: flex; flex-direction: column; margin-right: 10px;">
        <a href="#" onclick="filtrarPorTipo('OUT')" style='width:60px;height:20px;background: white;color:black;text-align:center;
              border: 1px solid white;
              border-top-left-radius: 5px; border-top-right-radius: 5px;
              border-bottom: none;'>Salidas</a>
        <a href="#" onclick="filtrarPorTipo('IN')"  style='width:60px;height:20px;background: #fcf2ce;color:black;text-align:center;
              border: 1px solid #fcf2ce;
              border-bottom-left-radius: 5px; border-bottom-right-radius: 5px;
              border-top: 1px solid black;'>Entradas</a>
    </div>

    <!-- Contenedor para los demás elementos -->
    <div style="display: flex; align-items: center;">
        <a href="<?php echo $baseUrl ?>assets/excel-actualizable.xlsx" class="btn btn-success" style="margin-right: 10px;">Excel Actualizable</a>
        <a href="<?php echo $baseUrl ?>calendario.php" class="btn btn-info" style="margin-right: 10px;">Vista Calendario</a>
        <a href="<?php echo $baseUrl ?>assets/manual-planificador.pdf" target="_blank">
            <img class="img-thumbnail" src="<?php echo $baseUrl ?>assets/img/manual-de-usuario.png" id="manual-usuario" style="border:3px solid;border-color:black;margin-right: 10px">
        </a>
        <img class="img-thumbnail" onclick="actualizartablas('<?php echo htmlspecialchars($page, ENT_QUOTES) ?>')" src="<?php echo $baseUrl ?>assets/img/botondeactualizar.png" style="border:3px solid;border-color:black;margin-right: 10px;">
        <img class="img-thumbnail" onclick="quitarFiltros('<?php echo htmlspecialchars($page, ENT_QUOTES) ?>')" src="<?php echo $baseUrl ?>assets/img/quitarfiltros.png" id="quitarfiltros" style="border:3px solid;border-color:black;margin-right: 10px">
        <span tabindex="0" data-toggle="tooltip" data-html="true" data-placement="bottom" title="
            <div class='text-white p-3'>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-success me-2'></div>
                    <div style='width:20px;height:20px;background: white;color:black;text-align:center;margin-right:5px'>S</div>
                    Salidas
                </div>
                <div class='d-flex align-items-center' style='margin-bottom:5px'>
                    <div class='color-indicador bg-gray me-2'></div>
                    <div style='width:20px;height:20px;background: #fcf2ce;color:black;text-align:center;margin-right:5px'>E</div>
                    Entradas
                </div>
            </div>" style="align-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="White" class="bi bi-info-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
        </span>
    </div>
</div>
