let entorno;
let pinInput;

document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('page');
    entorno = page.getAttribute('data-entorno');
    pinInput = document.getElementById('pin');
    pinInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            entorno === 'cdmuelles' ? loginpda() : logindesktop();
        }
    });
});

function redirigirSegunEntorno() {
    switch (entorno) {
        case 'Planificador':
            window.location = baseUrl + 'planificador.php';
            break;
        case 'Configuración':
            window.location = baseUrl + 'configuracion.php';
            break;
        case 'cdmuelles':
            window.location = baseUrl + 'cdmuelles/index.php';
            break;
    }
}

function enviarLogin(formData) {
    fetch(baseUrl + 'api/login.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                redirigirSegunEntorno();
            } else {
                alert(data.mensaje || 'No se pudo iniciar sesión');
            }
        })
        .catch(() => alert('Error de conexión al iniciar sesión'));
}

function logindesktop() {
    const formData = new FormData();
    formData.append('entorno', entorno);
    formData.append('pin', pinInput.value);
    formData.append('nombre', document.getElementById('nombre').value);
    enviarLogin(formData);
}

function loginpda() {
    const formData = new FormData();
    formData.append('entorno', entorno);
    formData.append('pin', pinInput.value);
    enviarLogin(formData);
}
