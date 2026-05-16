/* ============================================================
   main.js - LÓGICA CENTRAL Y NAVEGACIÓN
   ============================================================ */

const API_URL = '';

function getToken() { return localStorage.getItem('token'); }
function getAuthHeaders() { return { 'Authorization': `Bearer ${getToken()}` }; }

const userRaw = localStorage.getItem('user');
const token = getToken();
if (!userRaw || !token) { window.location.replace('/login'); }
const usuario = JSON.parse(userRaw);
const rolActual = usuario.rol;
const idUsuario = usuario.id_usuario;

// ============================================================
// RESTRICCIÓN DE ACCESO A MÓDULOS SEGÚN ROL
// ============================================================
function getModulosPermitidos() {
    if (rolActual === 'ADMIN' || rolActual === 'COMANDO' || rolActual === 'BRIAV33') {
        return ['control_flota', 'asignacion_horas', 'reporte_mision', 'aeronaves', 'reporte_diario', 'tablero_control'];
    }
    
    if (idUsuario && idUsuario.match(/COT(BMMA\d+|BAOEA|BANOT)/)) {
        return ['reporte_diario'];
    }
    
    return [];
}

function cerrarSesion() { localStorage.clear(); window.location.replace('/login'); }
function volverMenu() { 
    document.getElementById('areaTrabajo').classList.add('oculto'); 
    document.getElementById('panelMenu').classList.remove('oculto'); 
}

async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(endpoint, { 
            ...options, 
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers } 
        });
        if (res.status === 401 || res.status === 403) { cerrarSesion(); return null; }
        return await res.json();
    } catch (error) { console.error('API Error:', error); return null; }
}

function formatearNumeroColombiano(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return '0';
    let num = parseFloat(valor);
    let entero = Math.floor(num);
    let decimal = Math.round((num - entero) * 10);
    let enteroFormateado = entero.toLocaleString('es-CO');
    return decimal > 0 ? enteroFormateado + ',' + decimal : enteroFormateado;
}

let datosGlobales = { aeronaves: [], unidades: [], misiones: [] };
let aeronaveEditando = null;
let reportesRegistrados = [];
let mostrarFormularioReporte = false;

async function cargarDatos() {
    const [aeronaves, unidades, misiones] = await Promise.all([
        fetchAPI('/aeronaves'), fetchAPI('/unidades'), fetchAPI('/misiones')
    ]);
    datosGlobales = { aeronaves: aeronaves || [], unidades: unidades || [], misiones: misiones || [] };
    console.log('Datos cargados:', datosGlobales.aeronaves.length, 'aeronaves');
}

async function abrirSeccion(tipo) {
    const modulosPermitidos = getModulosPermitidos();
    if (!modulosPermitidos.includes(tipo)) {
        alert('❌ Acceso denegado. No tiene permisos para este módulo.');
        volverMenu();
        return;
    }
    
    document.getElementById('panelMenu').classList.add('oculto');
    document.getElementById('areaTrabajo').classList.remove('oculto');
    document.getElementById('contenido').innerHTML = '<div class="loading"><div class="spinner"></div><h5 class="text-warning">Cargando...</h5></div>';
    await cargarDatos();
    
    if (tipo === 'control_flota') renderControlFlota();
    else if (tipo === 'asignacion_horas') renderAsignacionHoras();
    else if (tipo === 'reporte_mision') renderReporteMision();
    else if (tipo === 'aeronaves') renderAeronaves();
    else if (tipo === 'reporte_diario') renderReporteDiario();
    else if (tipo === 'tablero_control') renderTableroControl();
    else {
        document.getElementById('contenido').innerHTML = `<div class="mensaje-vacio"><span class="icon-box">🚧</span><h5>Módulo en desarrollo</h5></div>`;
    }
}

function renderizarMenu() {
    const modulosPermitidos = getModulosPermitidos();
    const panelMenu = document.getElementById('panelMenu');
    if (!panelMenu) return;
    
    const todosModulos = [
        { seccion: 'control_flota', icono: '🚁', titulo: '1. DISPOSITIVO OPERACIONAL' },
        { seccion: 'asignacion_horas', icono: '⏱️', titulo: '2. ASIGNACIÓN DE HORAS' },
        { seccion: 'reporte_mision', icono: '📝', titulo: '3. REPORTE DE MISIÓN' },
        { seccion: 'aeronaves', icono: '✈️', titulo: '4. GESTIÓN DE AERONAVES' },
        { seccion: 'reporte_diario', icono: '📋', titulo: '5. REPORTE DIARIO (COT)' },
        { seccion: 'tablero_control', icono: '📊', titulo: '6. TABLERO CONTROL' }
    ];
    
    const modulosFiltrados = todosModulos.filter(m => modulosPermitidos.includes(m.seccion));
    
    panelMenu.innerHTML = modulosFiltrados.map(m => `
        <div class="col-md-4"><div class="menu-card" data-seccion="${m.seccion}"><span class="icon-box">${m.icono}</span><h4 class="text-warning">${m.titulo}</h4></div></div>
    `).join('');
    
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const seccion = this.getAttribute('data-seccion');
            if (seccion) abrirSeccion(seccion);
        });
    });
}

// ============================================================
// MOSTRAR BOTÓN RESTABLECER CONTRASEÑAS
// ============================================================
function mostrarBotonReset() {
    const btnReset = document.getElementById('btnResetPassword');
    if (!btnReset) return;
    
    if (rolActual === 'ADMIN' || rolActual === 'COMANDO' || rolActual === 'BRIAV33') {
        btnReset.style.display = 'inline-block';
    } else {
        btnReset.style.display = 'none';
    }
}

// ============================================================
// VALIDACIÓN DE CONTRASEÑA SEGURA
// ============================================================
function validarPasswordSegura(password) {
    if (password.length < 8) {
        return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valido: false, mensaje: 'La contraseña debe contener al menos una letra mayúscula' };
    }
    if (!/[0-9]/.test(password)) {
        return { valido: false, mensaje: 'La contraseña debe contener al menos un número' };
    }
    return { valido: true, mensaje: '' };
}

// ============================================================
// GESTIÓN DE USUARIOS - RESTABLECER CONTRASEÑAS
// ============================================================
async function abrirModalUsuarios() {
    const modal = new bootstrap.Modal(document.getElementById('modalGestionUsuarios'));
    modal.show();
    
    const tablaBody = document.getElementById('tablaUsuarios');
    tablaBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Cargando usuarios...<\/td><\/tr>';
    
    try {
        const token = getToken();
        const response = await fetch('/api/usuarios', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usuariosLista = await response.json();
        
        if (!usuariosLista || usuariosLista.length === 0) {
            tablaBody.innerHTML = '</table><td colspan="3" class="text-center text-muted">No hay usuarios registrados<\/td><\/tr>';
            return;
        }
        
        let usuariosFiltrados = usuariosLista;
        if (rolActual === 'COMANDO') {
            usuariosFiltrados = usuariosLista.filter(u => u.id_usuario !== 'admin');
        } else if (rolActual === 'BRIAV33') {
            usuariosFiltrados = usuariosLista.filter(u => u.id_usuario !== 'admin' && u.id_usuario !== 'COMANDO');
        }
        
        tablaBody.innerHTML = usuariosFiltrados.map(u => `
            <tr>
                <td class="text-warning fw-bold">${u.id_usuario}</td>
                <td>${u.rol_nombre || u.rol || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning" onclick="resetearContrasena('${u.id_usuario}')">
                        <i class="fas fa-key"></i> Restablecer
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        tablaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar usuarios<\/td><\/tr>';
    }
}

async function resetearContrasena(idUsuario) {
    let nuevaPassword = '';
    let valida = false;
    
    while (!valida) {
        nuevaPassword = prompt(`🔐 RESTABLECER CONTRASEÑA - ${idUsuario}\n\nREQUISITOS:\n✓ Mínimo 8 caracteres\n✓ Una letra mayúscula (A-Z)\n✓ Un número (0-9)\n\nEscriba la nueva contraseña:`);
        
        if (nuevaPassword === null) {
            return;
        }
        
        if (nuevaPassword.length < 8) {
            alert('❌ La contraseña debe tener al menos 8 caracteres');
            continue;
        }
        
        if (!/[A-Z]/.test(nuevaPassword)) {
            alert('❌ La contraseña debe contener al menos una letra mayúscula');
            continue;
        }
        
        if (!/[0-9]/.test(nuevaPassword)) {
            alert('❌ La contraseña debe contener al menos un número');
            continue;
        }
        
        valida = true;
    }
    
    try {
        const token = getToken();
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id_usuario: idUsuario, nueva_password: nuevaPassword })
        });
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Contraseña de ${idUsuario} restablecida correctamente.\n\nEl usuario deberá iniciar sesión con la nueva contraseña.`);
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalGestionUsuarios'));
            if (modal) modal.hide();
            volverMenu();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }
}

// ============================================================
// CAMBIAR MI PROPIA CONTRASEÑA
// ============================================================
function abrirModalCambiarPassword() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('cambiarUser').value = user.id_usuario || '';
    document.getElementById('passActual').value = '';
    document.getElementById('passNueva').value = '';
    document.getElementById('passConfirm').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalCambiarPassword'));
    modal.show();
}

async function cambiarPassword() {
    const passActual = document.getElementById('passActual').value;
    const passNueva = document.getElementById('passNueva').value;
    const passConfirm = document.getElementById('passConfirm').value;
    
    if (!passActual || !passNueva || !passConfirm) {
        Swal.fire('Error', 'Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (passNueva !== passConfirm) {
        Swal.fire('Error', 'La nueva contraseña y la confirmación no coinciden', 'error');
        return;
    }
    
    const validacion = validarPasswordSegura(passNueva);
    if (!validacion.valido) {
        Swal.fire('Error', validacion.mensaje, 'error');
        return;
    }
    
    if (passActual === passNueva) {
        Swal.fire('Error', 'La nueva contraseña debe ser diferente a la actual', 'error');
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch('/api/cambiar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ password_actual: passActual, password_nueva: passNueva })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Swal.fire('Éxito', data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalCambiarPassword')).hide();
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

// ============================================================
// INICIALIZAR EVENTOS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('rolUsuario').innerText = `${usuario.id_usuario} - ${usuario.rol}`;
    
    renderizarMenu();
    cargarDatos();
    mostrarBotonReset();
});

// Exponer funciones globales
window.abrirModalUsuarios = abrirModalUsuarios;
window.resetearContrasena = resetearContrasena;
window.abrirModalCambiarPassword = abrirModalCambiarPassword;
window.cambiarPassword = cambiarPassword;