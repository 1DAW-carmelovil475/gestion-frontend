const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Ocultar mensajes previos
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Validar credenciales
    if (username === 'administrador' && password === 'Informatico1*') {
        successMessage.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
        successMessage.style.display = 'block';
        window.location.href = 'gestion_usuarios.html';
        
        // Simular redirección después de 1.5 segundos
        setTimeout(() => {
            // Aquí iría la redirección real al dashboard
            alert('¡Bienvenido al sistema de gestión, administrador!');
            // window.location.href = '/dashboard';
        }, 1500);
    } else {
        errorMessage.textContent = 'Usuario o contraseña incorrectos. Por favor, inténtalo de nuevo.';
        errorMessage.style.display = 'block';
        
        // Limpiar el campo de contraseña
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
});

// Efecto de enfoque automático al cargar
window.addEventListener('load', () => {
    document.getElementById('username').focus();
});