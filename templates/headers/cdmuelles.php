<?php
/**
 * Cabecera compartida por public/cdmuelles/cargadescarga.php y
 * public/celectronica/index.php (kiosco PDA + tablet de firma ADR).
 * Migrado de Templates/Headers/header-cdmuelles.php. Espera que la vista
 * que lo incluye defina $baseUrl y $titulo antes del include.
 */
?>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Expires" content="0">
<meta http-equiv="Last-Modified" content="0">
<meta http-equiv="Cache-Control" content="no-cache, mustrevalidate">
<meta http-equiv="Pragma" content="no-cache">
<title><?php echo htmlspecialchars($titulo ?? '', ENT_QUOTES) ?></title>
<link rel="stylesheet" href="<?php echo $baseUrl ?>assets/bootstrap-select.min.css">
<link rel="stylesheet" href="<?php echo $baseUrl ?>assets/main.css">
<link rel="stylesheet" href="<?php echo $baseUrl ?>assets/style.css">
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js"></script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="<?php echo $baseUrl ?>assets/bootstrap.min.js"></script>
<script>const baseUrl = <?php echo json_encode($baseUrl) ?>;</script>
<style>
    #overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    #loading-spinner {
        border: 8px solid #f3f3f3;
        border-top: 8px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    /* Controles más grandes para uso táctil en PDA/tablet (solo páginas
       que incluyen esta cabecera: cdmuelles y celectronica). Si el contenido
       crece más que el contenedor, que haga scroll interno en vez de
       desbordarse encima del footer con el muelle/orden seleccionados. */
    #ContenidoDinamico {
        font-size: 1.15rem;
        overflow-y: auto;
    }

    #ContenidoDinamico .form-control,
    #ContenidoDinamico select,
    #ContenidoDinamico input,
    #ContenidoDinamico textarea {
        font-size: 1.1rem;
    }

    #ContenidoDinamico .btn,
    #ContenidoDinamico button {
        font-size: 1.1rem;
    }

    #ContenidoDinamico label {
        font-size: 1.1rem;
    }

    /* El Quiz de Calidad usa una tabla muy ajustada (celdas de 25px/5%) con
       tamaños puestos en el HTML como "smaller" (relativo al padre). Se
       resetea el tamaño base de la tabla al valor original para que ese
       cálculo relativo vuelva a dar el mismo resultado de antes y no
       desborde filas encima de las siguientes. El selector repite
       #ContenidoDinamico para igualar la especificidad de la regla de
       arriba y así ganar por orden de aparición. */
    #tbodycheckcalidad {
        font-size: 14px;
    }

    #ContenidoDinamico #tbodycheckcalidad select,
    #ContenidoDinamico #tbodycheckcalidad input {
        font-size: 14px;
    }
</style>
