// ==================== SISTEMA DE FOTOS ====================
function mostrarMensaje(msg, tipo) {
    if (tipo === 'error') alert('⚠️ ' + msg);
    else alert(msg);
}

let fotosEntregaArray = []; // Array de { base64, url, public_id }
const MAX_FOTOS_ENTREGA = 3;
let streamCamaraEntrega = null;

function comprimirImagen(file, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function agregarFotoEntrega(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';

    if (!file.type.startsWith('image/')) {
        mostrarMensaje('Selecciona una imagen válida', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        mostrarMensaje('La imagen es muy grande (máx. 10MB)', 'error');
        return;
    }
    if (fotosEntregaArray.length >= MAX_FOTOS_ENTREGA) {
        mostrarMensaje(`Máximo ${MAX_FOTOS_ENTREGA} fotos permitidas`, 'error');
        return;
    }

    try {
        const base64 = await comprimirImagen(file, 1200, 0.7);
        fotosEntregaArray.push({ base64, url: null, public_id: null });
        renderFotosEntregaPreview();
        actualizarContadorFotosEntrega();
    } catch (error) {
        console.error('Error al procesar imagen:', error);
        mostrarMensaje('Error al procesar la imagen', 'error');
    }
}

async function abrirCamaraEntrega() {
    if (fotosEntregaArray.length >= MAX_FOTOS_ENTREGA) {
        mostrarMensaje(`Máximo ${MAX_FOTOS_ENTREGA} fotos permitidas`, 'error');
        return;
    }

    const modal = document.getElementById('modalCamaraEntrega');
    const video = document.getElementById('videoCamaraEntrega');

    try {
        streamCamaraEntrega = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = streamCamaraEntrega;
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarMensaje('No se pudo acceder a la cámara', 'error');
    }
}

function cerrarCamaraEntrega() {
    const modal = document.getElementById('modalCamaraEntrega');
    const video = document.getElementById('videoCamaraEntrega');

    if (streamCamaraEntrega) {
        streamCamaraEntrega.getTracks().forEach(track => track.stop());
        streamCamaraEntrega = null;
    }
    video.srcObject = null;
    modal.style.display = 'none';
}

async function capturarFotoEntrega() {
    const video = document.getElementById('videoCamaraEntrega');
    const canvas = document.getElementById('canvasCamaraEntrega');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    fotosEntregaArray.push({ base64, url: null, public_id: null });
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
    cerrarCamaraEntrega();
}

function actualizarContadorFotosEntrega() {
    const numeroFotos = document.getElementById('numeroFotosEntrega');
    if (numeroFotos) {
        numeroFotos.textContent = fotosEntregaArray.length;
    }
}

function renderFotosEntregaPreview() {
    const container = document.getElementById('fotosEntregaContainer');
    container.innerHTML = '';

    fotosEntregaArray.forEach((foto, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'position: relative; width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid #ddd;';
        div.innerHTML = `
            <img src="${foto.base64}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="abrirImagenCompleta('${foto.base64.replace(/'/g, "\\'")}')">
            <button type="button" onclick="eliminarFotoEntrega(${i})" style="position: absolute; top: 4px; right: 4px; background: #d32f2f; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <i class="fas fa-times"></i>
            </button>
            ${foto.url ? '<i class="fas fa-cloud" style="position: absolute; bottom: 4px; right: 4px; color: #4CAF50; font-size: 12px; background: white; padding: 4px; border-radius: 50%;"></i>' : ''}
        `;
        container.appendChild(div);
    });
}

function eliminarFotoEntrega(index) {
    fotosEntregaArray.splice(index, 1);
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
}

function limpiarFotosEntrega() {
    fotosEntregaArray = [];
    renderFotosEntregaPreview();
    actualizarContadorFotosEntrega();
}

async function subirFotosACloudinary() {
    const fotasSinSubir = fotosEntregaArray.filter(f => !f.url);
    if (fotasSinSubir.length === 0) return fotosEntregaArray.map(f => ({ url: f.url, public_id: f.public_id }));

    const resultados = [];
    for (let i = 0; i < fotosEntregaArray.length; i++) {
        const foto = fotosEntregaArray[i];
        if (foto.url) {
            resultados.push({ url: foto.url, public_id: foto.public_id });
            continue;
        }
        try {
            const res = await fetch(`${API_URL}/upload-imagen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imagen: foto.base64, carpeta: 'entregas' })
            });
            if (!res.ok) throw new Error('Error al subir imagen');
            const data = await res.json();
            foto.url = data.url;
            foto.public_id = data.public_id;
            resultados.push({ url: data.url, public_id: data.public_id });
        } catch (error) {
            console.error(`Error subiendo foto ${i + 1}:`, error);
            throw new Error(`Error al subir foto ${i + 1}`);
        }
    }
    return resultados;
}

function abrirImagenCompleta(src) {
    document.getElementById('imagenCompletaSrc').src = src;
    document.getElementById('modalImagenCompleta').classList.add('show');
}

function cerrarImagenCompleta() {
    document.getElementById('modalImagenCompleta').classList.remove('show');
    document.getElementById('imagenCompletaSrc').src = '';
}

// ==================== AUTENTICACIÓN ====================
function verificarSesion() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function cerrarSesion() {
    // Crear modal de confirmación
    const modalHTML = `
        <div id="modalCerrarSesion" class="modal" style="display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="max-width: 420px; text-align: center; padding: 45px 35px;">
                <!-- Logo SVG -->
                <div style="margin-bottom: 30px;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 165 38" width="160" height="80">
                        <!-- Icono de computadora con estetoscopio -->
                        <g transform="translate(20, 15)">
                            <!-- Monitor/Pantalla -->
                            <rect x="5" y="5" width="35" height="25" rx="2" fill="#2192B8" stroke="#2192B8" stroke-width="2"/>
                            <rect x="7" y="7" width="31" height="21" fill="#E3F2FD"/>
                            
                            <!-- Base del monitor -->
                            <rect x="18" y="30" width="9" height="4" fill="#2192B8"/>
                            <rect x="12" y="34" width="21" height="2" rx="1" fill="#2192B8"/>
                            
                            <!-- Cruz médica en la pantalla -->
                            <g transform="translate(22.5, 17.5)">
                                <rect x="-1.5" y="-4" width="3" height="8" fill="#2192B8"/>
                                <rect x="-4" y="-1.5" width="8" height="3" fill="#2192B8"/>
                            </g>
                            
                            <!-- Estetoscopio -->
                            <path d="M 35 12 Q 42 12 42 18" stroke="#2192B8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                            <circle cx="42" cy="21" r="3" fill="#2192B8"/>
                            <path d="M 42 24 L 42 28" stroke="#2192B8" stroke-width="2" stroke-linecap="round"/>
                        </g>
                        
                        <!-- Texto "Doctor PC" -->
                        <text x="70" y="35" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#2192B8">
                            Doctor PC
                        </text>
                        
                        <!-- Subtítulo "Sistema Admin" -->
                        <text x="70" y="52" font-family="Arial, sans-serif" font-size="11" fill="#2192B8">
                            Sistema Admin
                        </text>
                        
                        <!-- Línea decorativa -->
                        <line x1="70" y1="57" x2="180" y2="57" stroke="#2192B8" stroke-width="1" opacity="0.5"/>
                    </svg>
                </div>
                
                <!-- Mensaje -->
                <h2 style="color: #2c3e50; margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">¿Cerrar Sesión?</h2>
                <p style="color: #7f8c8d; margin: 0 0 35px 0; font-size: 15px; line-height: 1.6;">
                    ¿Estás seguro que deseas salir del sistema?
                </p>
                
                <!-- Botones -->
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="document.getElementById('modalCerrarSesion').remove()" 
                            class="btn-secondary" 
                            style="flex: 1; max-width: 160px; padding: 14px 24px; font-size: 15px; border-radius: 8px; background: #ecf0f1; color: #2c3e50; font-weight: 600;">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button onclick="confirmarCerrarSesion()" 
                            class="btn-danger" 
                            style="flex: 1; max-width: 160px; padding: 14px 24px; font-size: 15px; border-radius: 8px; background: #e74c3c; color: white; font-weight: 600;">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Función global para confirmar
    window.confirmarCerrarSesion = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    };
}

function getToken() {
    return localStorage.getItem('token');
}

function getUsuarioActual() {
    try {
        return JSON.parse(localStorage.getItem('usuario'));
    } catch {
        return null;
    }
}

// Verificar sesión al cargar
if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
    verificarSesion();
}

// ==================== CONFIG ====================
// Detectar si estamos en local o en Netlify
const isLocal = window.location.hostname === 'localhost';
const API_BASE = isLocal ? 'http://localhost:3000' : window.location.origin;

// Usar /api/* en ambos casos - en Netlify los redirects de netlify.toml redirigen a las funciones
const API_CLIENTES = `${API_BASE}/api/clientes`;
const API_EQUIPOS = `${API_BASE}/api/equipos`;
const API_SERVICIOS = `${API_BASE}/api/servicios`;
const API_SERVICIO_EQUIPO = `${API_BASE}/api/servicio-equipo`;
const API_DECOLECTA = `${API_BASE}/api/decolecta`;
const API_URL = `${API_BASE}/api`;

// ✅ Interceptar fetch para validar URLs y agregar token de autenticación
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    if (typeof url === 'string') {
        const urlStr = url.toLowerCase();
        if (urlStr.includes('%ef%bf%bd') || urlStr.includes('undefined') || urlStr.includes('null')) {
            console.error('❌ URL INVÁLIDA - Fetch bloqueado:', url);
            return Promise.reject(new Error('URL inválida: ' + url));
        }
    }
    const token = localStorage.getItem('token');
    if (token && !url.includes('/api/auth/login')) {
        options.headers = options.headers || {};
        if (typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
    }
    return originalFetch.call(this, url, options).then(response => {
        if (response.status === 401 || response.status === 403) {
            if (!url.includes('/api/auth/')) {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = 'index.html';
            }
        }
        return response;
    });
};

let reniecData = null;

// ==================== INTEGRACIÓN CON REPORTE.JS ====================
// La instancia global reporteServicio se crea en reporte.js
// No es necesario inicializarla aquí

// ==================== UTILIDADES ====================

// ✅ Validar ID antes de hacer requests
function validarID(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('❌ ID inválido:', id);
        return null;
    }
    return id.trim();
}

// ✅ Hacer request con manejo de errores
async function hacerRequest(url, options = {}) {
    try {
        console.log(`🔗 Request: ${url}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
            console.error(`❌ Error HTTP ${response.status}: ${url}`);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ Error en request: ${error.message}`);
        return null;
    }
}

// Función para obtener icono según tipo de equipo
function getIconoEquipo(tipo) {
    const iconos = {
        'Laptop': 'fas fa-laptop',
        'Desktop': 'fas fa-desktop',
        'Monitor': 'fas fa-tv',
        'Impresora': 'fas fa-print',
        'Otro': 'fas fa-cube'
    };
    return iconos[tipo] || 'fas fa-cube';
}

// Actualizar icono en modal nuevo equipo
function actualizarIconoNuevo() {
    const tipo = document.getElementById('tipoEquipoNuevoForm').value;
    const icono = document.getElementById('iconoNuevoEquipo');
    icono.className = getIconoEquipo(tipo);
}

// Actualizar icono en modal editar equipo
function actualizarIconoEditar() {
    const tipo = document.getElementById('editTipoEquipo').value;
    const icono = document.getElementById('iconoEditarEquipo');
    icono.className = getIconoEquipo(tipo);
}

// Función para alternar menú móvil
function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');

    // Cerrar menú al hacer clic en un botón de tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    });
}

// Mostrar/ocultar botón de menú según el tamaño de pantalla
function updateMenuToggleVisibility() {
    const menuToggle = document.getElementById('menuToggle');
    if (window.innerWidth <= 768) {
        menuToggle.style.display = 'inline-flex';
    } else {
        menuToggle.style.display = 'none';
        document.querySelector('.sidebar').classList.remove('open');
    }
}

// Evento de redimensión de ventana
window.addEventListener('resize', updateMenuToggleVisibility);

// Llamar función al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    updateMenuToggleVisibility();
    inicializarUI();

    // Cerrar menú cuando se hace clic fuera de él
    document.addEventListener('click', function (event) {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menuToggle');
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    });
});

function mostrarExito(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 3000);
}

function switchTab(tab) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    // Mostrar tab seleccionado
    document.getElementById(tab + 'Tab').classList.add('active');
    event.target.classList.add('active');

    // ✅ NOTA: La carga de datos ahora se maneja en main.js mediante handleSwitchTab
    // Las funciones de clientes están en public/js/modules/clientes.js
}

// ==================== CLIENTES ====================

// ==================== CLIENTES ====================
// ✅ MIGRADO A: public/js/modules/clientes.js
// Todas las funciones de clientes ahora están en el módulo modular

// ==================== SERVICIOS ====================
// ✅ MIGRADO A: Módulos ES6
// 
// Las funciones de servicios están distribuidas en:
// - public/js/modules/servicios.js (CRUD, paginación, fotos)
// - public/js/modules/estado.js (cambios de estado, entrega)
// - public/js/modules/diagnostico.js (diagnósticos)
// - public/js/modules/cancelacion.js (cancelaciones)
// - public/js/helpers.js (funciones auxiliares)
//
// Todas las funciones están expuestas globalmente desde main.js
//
// Funciones auxiliares que aún están aquí (pendientes de migrar):
// - consultarReniecServicio()
// - agregarClienteDesdeReniecServicio()
// - seleccionarEquipoServicio()
// - cancelarNuevoEquipoDesdeServicio()
// - cargarEquiposDelCliente()
// - abrirModalEquiposDelCliente()
// - mostrarModalEquiposCliente()
// - abrirFormularioNuevoEquipo()
// - guardarNuevoEquipoYSeleccionar()
// - seleccionarEquipo()
// - validarEquipo()
//
// TODO: Migrar estas funciones auxiliares a helpers.js


// ==================== EQUIPOS ====================

// Abrir modal nuevo equipo
function abrirModalNuevoEquipo() {
    document.getElementById('modalNuevoEquipo').classList.add('show');
    document.getElementById('formEquipo').reset();
}

// Cerrar modal nuevo equipo
function cerrarModalNuevoEquipo() {
    document.getElementById('modalNuevoEquipo').classList.remove('show');
    document.getElementById('formEquipo').reset();
}

// Abrir modal seleccionar equipo
async function abrirModalSeleccionarEquipo() {
    // Mostrar modal
    document.getElementById('modalSeleccionarEquipo').classList.add('show');
    
    // Limpiar búsqueda
    document.getElementById('busquedaEquipoModal').value = '';
    
    // Cargar todos los equipos
    await cargarEquiposEnModal();
    
    // Enfocar campo de búsqueda
    setTimeout(() => {
        document.getElementById('busquedaEquipoModal').focus();
    }, 100);
}

// Cerrar modal seleccionar equipo
function cerrarModalSeleccionarEquipo() {
    document.getElementById('modalSeleccionarEquipo').classList.remove('show');
    document.getElementById('busquedaEquipoModal').value = ''; // Limpiar búsqueda
}

// Cargar todos los equipos al abrir modal
async function cargarEquiposEnModal() {
    try {
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = await response.json();
        
        // Guardar equipos globalmente para búsqueda
        window.equiposCompletos = equipos;
        
        mostrarEquiposEnModal(equipos);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
        document.getElementById('equiposDisponiblesContainer').innerHTML = 
            '<div style="text-align: center; color: #d32f2f; padding: 20px;">Error al cargar equipos</div>';
    }
}

// Mostrar equipos en el modal
function mostrarEquiposEnModal(equipos) {
    const container = document.getElementById('equiposDisponiblesContainer');
    
    if (!equipos || equipos.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 30px; font-style: italic;">📦 No hay equipos registrados</div>';
        return;
    }

    let html = '';
    equipos.forEach(equipo => {
        const icono = getIconoEquipo(equipo.tipo_equipo);
        html += `
            <div style="padding: 15px; border: 1px solid #e8e8e8; margin-bottom: 10px; border-radius: 6px; cursor: pointer; background: #ffffff; transition: all 0.3s ease; box-sizing: border-box;" 
                 onclick="abrirModalConfirmarEquipo('${equipo._id}')"
                 onmouseover="this.style.background='#f5f9ff'; this.style.borderColor='#2192B8'; this.style.boxShadow='0 3px 8px rgba(33,146,184,0.15)'; this.style.transform='translateY(-1px)';" 
                 onmouseout="this.style.background='#ffffff'; this.style.borderColor='#e8e8e8'; this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px; color: #2192B8; min-width: 32px; text-align: center;">
                        <i class="${icono}"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 6px;">
                            ${equipo.tipo_equipo}
                        </div>
                        <div style="color: #666; font-size: 13px; line-height: 1.5;">
                            Marca: ${equipo.marca || 'N/A'} | Modelo: ${equipo.modelo || 'N/A'} | Serie: ${equipo.numero_serie || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Filtrar equipos en el modal
function filtrarEquiposModal() {
    const busqueda = document.getElementById('busquedaEquipoModal').value.toLowerCase().trim();
    
    if (!window.equiposCompletos) return;
    
    if (!busqueda) {
        mostrarEquiposEnModal(window.equiposCompletos);
        return;
    }
    
    const coincidencias = window.equiposCompletos.filter(eq =>
        eq.tipo_equipo.toLowerCase().includes(busqueda) ||
        (eq.marca && eq.marca.toLowerCase().includes(busqueda)) ||
        (eq.modelo && eq.modelo.toLowerCase().includes(busqueda)) ||
        (eq.numero_serie && eq.numero_serie.toLowerCase().includes(busqueda))
    );
    
    mostrarEquiposEnModal(coincidencias);
}

// Abrir formulario para nuevo equipo en modal
function abrirFormularioNuevoEquipoModal() {
    // Marcar que venimos desde selección para auto-seleccionar después
    window.viniendonFromSeleccion = true;
    
    // Cerrar modal de selección
    cerrarModalSeleccionarEquipo();
    
    // Abrir modal de nuevo equipo
    abrirModalNuevoEquipo();
}

// Mostrar modal de confirmación
async function abrirModalConfirmarEquipo(equipoId) {
    // Prevenir múltiples clicks
    if (window.abriendomodalEquipo) return;
    window.abriendomodalEquipo = true;
    
    try {
        // Obtener datos del equipo
        const response = await fetch(`${API_EQUIPOS}`);
        const equipos = await response.json();
        const equipo = equipos.find(e => String(e._id) === String(equipoId));
        
        if (!equipo) {
            alert('Equipo no encontrado');
            window.abriendomodalEquipo = false;
            return;
        }
        
        // Limpiar edición previa
        window.equipoEditado = null;
        
        // Guardar ID y datos del equipo seleccionado
        window.equipoSeleccionadoId = equipoId;
        window.equipoSeleccionadoTipo = equipo.tipo_equipo;
        window.equipoSeleccionadoMarca = equipo.marca || '';
        window.equipoSeleccionadoModelo = equipo.modelo || '';
        window.equipoSeleccionadoSerie = equipo.numero_serie || equipo.serie || '';
        window.equipoSeleccionadoNombre = `${equipo.tipo_equipo} - ${equipo.marca || 'N/A'} ${equipo.modelo || 'N/A'}`;
        
        console.log('✅ Equipo cargado:', {
            tipo: window.equipoSeleccionadoTipo,
            marca: window.equipoSeleccionadoMarca,
            modelo: window.equipoSeleccionadoModelo,
            serie: window.equipoSeleccionadoSerie
        });
        
        // Llenar modal de confirmación
        const icono = getIconoEquipo(equipo.tipo_equipo);
        document.getElementById('confirmTipoEquipo').innerHTML = `<i class="${icono}" style="margin-right: 6px;"></i>${equipo.tipo_equipo}`;
        document.getElementById('confirmMarcaEquipo').textContent = equipo.marca || 'N/A';
        document.getElementById('confirmModeloEquipo').textContent = equipo.modelo || 'N/A';
        document.getElementById('confirmSerieEquipo').textContent = window.equipoSeleccionadoSerie || 'N/A';
        
        // Mostrar modal
        document.getElementById('modalConfirmarEquipo').classList.add('show');
        
        setTimeout(() => {
            window.abriendomodalEquipo = false;
        }, 500);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar datos del equipo');
        window.abriendomodalEquipo = false;
    }
}

// Cerrar modal de confirmación
function cerrarModalConfirmarEquipo() {
    document.getElementById('modalConfirmarEquipo').classList.remove('show');
    window.equipoSeleccionadoId = null;
    window.equipoSeleccionadoTipo = null;
    window.equipoSeleccionadoMarca = null;
    window.equipoSeleccionadoModelo = null;
    window.equipoSeleccionadoSerie = null;
    window.equipoSeleccionadoNombre = null;
}

// ==================== FUNCIONES DE EDICIÓN DE EQUIPO EN CONFIRMACIÓN ====================

// Alternar vista de edición
function toggleEditarDatosEquipo() {
    const viewDatos = document.getElementById('viewDatosEquipo');
    const editDatos = document.getElementById('editDatosEquipo');
    const btnToggle = document.getElementById('btnToggleEditar');
    
    if (editDatos.style.display === 'none') {
        // Mostrar vista editable
        // Cargar valores actuales en los campos
        const tipoValor = window.equipoSeleccionadoTipo || '';
        console.log('📋 Tipo a cargar:', tipoValor);
        
        // Para el select, normalizar el valor (case-insensitive search)
        const selectTipo = document.getElementById('editConfirmTipoEquipo');
        let encontrado = false;
        for (let option of selectTipo.options) {
            if (option.value.toLowerCase() === tipoValor.toLowerCase()) {
                selectTipo.value = option.value;
                encontrado = true;
                break;
            }
        }
        if (!encontrado && tipoValor) {
            console.warn('⚠️ Tipo no encontrado en opciones:', tipoValor);
            selectTipo.value = 'Otro';
        }
        
        document.getElementById('editConfirmMarcaEquipo').value = window.equipoSeleccionadoMarca || '';
        document.getElementById('editConfirmModeloEquipo').value = window.equipoSeleccionadoModelo || '';
        document.getElementById('editConfirmSerieEquipo').value = window.equipoSeleccionadoSerie || '';
        
        viewDatos.style.display = 'none';
        editDatos.style.display = 'grid';
        btnToggle.innerHTML = '<i class="fas fa-eye"></i> Ver';
        btnToggle.style.background = '#666';
    } else {
        // Volver a vista normal
        viewDatos.style.display = 'grid';
        editDatos.style.display = 'none';
        btnToggle.innerHTML = '<i class="fas fa-edit"></i> Editar';
        btnToggle.style.background = '#2192B8';
    }
}

// Cancelar edición
function cancelarEditarDatosEquipo() {
    const viewDatos = document.getElementById('viewDatosEquipo');
    const editDatos = document.getElementById('editDatosEquipo');
    const btnToggle = document.getElementById('btnToggleEditar');
    
    viewDatos.style.display = 'grid';
    editDatos.style.display = 'none';
    btnToggle.innerHTML = '<i class="fas fa-edit"></i> Editar';
    btnToggle.style.background = '#2192B8';
}

// Guardar cambios editados temporalmente (sin guardar en BD aún)
function guardarCambiosEquipoConfirm() {
    const nuevoTipo = document.getElementById('editConfirmTipoEquipo').value?.trim();
    const nuevaMarca = document.getElementById('editConfirmMarcaEquipo').value?.trim();
    const nuevoModelo = document.getElementById('editConfirmModeloEquipo').value?.trim();
    const nuevaSerie = document.getElementById('editConfirmSerieEquipo').value?.trim();
    
    // Validar campos requeridos
    if (!nuevoTipo) {
        alert('⚠️ El tipo de equipo es obligatorio');
        return;
    }
    
    // Solo marcar como editado si realmente hubo cambios
    const hayCambios = nuevoTipo !== (window.equipoSeleccionadoTipo || '') ||
        (nuevaMarca || '') !== (window.equipoSeleccionadoMarca || '') ||
        (nuevoModelo || '') !== (window.equipoSeleccionadoModelo || '') ||
        (nuevaSerie || '') !== (window.equipoSeleccionadoSerie || '');
    
    if (hayCambios) {
        window.equipoEditado = {
            tipo_equipo: nuevoTipo,
            marca: nuevaMarca || '',
            modelo: nuevoModelo || '',
            numero_serie: nuevaSerie || ''
        };
    } else {
        window.equipoEditado = null;
    }
    
    // Actualizar vista normal con los nuevos datos
    const icono = getIconoEquipo(nuevoTipo);
    document.getElementById('confirmTipoEquipo').innerHTML = `<i class="${icono}" style="margin-right: 6px;"></i>${nuevoTipo}`;
    document.getElementById('confirmMarcaEquipo').textContent = nuevaMarca || '-';
    document.getElementById('confirmModeloEquipo').textContent = nuevoModelo || '-';
    document.getElementById('confirmSerieEquipo').textContent = nuevaSerie || '-';
    
    // Actualizar variables de sesión temporales
    window.equipoSeleccionadoTipo = nuevoTipo;
    window.equipoSeleccionadoMarca = nuevaMarca;
    window.equipoSeleccionadoModelo = nuevoModelo;
    window.equipoSeleccionadoSerie = nuevaSerie;
    window.equipoSeleccionadoNombre = `${nuevoTipo} - ${nuevaMarca || 'N/A'} ${nuevoModelo || 'N/A'}`;
    
    // Volver a vista normal
    cancelarEditarDatosEquipo();
}

// Confirmar selección de equipo
async function confirmarSeleccionEquipo() {
    if (!window.equipoSeleccionadoId) {
        console.warn('No hay equipo seleccionado');
        return;
    }
    
    try {
        let equipoIdFinal = window.equipoSeleccionadoId;
        
        // Si se editó el equipo, crear nuevo equipo en BD
        if (window.equipoEditado) {
            console.log('📤 Creando nuevo equipo con datos editados:', window.equipoEditado);
            
            if (!window.equipoEditado.tipo_equipo) {
                throw new Error('tipo_equipo no está presente');
            }
            
            const response = await fetch(`${API_EQUIPOS}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.equipoEditado)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error respuesta:', errorData);
                throw new Error(errorData.error || 'Error al crear equipo');
            }
            
            const equipoGuardado = await response.json();
            
            if (!equipoGuardado || !equipoGuardado._id) {
                console.error('❌ Respuesta inválida del servidor:', equipoGuardado);
                throw new Error('El servidor no devolvió un equipo válido');
            }
            
            equipoIdFinal = equipoGuardado._id;
            console.log('✅ Nuevo equipo creado:', equipoGuardado);
        } else {
            console.log('✓ Usando equipo existente (sin ediciones):', window.equipoSeleccionadoId);
        }
        
        // Asignar equipo al formulario
        document.getElementById('equipo_id').value = equipoIdFinal;
        document.getElementById('equipoSeleccionado').value = window.equipoSeleccionadoNombre;
        
        // Actualizar problemas según tipo de equipo guardado
        if (window.equipoSeleccionadoTipo) {
            actualizarProblemasSegunEquipoTipo(window.equipoSeleccionadoTipo);
        }
        
        console.log('✅ Equipo confirmado:', window.equipoSeleccionadoNombre);
        
        // Limpiar datos editados
        window.equipoEditado = null;
        
        // Cerrar ambos modales
        setTimeout(() => {
            cerrarModalConfirmarEquipo();
            cerrarModalSeleccionarEquipo();
        }, 100);
        
    } catch (error) {
        console.error('Error al confirmar equipo:', error);
        alert('Error al confirmar equipo: ' + error.message);
    }
}

// Seleccionar equipo desde la búsqueda (ahora abre confirmación)
function seleccionarEquipoServicio(equipoId, descripcion) {
    abrirModalConfirmarEquipo(equipoId);
}

// Mostrar formulario para crear nuevo equipo
function mostrarFormularioNuevoEquipo() {
    document.getElementById('equiposBusquedaContainer').style.display = 'none';
    document.getElementById('btnCrearNuevoEquipo').style.display = 'none';
    document.getElementById('seccionNuevoEquipoDesdeServicio').style.display = 'block';
    document.getElementById('tipoEquipoNuevo').focus();
}

// Cancelar creación de nuevo equipo
function cancelarNuevoEquipoDesdeServicio() {
    document.getElementById('seccionNuevoEquipoDesdeServicio').style.display = 'none';
    document.getElementById('equiposBusquedaContainer').style.display = 'block';
    document.getElementById('btnCrearNuevoEquipo').style.display = 'block';
}

// Guardar equipo desde servicio


async function guardarEquipo(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('formEquipo'));
    const equipo = Object.fromEntries(formData);

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_EQUIPOS}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipo)
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al guardar equipo');
        }

        const equipoGuardado = await response.json();

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();

        // Si venimos desde la selección, auto-seleccionar el equipo
         if (window.viniendonFromSeleccion) {
             document.getElementById('equipo_id').value = equipoGuardado._id;
             document.getElementById('equipoSeleccionado').value = 
                 `${equipoGuardado.tipo_equipo} - ${equipoGuardado.marca || 'N/A'} ${equipoGuardado.modelo || 'N/A'}`;
            
             // Actualizar problemas según el tipo
             actualizarProblemasSegunEquipoTipo(equipoGuardado.tipo_equipo);
             
             window.viniendonFromSeleccion = false;
         }

         document.getElementById('formEquipo').reset();
         cerrarModalNuevoEquipo();
         cargarEquipos();
         
         // ✅ MEJORA: Mostrar modal de éxito centrado
         mostrarNotificacionExito('Equipo guardado');
        actualizarSelectsEquipos();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar equipo');
        window.viniendonFromSeleccion = false;
    }
}

async function cargarEquipos() {
    const container = document.getElementById('equiposContainer');
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando equipos...</p>
        </div>`;
    try {
        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();

        // Verificar si se deben incluir eliminados
        const toggleEliminados = document.getElementById('toggleEquiposEliminados');
        const incluirEliminados = toggleEliminados && toggleEliminados.checked;
        
        const url = incluirEliminados ? `${API_EQUIPOS}?incluirEliminados=true` : `${API_EQUIPOS}`;
        const equiposRes = await fetch(url);
        const equipos = await equiposRes.json();

        if (equipos.length === 0) {
            container.innerHTML = '<div class="no-records">No hay equipos registrados</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Serie</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        equipos.forEach(eq => {
            const iconoTipo = getIconoEquipo(eq.tipo_equipo);
            const esEliminado = eq.eliminado === true;
            const rowStyle = esEliminado ? 'style="background-color: #ffebee; opacity: 0.7;"' : '';
            
            html += `
                <tr ${rowStyle}>
                    <td data-label="Tipo"><i class="${iconoTipo}" style="margin-right: 8px;"></i>${eq.tipo_equipo}${esEliminado ? ' <span style="color: #d32f2f; font-size: 11px;">(ELIMINADO)</span>' : ''}</td>
                    <td data-label="Marca">${eq.marca || 'N/A'}</td>
                    <td data-label="Modelo">${eq.modelo || 'N/A'}</td>
                    <td data-label="Serie">${eq.numero_serie || 'N/A'}</td>
                    <td data-label="Acciones" class="actions">
                         ${!esEliminado ? `
                         <button class="btn-edit" onclick="abrirModalEditarEquipo('${eq._id}')">Editar</button>
                         <button class="btn-danger" onclick="confirmarEliminarEquipo('${eq._id}')">Eliminar</button>
                         ` : `
                         <button class="btn-primary" onclick="restaurarEquipo('${eq._id}')">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                         `}
                      </td>
                 </tr>
             `;
         });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="error-message">Error al cargar equipos</div>';
    }
}

async function filtrarEquipos() {
    const busqueda = document.getElementById('searchEquipos').value.toLowerCase();
    try {
        // Verificar si se deben incluir eliminados
        const toggleEliminados = document.getElementById('toggleEquiposEliminados');
        const incluirEliminados = toggleEliminados && toggleEliminados.checked;
        
        const url = incluirEliminados ? `${API_EQUIPOS}?incluirEliminados=true` : `${API_EQUIPOS}`;
        const equiposRes = await fetch(url);
        const equipos = await equiposRes.json();
        const filtrados = equipos.filter(eq =>
            eq.tipo_equipo.toLowerCase().includes(busqueda) ||
            (eq.marca && eq.marca.toLowerCase().includes(busqueda)) ||
            (eq.modelo && eq.modelo.toLowerCase().includes(busqueda)) ||
            (eq.numero_serie && eq.numero_serie.toLowerCase().includes(busqueda))
        );

        const container = document.getElementById('equiposContainer');

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="no-records">No se encontraron equipos</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Serie</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtrados.forEach(eq => {
            const iconoTipo = getIconoEquipo(eq.tipo_equipo);
            const esEliminado = eq.eliminado === true;
            const rowStyle = esEliminado ? 'style="background-color: #ffebee; opacity: 0.7;"' : '';
            
            html += `
                <tr ${rowStyle}>
                    <td data-label="Tipo"><i class="${iconoTipo}" style="margin-right: 8px;"></i>${eq.tipo_equipo}${esEliminado ? ' <span style="color: #d32f2f; font-size: 11px;">(ELIMINADO)</span>' : ''}</td>
                    <td data-label="Marca">${eq.marca || 'N/A'}</td>
                    <td data-label="Modelo">${eq.modelo || 'N/A'}</td>
                    <td data-label="Serie">${eq.numero_serie || 'N/A'}</td>
                    <td data-label="Acciones" class="actions">
                         ${!esEliminado ? `
                         <button class="btn-edit" onclick="abrirModalEditarEquipo('${eq._id}')">Editar</button>
                         <button class="btn-danger" onclick="confirmarEliminarEquipo('${eq._id}')">Eliminar</button>
                         ` : `
                         <button class="btn-primary" onclick="restaurarEquipo('${eq._id}')">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                         `}
                     </td>
                    </tr>
                    `;
                    });

                    html += `</tbody></table>`;
                    container.innerHTML = html;
                    } catch (error) {
                    console.error('Error:', error);
                    }
                    }
                    
                    async function abrirModalEditarEquipo(id) {
                    try {
                    const response = await fetch(`${API_EQUIPOS}`);
                    const equipos = await response.json();
                    const equipo = equipos.find(e => String(e._id) === String(id));

                    if (!equipo) {
                    alert('Equipo no encontrado');
                    return;
                    }

                    // ✅ MEJORA: Guardar datos originales para detectar cambios
                    window.equipoEnEdicion = {
                    _id: equipo._id,
                    tipo_equipo: equipo.tipo_equipo,
                    marca: equipo.marca,
                    modelo: equipo.modelo,
                    numero_serie: equipo.numero_serie
                    };

                    // Llenar modal con datos del equipo
                    document.getElementById('editEquipoId').value = equipo._id;
                    document.getElementById('editTipoEquipo').value = equipo.tipo_equipo;
                    document.getElementById('editMarca').value = equipo.marca;
                    document.getElementById('editModelo').value = equipo.modelo;
                    document.getElementById('editSerie').value = equipo.numero_serie;

                    // Actualizar icono
                    actualizarIconoEditar();

                    // Mostrar modal
                    document.getElementById('modalEditarEquipo').classList.add('show');
                    } catch (error) {
                    console.error('Error:', error);
                    alert('Error al abrir modal de edición');
                    }
                    }

function cerrarModalEditarEquipo() {
    document.getElementById('modalEditarEquipo').classList.remove('show');
}

async function guardarCambiosEquipo(e) {
    e.preventDefault();
    
    const id = document.getElementById('editEquipoId').value;
    const tipoEquipoNuevo = document.getElementById('editTipoEquipo').value;
    const marcaNueva = document.getElementById('editMarca').value;
    const modeloNuevo = document.getElementById('editModelo').value;
    const serieNueva = document.getElementById('editSerie').value;
    
    // ✅ MEJORA: Detectar si hubo cambios reales
    const tipoCambio = window.equipoEnEdicion.tipo_equipo !== tipoEquipoNuevo;
    const marcaCambio = (window.equipoEnEdicion.marca || '') !== marcaNueva;
    const modeloCambio = (window.equipoEnEdicion.modelo || '') !== modeloNuevo;
    const serieCambio = (window.equipoEnEdicion.numero_serie || '') !== serieNueva;
    
    const huboCambios = tipoCambio || marcaCambio || modeloCambio || serieCambio;
    
    // Si no hubo cambios, solo cerrar modal
    if (!huboCambios) {
        cerrarModalEditarEquipo();
        return;
    }
    
    const equipoActualizado = {
        tipo_equipo: tipoEquipoNuevo,
        marca: marcaNueva,
        modelo: modeloNuevo,
        serie: serieNueva
    };

    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Guardando...');
        
        const response = await fetch(`${API_EQUIPOS}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipoActualizado)
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al actualizar equipo');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cerrarModalEditarEquipo();
        cargarEquipos();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Equipo actualizado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar cambios: ' + error.message);
    }
}

async function confirmarEliminarEquipo(id) {
    document.getElementById('confirmMsg').textContent = '¿Estás seguro de que deseas eliminar este equipo?';
    document.getElementById('confirmBtn').onclick = () => eliminarEquipo(id);
    document.getElementById('confirmModal').classList.add('show');
}

async function eliminarEquipo(id) {
    try {
        // ✅ MEJORA: Mostrar modal de carga
        mostrarModalCarga('Eliminando...');
        
        // Soft delete: marcar como eliminado
        const response = await fetch(`${API_EQUIPOS}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eliminado: true })
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al eliminar');
        }

        // ✅ MEJORA: Cerrar modal de carga
        cerrarModalCarga();
        
        cargarEquipos();
        cerrarModal();
        
        // ✅ MEJORA: Mostrar modal de éxito centrado
        mostrarNotificacionExito('Equipo eliminado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar equipo');
    }
}

// Restaurar equipo eliminado (solo admin)
async function restaurarEquipo(id) {
    try {
        mostrarModalCarga('Restaurando...');
        
        const response = await fetch(`${API_EQUIPOS}/${id}/restaurar`, {
            method: 'PUT'
        });

        if (!response.ok) {
            cerrarModalCarga();
            throw new Error('Error al restaurar');
        }

        cerrarModalCarga();
        cargarEquipos();
        mostrarNotificacionExito('Equipo restaurado');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al restaurar equipo');
    }
}

// ==================== DECOLECTA ====================



function cerrarModal() {
    document.getElementById('confirmModal').classList.remove('show');
}

// Cerrar modal al hacer clic fuera del contenido
window.onclick = function (event) {
    const modalNuevoCliente = document.getElementById('modalNuevoCliente');
    const modalVerCliente = document.getElementById('modalVerCliente');
    const confirmModal = document.getElementById('confirmModal');

    if (event.target === modalNuevoCliente) {
        cerrarModalNuevoCliente();
    }
    if (event.target === modalVerCliente) {
        cerrarModalVerCliente();
    }
    if (event.target === confirmModal) {
        cerrarModal();
    }
}

// Ver diagnóstico guardado
async function verDiagnostico(servicioId) {
    try {
        const response = await fetch(`${API_SERVICIOS}`);
        const servicios = await response.json();
        const servicio = servicios.find(s => s._id === servicioId);

        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico registrado');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        // Llenar el modal con los datos
        document.getElementById('numeroServicioVerDiag').textContent = servicio.numero_servicio;
        
        let html = '';
        let total = 0;

        diagnostico.forEach((p, idx) => {
            html += `
                <div style="padding: 12px; margin-bottom: 10px; background: white; border-radius: 4px; border-left: 3px solid #2192B8;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <strong style="color: #2192B8;">Problema ${idx + 1}:</strong> ${p.descripcion}
                        </div>
                        <div style="color: #4CAF50; font-weight: bold;">$${p.costo.toFixed(2)}</div>
                    </div>
                </div>
            `;
            total += p.costo;
        });

        document.getElementById('diagnosticoVerContainer').innerHTML = html || '<p style="color: #999;">No hay problemas registrados</p>';
        document.getElementById('montoTotalVerDiag').textContent = total.toFixed(2);

        // Mostrar el modal
        document.getElementById('modalVerDiagnostico').classList.add('show');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico');
    }
}

// Cerrar modal Ver Diagnóstico
function cerrarModalVerDiagnostico() {
    document.getElementById('modalVerDiagnostico').classList.remove('show');
}

// Cargar diagnósticos
async function cargarDiagnosticos() {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();

        // Filtrar solo diagnósticos
        const diagnosticados = servicios.filter(s => s.estado === 'Diagnosticado');

        const container = document.getElementById('diagnosticosContainer');

        if (diagnosticados.length === 0) {
            container.innerHTML = '<div class="no-records">No hay diagnósticos realizados</div>';
            return;
        }

        let html = `
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Cliente</th>
                        <th>Equipo</th>
                        <th>Técnico</th>
                        <th>Monto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        diagnosticados.forEach(srv => {
            const cliente = clientes.find(c => c._id == srv.cliente_id);
            const equipo = equipos.find(e => e._id == srv.equipo_id);

            html += `
                <tr>
                    <td><strong>${srv.numero_servicio || 'N/A'}</strong></td>
                    <td>${cliente ? cliente.nombre : 'N/A'}</td>
                    <td>${equipo ? equipo.tipo_equipo : 'N/A'}</td>
                    <td>${srv.tecnico || 'N/A'}</td>
                    <td>$${srv.monto ? srv.monto.toFixed(2) : '0.00'}</td>
                    <td class="actions">
                        <button class="btn-edit" onclick="verDetallesDiagnostico(${srv.id})" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-primary" onclick="generarWhatsAppDiagnostico(${srv.id})" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Ver detalles del diagnóstico
async function verDetallesDiagnostico(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => String(c._id) === String(servicio.cliente_id));

        const equiposRes = await fetch(`${API_EQUIPOS}`);
        const equipos = await equiposRes.json();
        const equipo = equipos.find(e => String(e._id) === String(servicio.equipo_id));

        if (!servicio || !servicio.diagnostico) {
            alert('No hay diagnóstico registrado');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        let detalle = `═══════════════════════════════════\n`;
        detalle += `DIAGNÓSTICO DEL EQUIPO\n`;
        detalle += `═══════════════════════════════════\n\n`;

        detalle += `INFORMACIÓN DEL CLIENTE:\n`;
        detalle += `Cliente: ${cliente?.nombre || 'N/A'}\n`;
        detalle += `Teléfono: ${cliente?.telefono || 'N/A'}\n`;
        detalle += `Email: ${cliente?.email || 'N/A'}\n\n`;

        detalle += `INFORMACIÓN DEL SERVICIO:\n`;
        detalle += `Número: ${servicio.numero_servicio}\n`;
        detalle += `Fecha: ${servicio.fecha}\n\n`;

        detalle += `INFORMACIÓN DEL EQUIPO:\n`;
        detalle += `Tipo: ${equipo?.tipo_equipo || 'N/A'}\n`;
        detalle += `Marca: ${equipo?.marca || 'N/A'}\n`;
        detalle += `Modelo: ${equipo?.modelo || 'N/A'}\n`;
        detalle += `Serie: ${equipo?.serie || 'N/A'}\n\n`;

        detalle += `PROBLEMAS ENCONTRADOS:\n`;
        let total = 0;
        diagnostico.forEach((p, idx) => {
            detalle += `${idx + 1}. ${p.descripcion} - $${p.costo.toFixed(2)}\n`;
            total += p.costo;
        });

        detalle += `\n═══════════════════════════════════\n`;
        detalle += `MONTO TOTAL: $${total.toFixed(2)}\n`;
        detalle += `═══════════════════════════════════\n\n`;

        detalle += `Técnico: ${servicio.tecnico || 'N/A'}\n`;
        detalle += `Fecha del Diagnóstico: ${new Date().toLocaleDateString('es-ES')}\n`;

        alert(detalle);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar diagnóstico');
    }
}

// Generar WhatsApp para diagnóstico
async function generarWhatsAppDiagnostico(servicioId) {
    try {
        const serviciosRes = await fetch(`${API_SERVICIOS}`);
        const servicios = await serviciosRes.json();
        const servicio = servicios.find(s => s._id === servicioId);

        const clientesRes = await fetch(`${API_URL}/clientes`);
        const clientes = await clientesRes.json();
        const cliente = clientes.find(c => c._id == servicio.cliente_id);

        if (!servicio || !servicio.diagnostico || !cliente) {
            alert('Faltan datos para generar el mensaje');
            return;
        }

        let diagnostico;
        try {
            diagnostico = JSON.parse(servicio.diagnostico);
        } catch (e) {
            diagnostico = [];
        }

        // Crear mensaje para WhatsApp
        let mensaje = `*DIAGNÓSTICO DEL EQUIPO*%0A%0A`;
        mensaje += `Estimado(a) ${cliente.nombre},%0A%0A`;
        mensaje += `*Número de Servicio:* ${servicio.numero_servicio}%0A`;
        mensaje += `*Fecha:* ${servicio.fecha}%0A%0A`;

        mensaje += `*Problemas Encontrados:*%0A`;
        let total = 0;
        diagnostico.forEach((p, idx) => {
            mensaje += `${idx + 1}. ${p.descripcion} - $${p.costo.toFixed(2)}%0A`;
            total += p.costo;
        });

        mensaje += `%0A*Monto Total del Diagnóstico: $${total.toFixed(2)}*%0A%0A`;
        mensaje += `Técnico: ${servicio.tecnico || 'N/A'}%0A`;
        mensaje += `Para más información, contáctenos.`;

        // Crear link de WhatsApp (sin el + al inicio para compatibilidad)
        const telefono = cliente.telefono.replace(/[^\d]/g, '');
        const urlWhatsApp = `https://wa.me/${telefono}?text=${mensaje}`;

        // Abrir WhatsApp
        window.open(urlWhatsApp, '_blank');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar mensaje de WhatsApp');
    }
}

// Mostrar modal de reparación completada
function mostrarModalReparacionCompleta() {
    const modal = document.getElementById('modalReparacionCompleta');
    modal.classList.add('show');
    
    // Cerrar automáticamente después de 0.6 segundos
    setTimeout(() => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.classList.remove('show');
            modal.style.opacity = '1';
            cargarServicios();
        }, 300);
    }, 600);
}

// Cerrar modal de reparación completada
function cerrarModalReparacionCompleta() {
    document.getElementById('modalReparacionCompleta').classList.remove('show');
    cargarServicios();
}

// ✅ NOTA: La inicialización ahora se maneja en main.js
// Este DOMContentLoaded puede ser eliminado si main.js está cargado
document.addEventListener('DOMContentLoaded', function () {
    // Las funciones de clientes ahora están en el módulo
    if (window.cargarClientes) window.cargarClientes();
    if (window.actualizarSelectsClientes) window.actualizarSelectsClientes();
});

// ==================== USUARIOS (Solo Admin) ====================

function abrirModalNuevoUsuario() {
    document.getElementById('modalNuevoUsuario').classList.add('show');
    document.getElementById('formNuevoUsuario').reset();
}

function cerrarModalNuevoUsuario() {
    document.getElementById('modalNuevoUsuario').classList.remove('show');
}

async function guardarNuevoUsuario(e) {
    e.preventDefault();
    const usuario = document.getElementById('nuevoUsuarioNombre').value.trim();
    const correo = document.getElementById('nuevoUsuarioCorreo').value.trim();
    const clave = document.getElementById('nuevoUsuarioClave').value;
    const rol = document.getElementById('nuevoUsuarioRol').value;

    try {
        mostrarModalCarga('Creando usuario...');
        const response = await fetch(`${API_BASE}/api/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, correo, clave, rol })
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear usuario');
        }

        cerrarModalNuevoUsuario();
        mostrarNotificacionExito('Usuario creado exitosamente');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

async function cargarUsuarios() {
    const container = document.getElementById('usuariosContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-spinner-inline">
            <div class="loading-spinner-circle"></div>
            <p class="loading-spinner-text">Cargando usuarios...</p>
        </div>`;

    try {
        const response = await fetch(`${API_BASE}/api/usuarios`);
        if (!response.ok) throw new Error('Error al cargar usuarios');
        
        const usuarios = await response.json();
        const usuarioActual = getUsuarioActual();

        if (usuarios.length === 0) {
            container.innerHTML = '<div class="no-records">No hay usuarios registrados</div>';
            return;
        }

        let html = `<table class="records-table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>`;

        usuarios.forEach(u => {
            const esMiUsuario = usuarioActual && u._id === usuarioActual.id;
            const fechaCreacion = u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString('es-PE') : 'N/A';
            const rolBadge = u.rol === 'admin' 
                ? '<span style="background: #e3f2fd; color: #1565C0; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;"><i class="fas fa-shield-alt"></i> Admin</span>'
                : '<span style="background: #f5f5f5; color: #666; padding: 3px 10px; border-radius: 12px; font-size: 12px;"><i class="fas fa-user"></i> Usuario</span>';

            html += `<tr>
                <td data-label="Usuario"><strong>${u.usuario}</strong></td>
                <td data-label="Correo">${u.correo}</td>
                <td data-label="Rol">${rolBadge}</td>
                <td data-label="Fecha">${fechaCreacion}</td>
                <td data-label="Acciones">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button class="btn-edit" onclick="abrirModalEditarUsuario('${u._id}', '${u.usuario}', '${u.correo}', '${u.rol}')" style="padding: 6px 12px; font-size: 12px;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${esMiUsuario 
                            ? '<span style="color: #999; font-size: 11px;"><i class="fas fa-lock"></i> Tu cuenta</span>'
                            : `<button class="btn-danger" onclick="eliminarUsuario('${u._id}', '${u.usuario}')" style="padding: 6px 12px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Eliminar
                              </button>`
                        }
                    </div>
                </td>
            </tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="no-records" style="color: #c62828;">Error al cargar usuarios</div>';
    }
}

async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${nombre}"?`)) return;

    try {
        mostrarModalCarga('Eliminando usuario...');
        const response = await fetch(`${API_BASE}/api/usuarios/${id}`, {
            method: 'DELETE'
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar usuario');
        }

        mostrarNotificacionExito('Usuario eliminado');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

// Editar usuario
function abrirModalEditarUsuario(id, usuario, correo, rol) {
    document.getElementById('editUsuarioId').value = id;
    document.getElementById('editUsuarioNombre').value = usuario;
    document.getElementById('editUsuarioCorreo').value = correo;
    document.getElementById('editUsuarioRol').value = rol;
    document.getElementById('editUsuarioClaveNueva').value = '';
    document.getElementById('editUsuarioClaveAdmin').value = '';
    document.getElementById('seccionClaveAdmin').style.display = 'none';
    document.getElementById('modalEditarUsuario').classList.add('show');

    // Mostrar/ocultar campo de clave admin al escribir nueva contraseña
    document.getElementById('editUsuarioClaveNueva').oninput = function() {
        document.getElementById('seccionClaveAdmin').style.display = this.value.length > 0 ? 'block' : 'none';
    };
}

function cerrarModalEditarUsuario() {
    document.getElementById('modalEditarUsuario').classList.remove('show');
}

async function guardarEdicionUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('editUsuarioId').value;
    const usuario = document.getElementById('editUsuarioNombre').value.trim();
    const correo = document.getElementById('editUsuarioCorreo').value.trim();
    const rol = document.getElementById('editUsuarioRol').value;
    const claveNueva = document.getElementById('editUsuarioClaveNueva').value;
    const claveAdmin = document.getElementById('editUsuarioClaveAdmin').value;

    const body = { usuario, correo, rol };
    if (claveNueva) {
        body.clave_nueva = claveNueva;
        body.clave_admin = claveAdmin;
    }

    try {
        mostrarModalCarga('Actualizando usuario...');
        const response = await fetch(`${API_BASE}/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        cerrarModalCarga();

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar usuario');
        }

        cerrarModalEditarUsuario();
        mostrarNotificacionExito('Usuario actualizado');
        cargarUsuarios();
    } catch (error) {
        cerrarModalCarga();
        alert('Error: ' + error.message);
    }
}

// Inicializar interfaz según rol
function inicializarUI() {
    const usuario = getUsuarioActual();
    if (usuario) {
        const nombreSpan = document.getElementById('nombreUsuarioSidebar');
        if (nombreSpan) nombreSpan.textContent = usuario.usuario;
        
        if (usuario.rol === 'admin') {
            const tabUsuarios = document.getElementById('tabUsuarios');
            if (tabUsuarios) tabUsuarios.style.display = 'flex';
            
            const separadorAdmin = document.getElementById('separadorAdmin');
            if (separadorAdmin) separadorAdmin.style.display = 'block';
            
            // Mostrar toggles para ver eliminados (solo admin)
            const toggleClientesContainer = document.getElementById('toggleEliminadosContainer');
            if (toggleClientesContainer) toggleClientesContainer.style.display = 'flex';
            
            const toggleEquiposContainer = document.getElementById('toggleEliminadosEquiposContainer');
            if (toggleEquiposContainer) toggleEquiposContainer.style.display = 'flex';
        }
    }
}
