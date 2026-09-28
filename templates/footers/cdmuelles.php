<?php
/**
 * Migrado de Templates/Footers/footercdmuelles.php. Barra inferior fija
 * con el muelle y la orden seleccionados, usada solo por
 * public/cdmuelles/cargadescarga.php.
 */
?>
<div class="footer mt-auto"
    style="position: sticky;left: 0;bottom: 0;width: 100%;background: rgb(0 1 21 / 0.7);min-height:4vh">
    <div style="padding: 5px 5px; margin-top: 3px; font-size: 16px; display: flex;">
        <table style="width: 100%;">
            <tr>
                <td style="width: 50%; max-width: 50%;text-align:left;"><span id="muelleSeleccionado"
                        style="color: yellow; display: none;">Muelle: </span></td>
                <td style="width: 50%; max-width: 50%;text-align:right;"><span id="OrdenSeleccionada"
                        style="color: red; display: none;">Orden: </span></td>
            </tr>
        </table>
    </div>
</div>
