// ==================== INICIALIZADOR PRINCIPAL ====================

import { verificarSesion, cerrarSesion, configurarPermisos, actualizarNombreUsuarioUI } from './auth.js';
import { 
    switchTab as switchTabUI, 
    toggleMenu,
    toggleTheme,
    loadTheme,
    updateMenuToggleVisibility,
    mostrarModalCarga,
    cerrarModalCarga,
    mostrarNotificacionExito,
    mostrarModalNotificacion,
    cerrarModalNotificacion,
    cerrarModalConfirmacion
} from './ui.js';
import * as Clientes from './modules/clientes.js';
import * as Equipos from './modules/equipos.js';
import * as Servicios from './modules/servicios.js';
import * as Diagnostico from './modules/diagnostico.js';
import * as Usuarios from './modules/usuarios.js';
import * as Cancelacion from './modules/cancelacion.js';
import * as Estado from './modules/estado.js';
import * as Pagos from './modules/pagos.js';
import * as Helpers from './helpers.js';

// ==================== FUNCIONES DE NAVEGACIÓN ====================

/**
 * Manejar cambio de tab
 * @param {string} tabName 
 */
function handleSwitchTab(tabName) {
    // Cambiar tab en la UI
    switchTabUI(tabName);
    
    // Cargar datos del nuevo tab
    if (tabName === 'clientes') {
        Clientes.cargarClientes();
    } else if (tabName === 'equipos') {
        Equipos.cargarEquipos();
    } else if (tabName === 'servicios') {
        Servicios.cargarServicios();
    } else if (tabName === 'usuarios') {
        Usuarios.cargarUsuarios();
    } else if (tabName === 'pagos') {
        Pagos.cargarPagos();
    }
}

// ==================== EXPONER FUNCIONES AL SCOPE GLOBAL ====================
// IMPORTANTE: Exponer ANTES del DOMContentLoaded para que estén disponibles en onclick

window.switchTab = handleSwitchTab;
window.toggleMenu = toggleMenu;
window.toggleTheme = toggleTheme;
window.cerrarSesion = cerrarSesion;
window.mostrarModalCarga = mostrarModalCarga;
window.cerrarModalCarga = cerrarModalCarga;
window.mostrarNotificacionExito = mostrarNotificacionExito;
window.mostrarModalNotificacion = mostrarModalNotificacion;
window.cerrarModalNotificacion = cerrarModalNotificacion;
window.cerrarModal = cerrarModalConfirmacion; // Para el modal de confirmación genérico

// Marcar que el módulo se cargó
window._moduleLoaded = true;

console.log('✅ Funciones globales expuestas:', {
    switchTab: typeof window.switchTab,
    toggleMenu: typeof window.toggleMenu,
    cerrarSesion: typeof window.cerrarSesion
});

// Verificar sesión al cargar (solo si no estamos en index.html)
if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
    if (!verificarSesion()) {
        // verificarSesion ya redirige, pero por si acaso detenemos aquí
        throw new Error('No autenticado');
    }
}

// Bloquear regreso por caché del navegador (bfcache)
window.addEventListener('pageshow', function(event) {
    if (event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') {
        if (!localStorage.getItem('token')) {
            window.location.replace('index.html');
        }
    }
});

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

        // 6. Mostrar el body ahora que la auth está confirmada
        document.body.style.visibility = 'visible';
        
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar aplicación:', error);
    }
}

/**
 * Configurar elementos de UI
 */
function configurarUI() {
    // Cargar tema guardado
    loadTheme();
    
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
                'modalImagenCompleta',
                'modalRegistrarPago',
                'modalHistorialCliente'
            ];
            
            modales.forEach(modalId => {
                if (event.target.id === modalId) {
                    event.target.classList.remove('show');
                }
            });
        }
    });
    
    // Agregar event listener al botón de buscar equipo como respaldo
    const btnBuscarEquipo = document.getElementById('btnBuscarEquipo');
    if (btnBuscarEquipo) {
        btnBuscarEquipo.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🔘 Click en btnBuscarEquipo detectado');
            if (window.abrirModalSeleccionarEquipo) {
                window.abrirModalSeleccionarEquipo();
            } else {
                console.error('❌ window.abrirModalSeleccionarEquipo no está definida');
                alert('Error: La función no está disponible. Por favor recarga la página.');
            }
        });
        console.log('✅ Event listener agregado a btnBuscarEquipo');
    } else {
        console.warn('⚠️ btnBuscarEquipo no encontrado en el DOM');
    }
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
    } else if (tabActivo.id === 'pagosTab') {
        Pagos.cargarPagos();
    }
}

// ==================== EXPONER FUNCIONES DE MÓDULOS AL SCOPE GLOBAL ====================

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
window.cargarClientes = Clientes.cargarClientes;
window.actualizarSelectsClientes = Clientes.actualizarSelectsClientes;
window.renderTablaClientesGlobal = () => Clientes.renderTablaClientes(window.Clientes.clientesCache || []);

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
window.renderTablaEquiposGlobal = () => Equipos.renderTablaEquipos(window.Equipos.equiposCache || []);

// ✅ Exponer módulo completo
window.Equipos = Equipos;

// Módulo de Servicios
window.abrirModalNuevoServicio = Servicios.abrirModalNuevoServicio;
window.cerrarModalNuevoServicio = Servicios.cerrarModalNuevoServicio;
window.guardarServicio = Servicios.guardarServicio;
window.cargarServicios = Servicios.cargarServicios;
window.filtrarServicios = Servicios.filtrarServicios;
window.buscarServiciosConDebounce = Servicios.buscarServiciosConDebounce;
window.confirmarGuardarServicio = Servicios.confirmarGuardarServicio;
window.cerrarModalResumen = Servicios.cerrarModalResumen;
window.previsualizarFotoEquipo = Servicios.previsualizarFotoEquipo;
window.eliminarFotoEquipo = Servicios.eliminarFotoEquipo;
window.abrirCamaraEquipo = Servicios.abrirCamaraEquipo;
window.cerrarCamaraEquipo = Servicios.cerrarCamaraEquipo;
window.capturarFotoEquipo = Servicios.capturarFotoEquipo;
window.limpiarTodasLasFotos = Servicios.limpiarTodasLasFotos;
window.verFotoCompleta = Servicios.verFotoCompleta;
window.cerrarFotoCompleta = Servicios.cerrarFotoCompleta;

// ✅ Exponer módulo completo
window.Servicios = Servicios;

// Módulo de Diagnóstico
window.abrirModalDiagnostico = Diagnostico.abrirModalDiagnostico;
window.cerrarModalDiagnostico = Diagnostico.cerrarModalDiagnostico;
window.cerrarConfirmacionDiagnostico = Diagnostico.cerrarConfirmacionDiagnostico;
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
window.toggleEstadoUsuario = Usuarios.toggleEstadoUsuario; // ✅ NUEVO
window.handleToggleUsuario = Usuarios.handleToggleUsuario; // ✅ NUEVO - Maneja el click del toggle
window.cerrarModalConfirmacionEstado = Usuarios.cerrarModalConfirmacionEstado; // ✅ NUEVO

// ✅ Exponer módulo completo
window.Usuarios = Usuarios;

// Módulo de Cancelación
window.abrirModalCancelarServicio = Cancelacion.abrirModalCancelarServicio;
window.cerrarModalCancelarServicio = Cancelacion.cerrarModalCancelarServicio;
window.confirmarCancelacionServicio = Cancelacion.confirmarCancelacionServicio;

// ✅ Exponer módulo completo
window.Cancelacion = Cancelacion;

// Módulo de Estado (cambio de estado, ver diagnóstico)
window.abrirModalCambiarEstado = Estado.abrirModalCambiarEstado;
window.cerrarModalCambiarEstado = Estado.cerrarModalCambiarEstado;
window.abrirModalCambiarEstado = Estado.abrirModalCambiarEstado;
window.cerrarModalCambiarEstado = Estado.cerrarModalCambiarEstado;
window.confirmarCambioEstado = Estado.confirmarCambioEstado;
window.abrirModalConfirmarReparacion = Estado.abrirModalConfirmarReparacion;
window.cerrarModalConfirmarReparacion = Estado.cerrarModalConfirmarReparacion;
window.verificarTodosReparados = Estado.verificarTodosReparados;
window.confirmarReparacionCompleta = Estado.confirmarReparacionCompleta;
window.abrirModalIniciarReparacion = Estado.abrirModalIniciarReparacion;
window.cerrarModalIniciarReparacion = Estado.cerrarModalIniciarReparacion;
window.confirmarInicioReparacion = Estado.confirmarInicioReparacion;
window.abrirModalConfirmarReparacion = Estado.abrirModalConfirmarReparacion;
window.abrirModalEntrega = Estado.abrirModalEntrega;
window.cerrarModalEntrega = Estado.cerrarModalEntrega;
window.cambiarEstadoServicio = Estado.cambiarEstadoServicio;
window.verDiagnostico = Estado.verDiagnostico;
window.obtenerEstadosPermitidos = Estado.obtenerEstadosPermitidos;
window.abrirModalDetallesServicio = Estado.abrirModalDetallesServicio;
window.cerrarModalDetallesServicio = Estado.cerrarModalDetallesServicio;
window.verFotoCompletaModal = Estado.verFotoCompletaModal;
window.cerrarFotoCompletaModal = Estado.cerrarFotoCompletaModal;
window.verFotoEntregaModal = Estado.verFotoEntregaModal;
window.agregarFotoEntrega = Estado.agregarFotoEntrega;
window.abrirCamaraEntrega = Estado.abrirCamaraEntrega;
window.cerrarCamaraEntrega = Estado.cerrarCamaraEntrega;
window.capturarFotoEntrega = Estado.capturarFotoEntrega;
window.eliminarFotoEntrega = Estado.eliminarFotoEntrega;
window.limpiarFotosEntrega = Estado.limpiarFotosEntrega;
window.actualizarContadorFotosEntrega = Estado.actualizarContadorFotosEntrega;
window.abrirImagenCompletaEntrega = Estado.abrirImagenCompletaEntrega;
window.cerrarImagenCompletaEntrega = Estado.cerrarImagenCompletaEntrega;
window.confirmarEntregaServicio = Estado.confirmarEntregaServicio;
window.recalcularSaldoEntrega = Estado.recalcularSaldoEntrega;
window.actualizarIndicadorDeuda = Estado.actualizarIndicadorDeuda;

// ✅ Exponer módulo completo
window.Estado = Estado;

// Módulo de Pagos
window.cargarPagos = Pagos.cargarPagos;
window.filtrarPorEstadoPago = Pagos.filtrarPorEstadoPago;
window.buscarClientePago = Pagos.buscarClientePago;
window.abrirModalRegistrarPago = Pagos.abrirModalRegistrarPago;
window.cerrarModalRegistrarPago = Pagos.cerrarModalRegistrarPago;
window.guardarPago = Pagos.guardarPago;
window.validarMontoPago = Pagos.validarMontoPago;
window.verHistorialCliente = Pagos.verHistorialCliente;
window.cerrarModalHistorialCliente = Pagos.cerrarModalHistorialCliente;
window.verHistorialPagosServicio = Pagos.verHistorialPagosServicio;
window.cerrarModalHistorialPagosServicio = Pagos.cerrarModalHistorialPagosServicio;

// Funciones auxiliares (helpers)
window.agregarProblemaAtajo = Helpers.agregarProblemaAtajo;
window.abrirModalSeleccionarCliente = Helpers.abrirModalSeleccionarCliente;
window.cerrarModalSeleccionarCliente = Helpers.cerrarModalSeleccionarCliente;
window.buscarClientePorDNI = Helpers.buscarClientePorDNI;
window.buscarClientesPorDNI = Helpers.buscarClientesPorDNI; // ✅ Función con autocompletado para servicios
window.seleccionarClienteExistente = Helpers.seleccionarClienteExistente;
window.seleccionarClienteServicio = Helpers.seleccionarClienteServicio; // ✅ Migrado desde app.js
window.confirmarClienteConTelefono = Helpers.confirmarClienteConTelefono; // ✅ Migrado desde app.js
window.limpiarSeleccionClienteServicio = Helpers.limpiarSeleccionClienteServicio; // ✅ Migrado desde app.js
window.abrirModalSeleccionarEquipo = Helpers.abrirModalSeleccionarEquipo;
window.cerrarModalSeleccionarEquipo = Helpers.cerrarModalSeleccionarEquipo;
window.buscarEquiposPorCliente = Helpers.buscarEquiposPorCliente;
window.seleccionarEquipo = Helpers.seleccionarEquipo;
window.abrirModalSeleccionarClienteEquipo = Helpers.abrirModalSeleccionarClienteEquipo;
window.cerrarModalSeleccionarClienteEquipo = Helpers.cerrarModalSeleccionarClienteEquipo;
window.buscarClientesPorDNIEquipo = Helpers.buscarClientesPorDNIEquipo;
window.seleccionarClienteEquipo = Helpers.seleccionarClienteEquipo;
window.abrirModalSeleccionarClienteEquipoEditar = Helpers.abrirModalSeleccionarClienteEquipoEditar;
window.abrirFormularioNuevoEquipoModal = Helpers.abrirFormularioNuevoEquipoModal;
window.consultarReniecServicio = Helpers.consultarReniecServicio;
window.agregarClienteDesdeReniecServicio = Helpers.agregarClienteDesdeReniecServicio;

console.log('📦 Módulos cargados:', {
    clientes: '✅',
    equipos: '✅',
    servicios: '✅',
    diagnostico: '✅',
    usuarios: '✅',
    cancelacion: '✅',
    estado: '✅',
    pagos: '✅',
    helpers: '✅'
});

console.log('🎉 Sistema 100% migrado y funcional');


// ==================== EASTER EGG: ACTIVAR TEMA OSCURO ====================

/**
 * Easter egg: Hacer clic 8 veces en el área de usuario para activar el botón de tema
 * El botón se oculta nuevamente al cerrar sesión o recargar la página
 */
let clicksEnUsuario = 0;
let timerResetClicks = null;

document.addEventListener('DOMContentLoaded', function() {
    const userInfo = document.querySelector('.user-info');
    const themeToggle = document.getElementById('themeToggle');
    
    if (userInfo && themeToggle) {
        // Hacer el área de usuario clickeable
        userInfo.style.cursor = 'pointer';
        
        userInfo.addEventListener('click', function() {
            clicksEnUsuario++;
            
            // Resetear contador después de 3 segundos de inactividad
            clearTimeout(timerResetClicks);
            timerResetClicks = setTimeout(() => {
                clicksEnUsuario = 0;
            }, 3000);
            
            // Feedback visual sutil
            userInfo.style.transform = 'scale(0.98)';
            setTimeout(() => {
                userInfo.style.transform = 'scale(1)';
            }, 100);
            
            // Si llega a 8 clics, activar el botón de tema
            if (clicksEnUsuario === 8) {
                themeToggle.style.display = 'flex';
                clicksEnUsuario = 0;
                
                // Animación de aparición
                themeToggle.style.opacity = '0';
                themeToggle.style.transform = 'scale(0.5)';
                setTimeout(() => {
                    themeToggle.style.transition = 'all 0.3s ease';
                    themeToggle.style.opacity = '1';
                    themeToggle.style.transform = 'scale(1)';
                }, 10);
                
                // Notificación sutil
                console.log('🌙 ¡Easter egg activado! Botón de tema desbloqueado');
            }
        });
    }
});
