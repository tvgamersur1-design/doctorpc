// ==================== FUNCIONES DE UI ====================

/**
 * Mostrar modal
 * @param {string} modalId 
 */
export function mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Cerrar modal
 * @param {string} modalId 
 */
export function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Cerrar modal de confirmación genérico
 */
export function cerrarModalConfirmacion() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Mostrar notificación de éxito en esquina superior derecha
 * @param {string} mensaje 
 */
export function mostrarNotificacionExito(mensaje) {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        color: #5f6368;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        border-left: 4px solid #34a853;
        z-index: 10000;
        font-size: 15px;
        font-weight: 500;
        text-align: left;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">Éxito</div>
                <div style="font-size: 14px; color: #5f6368; line-height: 1.4;">${mensaje}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notif);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

/**
 * Mostrar notificación de advertencia centrada
 * @param {string} mensaje 
 */
export function mostrarNotificacionAdvertencia(mensaje) {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        color: #5f6368;
        padding: 24px 32px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        border-left: 4px solid #f9a825;
        z-index: 10000;
        font-size: 15px;
        font-weight: 500;
        text-align: left;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: #fff8e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f9a825" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">Atención</div>
                <div style="font-size: 14px; color: #5f6368; line-height: 1.4;">${mensaje}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notif);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

/**
 * Mostrar notificación de error
 * @param {string} mensaje 
 */
export function mostrarNotificacionError(mensaje) {
    alert('⚠️ ' + mensaje);
}

/**
 * Mostrar modal de carga
 * @param {string} mensaje 
 */
export function mostrarModalCarga(mensaje = 'Cargando...') {
    let modal = document.getElementById('modalCarga');
    
    // Crear modal si no existe
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalCarga';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 300px; text-align: center; padding: 40px;">
                <div class="loading-spinner-circle" style="margin: 0 auto 20px;"></div>
                <p id="mensajeCarga" style="font-size: 16px; color: #666;">${mensaje}</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const mensajeElement = document.getElementById('mensajeCarga');
    if (mensajeElement) {
        mensajeElement.textContent = mensaje;
    }
    
    modal.classList.add('show');
}

/**
 * Cerrar modal de carga
 */
export function cerrarModalCarga() {
    const modal = document.getElementById('modalCarga');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Cambiar de tab
 * @param {string} tabName 
 * @param {Event} evt - Evento del click (opcional)
 */
export function switchTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    // Mostrar tab seleccionado
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Marcar botón activo buscando el botón que contiene onclick con este tabName
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${tabName}'`)) {
            btn.classList.add('active');
        }
    });
}

/**
 * Toggle menú móvil
 */
export function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
}

/**
 * Toggle tema claro/oscuro
 */
export function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('#themeToggle i');
    
    body.classList.toggle('dark-theme');
    
    // Cambiar icono
    if (body.classList.contains('dark-theme')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
}

/**
 * Cargar tema guardado
 */
export function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeIcon = document.querySelector('#themeToggle i');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
}

/**
 * Actualizar visibilidad del botón de menú según tamaño de pantalla
 */
export function updateMenuToggleVisibility() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        if (window.innerWidth <= 768) {
            menuToggle.style.display = 'inline-flex';
        } else {
            menuToggle.style.display = 'none';
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('open');
        }
    }
}

/**
 * Mostrar spinner de carga inline
 * @param {string} containerId 
 * @param {string} mensaje 
 */
export function mostrarSpinnerInline(containerId, mensaje = 'Cargando...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner-inline">
                <div class="loading-spinner-circle"></div>
                <p class="loading-spinner-text">${mensaje}</p>
            </div>
        `;
    }
}

/**
 * Mostrar mensaje de error en contenedor
 * @param {string} containerId 
 * @param {string} mensaje 
 */
export function mostrarErrorEnContenedor(containerId, mensaje = 'Error al cargar datos') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="error-message">${mensaje}</div>`;
    }
}

/**
 * Mostrar mensaje de "sin registros"
 * @param {string} containerId 
 * @param {string} mensaje 
 */
export function mostrarSinRegistros(containerId, mensaje = 'No hay registros') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="no-records">${mensaje}</div>`;
    }
}

/**
 * Mostrar modal de notificación personalizado
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación: 'warning', 'error', 'success', 'info'
 * @param {string} titulo - Título del modal (opcional)
 */
export function mostrarModalNotificacion(mensaje, tipo = 'warning', titulo = null) {
    const modal = document.getElementById('modalNotificacion');
    const iconoElement = document.getElementById('iconoNotificacion');
    const tituloElement = document.getElementById('tituloNotificacion');
    const mensajeElement = document.getElementById('mensajeNotificacion');
    
    if (!modal || !iconoElement || !tituloElement || !mensajeElement) {
        console.error('Modal de notificación no encontrado');
        alert(mensaje);
        return;
    }
    
    // Configurar icono y colores según el tipo
    let icono = '';
    let color = '';
    let tituloDefault = '';
    
    switch(tipo) {
        case 'warning':
            icono = '<i class="fas fa-exclamation-triangle"></i>';
            color = '#FF9800';
            tituloDefault = 'Atención';
            break;
        case 'error':
            icono = '<i class="fas fa-times-circle"></i>';
            color = '#d32f2f';
            tituloDefault = 'Error';
            break;
        case 'success':
            icono = '<i class="fas fa-check-circle"></i>';
            color = '#4CAF50';
            tituloDefault = 'Éxito';
            break;
        case 'info':
            icono = '<i class="fas fa-info-circle"></i>';
            color = '#2196F3';
            tituloDefault = 'Información';
            break;
        default:
            icono = '<i class="fas fa-exclamation-triangle"></i>';
            color = '#FF9800';
            tituloDefault = 'Atención';
    }
    
    // Actualizar contenido del modal
    iconoElement.innerHTML = icono;
    iconoElement.style.color = color;
    tituloElement.textContent = titulo || tituloDefault;
    mensajeElement.textContent = mensaje;
    
    // Mostrar modal
    modal.classList.add('show');
}

/**
 * Cerrar modal de notificación
 */
export function cerrarModalNotificacion() {
    const modal = document.getElementById('modalNotificacion');
    if (modal) {
        modal.classList.remove('show');
    }
}
