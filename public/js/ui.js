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
 * Mostrar notificación de éxito centrada
 * @param {string} mensaje 
 */
export function mostrarNotificacionExito(mensaje) {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 30px 50px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
        z-index: 10000;
        font-size: 18px;
        font-weight: 600;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;
    notif.innerHTML = `<i class="fas fa-check-circle" style="font-size: 24px; margin-right: 10px;"></i>${mensaje}`;
    
    document.body.appendChild(notif);
    
    // Remover después de 2 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
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
export function switchTab(tabName, evt = null) {
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
    
    // Marcar botón activo
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
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
