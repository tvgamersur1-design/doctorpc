// ==================== INICIALIZADOR PRINCIPAL ====================

import { verificarSesion, cerrarSesion, configurarPermisos, actualizarNombreUsuarioUI } from './auth.js';
import { 
    switchTab, 
    toggleMenu, 
    updateMenuToggleVisibility,
    mostrarModalCarga,
    cerrarModalCarga,
    mostrarNotificacionExito
} from './ui.js';
import * as Clientes from './modules/clientes.js';
import * as Equipos from './modules/equipos.js';
import * as Servicios from './modules/servicios.js';
import * as Diagnostico from './modules/diagnostico.js';
import * as Usuarios from './modules/usuarios.js';
import * as Cancelacion from './modules/cancelacion.js';
import * as Estado from './modules/estado.js';
import * as Helpers from './helpers.js';

// Verificar sesión al cargar (solo si no estamos en index.html)
if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
    verificarSesion();
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando aplicación modular...');
    inicializarAplicacion();
});

/**
 * Inicializar la aplicación
 */
function inicializarAplicacion() {
    try {
        // 1. Configurar permisos según rol del usuario
        configurarPermisos();
        
        // 2. Actualizar nombre de usuario en UI
        actualizarNombreUsuarioUI();
        
        // 3. Configurar UI y eventos
        configurarUI();
        
        // 4. Configurar event listeners globales
        configurarEventListeners();
        
        // 5. Cargar datos iniciales del tab activo
        cargarDatosIniciales();
        
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
    }
}

/**
 * Configurar elementos de UI
 */
function configurarUI() {
    // Configurar visibilidad del menú móvil
    updateMenuToggleVisibility();
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', updateMenuToggleVisibility);
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(event) {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (sidebar && menuToggle) {
            if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                sidebar.classList.remove('open');
                const overlay = document.getElementById('sidebarOverlay');
                if (overlay) overlay.classList.remove('show');
            }
        }
    });
    
    // Cerrar menú al hacer clic en un tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        });
    });
}

/**
 * Configurar event listeners globales
 */
function configurarEventListeners() {
    // Cerrar modales al hacer clic en el overlay
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            // Cerrar modal si se hace clic en el overlay
            const modales = [
                'modalNuevoCliente',
                'modalVerCliente',
                'modalNuevoServicio',
                'modalSeleccionarCliente',
                'modalSeleccionarEquipo',
                'modalConfirmarEquipo',
                'modalDiagnostico',
                'modalVerDiagnostico',
                'modalDetallesServicio',
                'modalCancelarServicio',
                'modalEntregarEquipo',
                'modalReparacionCompleta',
                'modalNuevoEquipo',
                'modalVerEquipo',
                'modalNuevoUsuario',
                'modalEditarUsuario',
                'modalImagenCompleta'
            ];
            
            modales.forEach(modalId => {
                if (event.target.id === modalId) {
                    event.target.classList.remove('show');
                }
            });
        }
    });
}

/**
 * Cargar datos iniciales según el tab activo
 */
function cargarDatosIniciales() {
    const tabActivo = document.querySelector('.tab-content.active');
    
    if (!tabActivo) return;
    
    // Cargar datos según el tab activo
    if (tabActivo.id === 'clientesTab') {
        Clientes.cargarClientes();
    } else if (tabActivo.id === 'equiposTab') {
        Equipos.cargarEquipos();
    } else if (tabActivo.id === 'serviciosTab') {
        Servicios.cargarServicios();
    } else if (tabActivo.id === 'usuariosTab') {
        Usuarios.cargarUsuarios();
    }
}

/**
 * Manejar cambio de tab
 * @param {string} tabName 
 */
function handleSwitchTab(tabName, event) {
    // Cambiar tab en la UI
    switchTab(tabName, event);
    
    // Cargar datos del nuevo tab
    if (tabName === 'clientes') {
        Clientes.cargarClientes();
    } else if (tabName === 'equipos') {
        Equipos.cargarEquipos();
    } else if (tabName === 'servicios') {
        Servicios.cargarServicios();
    } else if (tabName === 'usuarios') {
        Usuarios.cargarUsuarios();
    }
}

// ==================== EXPONER FUNCIONES AL SCOPE GLOBAL ====================
// Necesario para que funcionen los onclick en el HTML

// Funciones de navegación
window.switchTab = handleSwitchTab;
window.toggleMenu = toggleMenu;
window.cerrarSesion = cerrarSesion;

// ✅ Funciones de UI globales (necesarias para modales de confirmación)
window.mostrarModalCarga = mostrarModalCarga;
window.cerrarModalCarga = cerrarModalCarga;
window.mostrarNotificacionExito = mostrarNotificacionExito;
window.cerrarModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
};

// Módulo de Clientes
window.abrirModalNuevoCliente = Clientes.abrirModalNuevoCliente;
window.cerrarModalNuevoCliente = Clientes.cerrarModalNuevoCliente;
window.guardarClienteDesdeModal = Clientes.guardarClienteDesdeModal;
window.filtrarClientes = Clientes.filtrarClientes;
window.abrirModalVerCliente = Clientes.abrirModalVerCliente;
window.cerrarModalVerCliente = Clientes.cerrarModalVerCliente;
window.guardarEdicionCliente = Clientes.guardarEdicionCliente;
window.confirmarEliminarCliente = Clientes.confirmarEliminarCliente;
window.confirmarEliminarClienteDesdeModal = Clientes.confirmarEliminarClienteDesdeModal;
window.restaurarCliente = Clientes.restaurarCliente;
window.consultarDecolecta = Clientes.consultarDecolecta;
window.cargarClientes = Clientes.cargarClientes; // ✅ AGREGADO: Para el checkbox de eliminados

// ✅ Exponer módulo completo para funciones auxiliares
window.Clientes = Clientes;

// Módulo de Equipos
window.abrirModalNuevoEquipo = Equipos.abrirModalNuevoEquipo;
window.cerrarModalNuevoEquipo = Equipos.cerrarModalNuevoEquipo;
window.guardarEquipo = Equipos.guardarEquipo;
window.cargarEquipos = Equipos.cargarEquipos;
window.filtrarEquipos = Equipos.filtrarEquipos;
window.abrirModalEditarEquipo = Equipos.abrirModalEditarEquipo;
window.cerrarModalEditarEquipo = Equipos.cerrarModalEditarEquipo;
window.guardarCambiosEquipo = Equipos.guardarCambiosEquipo;
window.confirmarEliminarEquipo = Equipos.confirmarEliminarEquipo;
window.restaurarEquipo = Equipos.restaurarEquipo;
window.actualizarIconoNuevo = Equipos.actualizarIconoNuevo;
window.actualizarIconoEditar = Equipos.actualizarIconoEditar;

// ✅ Exponer módulo completo
window.Equipos = Equipos;

// Módulo de Servicios
window.abrirModalNuevoServicio = Servicios.abrirModalNuevoServicio;
window.cerrarModalNuevoServicio = Servicios.cerrarModalNuevoServicio;
window.guardarServicio = Servicios.guardarServicio;
window.cargarServicios = Servicios.cargarServicios;
window.buscarServiciosConDebounce = Servicios.buscarServiciosConDebounce;
window.confirmarGuardarServicio = Servicios.confirmarGuardarServicio;
window.cerrarModalResumen = Servicios.cerrarModalResumen;

// ✅ Exponer módulo completo
window.Servicios = Servicios;

// Módulo de Diagnóstico
window.abrirModalDiagnostico = Diagnostico.abrirModalDiagnostico;
window.cerrarModalDiagnostico = Diagnostico.cerrarModalDiagnostico;
window.agregarProblemaFila = Diagnostico.agregarProblemaFila;
window.eliminarProblemaFila = Diagnostico.eliminarProblemaFila;
window.calcularMontoTotal = Diagnostico.calcularMontoTotal;
window.guardarProcesoDiagnostico = Diagnostico.guardarProcesoDiagnostico;
window.finalizarDiagnostico = Diagnostico.finalizarDiagnostico;

// ✅ Exponer módulo completo
window.Diagnostico = Diagnostico;

// Módulo de Usuarios
window.abrirModalNuevoUsuario = Usuarios.abrirModalNuevoUsuario;
window.cerrarModalNuevoUsuario = Usuarios.cerrarModalNuevoUsuario;
window.guardarNuevoUsuario = Usuarios.guardarNuevoUsuario;
window.cargarUsuarios = Usuarios.cargarUsuarios;
window.eliminarUsuario = Usuarios.eliminarUsuario;
window.abrirModalEditarUsuario = Usuarios.abrirModalEditarUsuario;
window.cerrarModalEditarUsuario = Usuarios.cerrarModalEditarUsuario;
window.guardarEdicionUsuario = Usuarios.guardarEdicionUsuario;

// ✅ Exponer módulo completo
window.Usuarios = Usuarios;

// Módulo de Cancelación
window.abrirModalCancelarServicio = Cancelacion.abrirModalCancelarServicio;
window.cerrarModalCancelarServicio = Cancelacion.cerrarModalCancelarServicio;
window.confirmarCancelacionServicio = Cancelacion.confirmarCancelacionServicio;

// ✅ Exponer módulo completo
window.Cancelacion = Cancelacion;

// Módulo de Estado (cambio de estado, detalles, ver diagnóstico)
window.abrirModalCambiarEstado = Estado.abrirModalCambiarEstado;
window.cambiarEstadoServicio = Estado.cambiarEstadoServicio;
window.verDiagnostico = Estado.verDiagnostico;
window.abrirModalDetallesServicio = Estado.abrirModalDetallesServicio;
window.obtenerEstadosPermitidos = Estado.obtenerEstadosPermitidos;

// ✅ Exponer módulo completo
window.Estado = Estado;

// Funciones auxiliares (helpers)
window.agregarProblemaAtajo = Helpers.agregarProblemaAtajo;
window.abrirModalSeleccionarCliente = Helpers.abrirModalSeleccionarCliente;
window.cerrarModalSeleccionarCliente = Helpers.cerrarModalSeleccionarCliente;
window.buscarClientePorDNI = Helpers.buscarClientePorDNI;
window.seleccionarClienteExistente = Helpers.seleccionarClienteExistente;
window.abrirModalSeleccionarEquipo = Helpers.abrirModalSeleccionarEquipo;
window.cerrarModalSeleccionarEquipo = Helpers.cerrarModalSeleccionarEquipo;
window.buscarEquiposPorCliente = Helpers.buscarEquiposPorCliente;
window.seleccionarEquipo = Helpers.seleccionarEquipo;

console.log('📦 Módulos cargados:', {
    clientes: '✅',
    equipos: '✅',
    servicios: '✅',
    diagnostico: '✅',
    usuarios: '✅',
    cancelacion: '✅',
    estado: '✅',
    helpers: '✅'
});

console.log('🎉 Sistema 100% migrado y funcional');
