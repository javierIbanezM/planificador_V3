// Migrado de cdmuelles/index.php (script inline original).
document.addEventListener('DOMContentLoaded', function () {
    const almacenesDiv = document.getElementById('Almacenes');
    cargarAlmacenes(almacenesDiv);
});

function cargarAlmacenes(almacenesDiv) {
    const formData = new FormData();
    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(baseUrl + 'api/cdmuelles/cargar-almacenes.php', options)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                data.almacenes.forEach(almacen => {
                    const button = document.createElement('button');
                    button.classList.add('btn', 'btn-success');
                    button.textContent = almacen;
                    button.style.margin = '5px 0px';
                    button.addEventListener('click', function () {
                        window.location = './cargadescarga.php?almacen=' + encodeURIComponent(almacen);
                    });

                    almacenesDiv.appendChild(button);
                    almacenesDiv.appendChild(document.createElement('br'));
                });
            }
        });
}
