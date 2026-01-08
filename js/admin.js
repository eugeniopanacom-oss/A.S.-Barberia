// admin.js - Módulo de administración para Barbería PWA
// ==============================
// 0. CORRECCIÓN DE VARIABLES GLOBALES
// ==============================

// FIX: Corregir URL si tiene espacio después de "https:"
let rawGAS_URL = window.GAS_URL || '';
let rawSUPA_KEY = window.SUPA_KEY || '';

// Debug: mostrar qué encontramos
console.log('🔍 Admin.js - Variables detectadas:', {
    'window.GAS_URL': rawGAS_URL ? `"${rawGAS_URL.substring(0, 50)}..."` : 'NO DEFINIDA',
    'window.SUPA_KEY': rawSUPA_KEY ? '***DEFINIDA***' : 'NO DEFINIDA'
});

// Limpiar URL si tiene espacios incorrectos
if (rawGAS_URL && rawGAS_URL.includes('https: //')) {
    console.warn('⚠️ URL tiene espacio, corrigiendo...');
    rawGAS_URL = rawGAS_URL.replace('https: //', 'https://');
}

// También limpiar otros posibles espacios
rawGAS_URL = rawGAS_URL.replace(/\s+/g, '');

// Definir variables finales con fallback
const ADMIN_GAS_URL = rawGAS_URL || 'https://athjkugyucogikjlwxbz.supabase.co/rest/v1';
const ADMIN_SUPA_KEY = rawSUPA_KEY || 'sb_publishable_JE1Toit6Fr-BPDtCbRrlpA_Tr94QgAv';

console.log('🔧 Admin.js - URLs finales:', {
    'ADMIN_GAS_URL': ADMIN_GAS_URL,
    'ADMIN_SUPA_KEY': ADMIN_SUPA_KEY ? '✅ DEFINIDA' : '❌ NO DEFINIDA'
});

// ==============================
// 0.5. VARIABLE GLOBAL PARA LA TABLA (AJUSTAR SEGÚN TU BASE DE DATOS)
// ==============================
const TABLA_TURNOS = 'bookings'; // ⚠️ CAMBIA ESTO SI TU TABLA SE LLAMA DE OTRA FORMA
console.log(`📊 Usando tabla de turnos: "${TABLA_TURNOS}"`);

// ==============================
// 1. ELEMENTOS DEL DOM (RENOMBRADO PARA EVITAR CONFLICTO)
// ==============================
const ADMIN_DOM = {
    get loadBtn() { return document.getElementById('loadMetrics'); },
    get metricsDiv() { return document.getElementById('metrics'); },
    get todayList() { return document.getElementById('todayList'); },
    get offerForm() { return document.getElementById('offerForm'); },
    get priceForm() { return document.getElementById('priceForm'); },
    get markOldBtn() { return document.getElementById('markOldBookingsBtn'); },
    get viewOffersBtn() { return document.getElementById('viewOffersBtn'); },
    get refreshBtn() { return document.getElementById('refreshDataBtn'); },
    get toolsOutput() { return document.getElementById('toolsOutput'); },
    get toolsStatus() { return document.getElementById('toolsStatus'); },
    get toolsContent() { return document.getElementById('toolsContent'); },
    get refreshTodayBtn() { return document.getElementById('refreshTodayBtn'); },
    get exportTodayBtn() { return document.getElementById('exportTodayBtn'); },
    get filterAllBtn() { return document.getElementById('filter-all'); },
    get filterPendingBtn() { return document.getElementById('filter-pending'); },
    get filterCompletedBtn() { return document.getElementById('filter-completed'); },
    get turnosCounter() { return document.getElementById('turnosHoyCounter'); },
    get fechaActual() { return document.getElementById('fecha-actual'); },
    
    adminToolsContainer: null,
    
    /**
     * Verificar existencia de elementos principales
     */
    checkElements: function() {
        const elements = [
            { name: 'loadBtn', element: this.loadBtn },
            { name: 'markOldBtn', element: this.markOldBtn },
            { name: 'viewOffersBtn', element: this.viewOffersBtn },
            { name: 'refreshBtn', element: this.refreshBtn }
        ];
        
        const missing = elements.filter(item => !item.element).map(item => item.name);
        
        if (missing.length > 0) {
            console.warn('⚠️ Elementos no encontrados:', missing);
        } else {
            console.log('✅ Todos los elementos críticos encontrados');
        }
        
        return missing.length === 0;
    },
    
    /**
     * Crear/verificar sección de herramientas administrativas
     */
    createAdminToolsSection: function() {
        const existingContainer = document.getElementById('adminTools');
        if (existingContainer) {
            this.adminToolsContainer = existingContainer;
            console.log('✅ Contenedor de herramientas encontrado en HTML');
            return true;
        }
        
        console.warn('⚠️ Contenedor de herramientas no encontrado en HTML');
        return false;
    }
};

// ==============================
// 1.5. MÓDULO DE GESTIÓN DE TURNOS DEL DÍA (NUEVO)
// ==============================
const TurnosDiaModule = {
    filtroActual: 'all',
    
    /**
     * Carga los turnos del día actual
     */
    cargarTurnosHoy: async function() {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            console.log(`📅 Cargando turnos del día ${hoy}...`);
            
            const response = await fetch(
                `${ADMIN_GAS_URL}/${TABLA_TURNOS}?date=eq.${hoy}&select=*&order=time.asc`,
                { headers: { apikey: ADMIN_SUPA_KEY } }
            );
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar turnos`);
            }
            
            const turnos = await response.json();
            console.log(`✅ ${turnos.length} turnos cargados para hoy`);
            
            this.mostrarTurnosHoy(turnos);
            this.actualizarContadores(turnos);
            this.actualizarFechaActual();
            
            return turnos;
            
        } catch (error) {
            console.error('❌ Error cargando turnos:', error);
            this.mostrarError('Error cargando turnos. Intenta de nuevo.');
            throw error;
        }
    },
    
    /**
     * Muestra los turnos en el HTML
     */
    mostrarTurnosHoy: function(turnos) {
        const container = ADMIN_DOM.todayList;
        if (!container) {
            console.warn('⚠️ Contenedor todayList no encontrado');
            return;
        }
        
        if (!turnos || turnos.length === 0) {
            container.innerHTML = `
                <div class="sin-turnos" style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                    font-style: italic;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 20px 0;
                ">
                    <p style="font-size: 18px; margin-bottom: 10px;">🎉 No hay turnos programados para hoy</p>
                    <p>Puedes tomar un descanso ☕</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        turnos.forEach(turno => {
            const estaCompletado = turno.completed === true;
            const badge = estaCompletado 
                ? '<span style="background: #d4edda; color: #155724; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">✅ Completado</span>' 
                : '<span style="background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">⏳ Pendiente</span>';
            
            const hora = turno.time || 'Sin hora';
            const precio = turno.price ? `$${turno.price}` : 'Consultar';
            const estadoGeneral = turno.status || 'pending';
            
            html += `
                <div class="turno-card" id="turno-${turno.id}" data-status="${estaCompletado ? 'completed' : 'pending'}" style="
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 10px 0;
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: all 0.3s;
                    ${estaCompletado ? 'opacity: 0.7; background: #f8f9fa;' : ''}
                ">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: bold; color: #333; font-size: 18px;">⏰ ${hora}</div>
                            <h4 style="margin: 5px 0 0 0; color: #2c3e50;">${turno.name || 'Cliente sin nombre'}</h4>
                        </div>
                        ${badge}
                    </div>
                    
                    <div style="color: #555; font-size: 14px; margin: 5px 0;">
                        <div><strong>📌 Servicio:</strong> ${turno.service || 'No especificado'}</div>
                        <div><strong>💰 Precio:</strong> ${precio}</div>
                        <div><strong>✉️ Email:</strong> ${turno.email || 'No proporcionado'}</div>
                        ${estadoGeneral !== 'pending' ? `<div><strong>📝 Estado:</strong> ${estadoGeneral}</div>` : ''}
                    </div>
                    
                    ${!estaCompletado ? `
                        <div style="margin-top: 15px; text-align: right;">
                            <button onclick="TurnosDiaModule.marcarComoCompletado(${turno.id})" style="
                                background: #10b981;
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: 500;
                                font-size: 14px;
                                transition: background 0.3s;
                            ">
                                ✅ Marcar como hecho
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Aplicar filtro actual
        this.aplicarFiltro();
    },
    
    /**
     * Actualiza los contadores de turnos
     */
    actualizarContadores: function(turnos) {
        const total = turnos.length;
        const completados = turnos.filter(t => t.completed === true).length;
        const pendientes = total - completados;
        
        if (ADMIN_DOM.turnosCounter) {
            ADMIN_DOM.turnosCounter.innerHTML = `
                <span id="turnos-total">${total} turnos total</span> | 
                <span style="color: #10b981;">✅ <span id="turnos-completados">${completados}</span> completados</span> | 
                <span style="color: #f59e0b;">⏳ <span id="turnos-pendientes">${pendientes}</span> pendientes</span>
            `;
        }
    },
    
    /**
     * Actualiza la fecha actual en el panel
     */
    actualizarFechaActual: function() {
        if (ADMIN_DOM.fechaActual) {
            const fecha = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            ADMIN_DOM.fechaActual.textContent = fecha;
        }
    },
    
    /**
     * Marca un turno como completado
     */
    marcarComoCompletado: async function(turnoId) {
        if (!confirm('¿Marcar este turno como completado?\n\nEsta acción no se puede deshacer.')) return;
        
        try {
            const { error } = await supabase
                .from(TABLA_TURNOS)
                .update({ completed: true })
                .eq('id', turnoId);

            if (error) throw error;
            
            // Actualizar la vista
            const turnoElement = document.getElementById(`turno-${turnoId}`);
            if (turnoElement) {
                // Cambiar el badge
                const badgeHtml = '<span style="background: #d4edda; color: #155724; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">✅ Completado</span>';
                const headerDiv = turnoElement.querySelector('div[style*="display: flex; justify-content: space-between"]');
                if (headerDiv && headerDiv.children.length > 1) {
                    headerDiv.children[1].outerHTML = badgeHtml;
                }
                
                // Remover el botón
                const buttonElement = turnoElement.querySelector('button');
                if (buttonElement) {
                    buttonElement.remove();
                }
                
                // Agregar estilo de completado
                turnoElement.style.opacity = '0.7';
                turnoElement.style.background = '#f8f9fa';
                turnoElement.setAttribute('data-status', 'completed');
                
                // Actualizar contadores y lista
                setTimeout(() => {
                    this.cargarTurnosHoy();
                }, 300);
            }
            
            // Mostrar notificación
            this.mostrarNotificacion('✅ Turno marcado como completado', 'success');
            
            // Actualizar también las métricas generales
            if (typeof MetricsModule.loadTodayMetrics === 'function') {
                setTimeout(() => MetricsModule.loadTodayMetrics(), 500);
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarNotificacion('❌ Error al marcar el turno', 'error');
        }
    },
    
    /**
     * Muestra una notificación
     */
    mostrarNotificacion: function(mensaje, tipo = 'success') {
        // Si ya existe una notificación, quitarla
        const notificacionExistente = document.querySelector('.notificacion-flotante');
        if (notificacionExistente) {
            notificacionExistente.remove();
        }
        
        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion-flotante';
        notificacion.textContent = mensaje;
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
    },
    
    /**
     * Aplica el filtro actual a los turnos
     */
    aplicarFiltro: function() {
        const turnos = document.querySelectorAll('.turno-card');
        turnos.forEach(turno => {
            const status = turno.getAttribute('data-status');
            
            switch (this.filtroActual) {
                case 'all':
                    turno.style.display = 'block';
                    break;
                case 'pending':
                    turno.style.display = status === 'pending' ? 'block' : 'none';
                    break;
                case 'completed':
                    turno.style.display = status === 'completed' ? 'block' : 'none';
                    break;
            }
        });
        
        // Actualizar botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`filter-${this.filtroActual}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    },
    
    /**
     * Cambia el filtro actual
     */
    cambiarFiltro: function(nuevoFiltro) {
        this.filtroActual = nuevoFiltro;
        this.aplicarFiltro();
    },
    
    /**
     * Exporta los turnos del día a CSV
     */
    exportarACSV: async function() {
        try {
            const turnos = await this.cargarTurnosHoy();
            
            if (turnos.length === 0) {
                this.mostrarNotificacion('📭 No hay turnos para exportar', 'info');
                return;
            }
            
            // Crear contenido CSV
            let csv = 'Hora,Nombre,Servicio,Precio,Email,Estado\n';
            
            turnos.forEach(turno => {
                const estado = turno.completed ? 'Completado' : 'Pendiente';
                const hora = turno.time || '';
                const nombre = turno.name || '';
                const servicio = turno.service || '';
                const precio = turno.price || '';
                const email = turno.email || '';
                
                csv += `"${hora}","${nombre}","${servicio}","${precio}","${email}","${estado}"\n`;
            });
            
            // Descargar archivo
            const hoy = new Date().toISOString().split('T')[0];
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `turnos-${hoy}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.mostrarNotificacion('📊 Turnos exportados correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error exportando:', error);
            this.mostrarNotificacion('❌ Error al exportar', 'error');
        }
    },
    
    /**
     * Configura los eventos para este módulo
     */
    configurarEventos: function() {
        // Botón de actualizar
        if (ADMIN_DOM.refreshTodayBtn) {
            ADMIN_DOM.refreshTodayBtn.addEventListener('click', () => this.cargarTurnosHoy());
        }
        
        // Botón de exportar
        if (ADMIN_DOM.exportTodayBtn) {
            ADMIN_DOM.exportTodayBtn.addEventListener('click', () => this.exportarACSV());
        }
        
        // Botones de filtro
        if (ADMIN_DOM.filterAllBtn) {
            ADMIN_DOM.filterAllBtn.addEventListener('click', () => this.cambiarFiltro('all'));
        }
        
        if (ADMIN_DOM.filterPendingBtn) {
            ADMIN_DOM.filterPendingBtn.addEventListener('click', () => this.cambiarFiltro('pending'));
        }
        
        if (ADMIN_DOM.filterCompletedBtn) {
            ADMIN_DOM.filterCompletedBtn.addEventListener('click', () => this.cambiarFiltro('completed'));
        }
        
        // También usar el botón "Actualizar Todo"
        if (ADMIN_DOM.refreshBtn) {
            const originalRefresh = ADMIN_DOM.refreshBtn.onclick;
            ADMIN_DOM.refreshBtn.onclick = () => {
                if (originalRefresh) originalRefresh();
                this.cargarTurnosHoy();
            };
        }
    },
    
    /**
     * Inicializa el módulo
     */
    inicializar: function() {
        console.log('🔄 Inicializando módulo de turnos del día...');
        
        // Configurar eventos
        this.configurarEventos();
        
        // Agregar estilos CSS dinámicamente si no existen
        if (!document.querySelector('style#turnos-dia-styles')) {
            const style = document.createElement('style');
            style.id = 'turnos-dia-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .filter-btn {
                    opacity: 0.7;
                    transition: opacity 0.3s;
                }
                .filter-btn.active {
                    opacity: 1;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
                }
                .turno-card:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('✅ Módulo de turnos del día inicializado');
    },
    
    /**
     * Muestra un error en el contenedor
     */
    mostrarError: function(mensaje) {
        const container = ADMIN_DOM.todayList;
        if (container) {
            container.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 30px;
                    color: #dc3545;
                    background: #f8d7da;
                    border-radius: 8px;
                    margin: 20px 0;
                ">
                    <p style="font-weight: bold;">❌ ${mensaje}</p>
                    <button onclick="TurnosDiaModule.cargarTurnosHoy()" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
};

// ==============================
// 2. MÓDULO DE HERRAMIENTAS ADMINISTRATIVAS
// ==============================
const AdminToolsModule = {
    /**
     * Marca turnos pasados como completados
     */
    markOldBookings: async function() {
        const output = ADMIN_DOM.toolsOutput;
        const statusDiv = ADMIN_DOM.toolsStatus;
        const contentDiv = ADMIN_DOM.toolsContent;
        
        if (!output || !statusDiv) {
            console.error('❌ Elementos de salida no encontrados');
            return;
        }
        
        // Mostrar estado
        output.style.display = 'block';
        statusDiv.innerHTML = '<div style="color: #17a2b8;">📝 Buscando turnos pasados pendientes...</div>';
        contentDiv.innerHTML = '';
        
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Obtener turnos pasados pendientes
            console.log('📡 Consultando turnos pasados...');
            const response = await fetch(
                `${ADMIN_GAS_URL}/${TABLA_TURNOS}?date=lt.${today}&status=eq.pending&select=id,date,name,time,service`,
                { headers: { apikey: ADMIN_SUPA_KEY } }
            );
            
            console.log('📊 Estado respuesta:', response.status);
            
            if (!response.ok) throw new Error(`Error ${response.status} al buscar turnos`);
            
            const oldBookings = await response.json();
            console.log(`📊 ${oldBookings.length} turnos pasados encontrados`);
            
            if (oldBookings.length === 0) {
                statusDiv.innerHTML = '<div style="color: #28a745;">✅ No hay turnos pasados pendientes</div>';
                contentDiv.innerHTML = '';
                return;
            }
            
            // Mostrar lista de turnos encontrados
            let bookingsHTML = `
                <div style="margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 4px;">
                    <strong>Encontrados ${oldBookings.length} turno(s) pasado(s) pendiente(s):</strong>
                </div>
                <div style="max-height: 200px; overflow-y: auto; margin: 10px 0;">
            `;
            
            oldBookings.forEach(booking => {
                bookingsHTML += `
                    <div style="
                        padding: 8px;
                        margin: 5px 0;
                        background: #f8f9fa;
                        border-left: 3px solid #ffc107;
                        font-size: 14px;
                    ">
                        <strong>${booking.date} ${booking.time}</strong><br>
                        ${booking.name} - ${booking.service}
                    </div>
                `;
            });
            
            bookingsHTML += '</div>';
            contentDiv.innerHTML = bookingsHTML;
            
            // Preguntar confirmación
            const confirmUpdate = confirm(
                `¿Marcar ${oldBookings.length} turnos pasados como "completados"?\n\n` +
                `Esto mantendrá el historial pero los marcará como finalizados.`
            );
            
            if (!confirmUpdate) {
                statusDiv.innerHTML = '<div style="color: #6c757d;">❌ Operación cancelada</div>';
                return;
            }
            
            // Marcar como completados
            statusDiv.innerHTML = '<div style="color: #17a2b8;">🔄 Actualizando turnos...</div>';
            
            let updatedCount = 0;
            const results = [];
            
            for (const booking of oldBookings) {
                try {
                    const updateResponse = await fetch(`${ADMIN_GAS_URL}/${TABLA_TURNOS}?id=eq.${booking.id}`, {
                        method: 'PATCH',
                        headers: { 
                            apikey: ADMIN_SUPA_KEY,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ status: 'completed' })
                    });
                    
                    if (updateResponse.ok) {
                        updatedCount++;
                        results.push(`✅ ${booking.date} ${booking.time} - ${booking.name}`);
                    } else {
                        results.push(`❌ ${booking.date} ${booking.time} - ERROR ${updateResponse.status}`);
                    }
                    
                } catch (err) {
                    results.push(`❌ ${booking.date} ${booking.time} - ERROR: ${err.message}`);
                }
            }
            
            // Mostrar resultados
            statusDiv.innerHTML = `<div style="color: #28a745;">✅ ${updatedCount}/${oldBookings.length} turnos actualizados</div>`;
            
            let resultsHTML = '<div style="margin-top: 10px; font-size: 13px;">';
            results.forEach(result => {
                resultsHTML += `<div>${result}</div>`;
            });
            resultsHTML += '</div>';
            contentDiv.innerHTML += resultsHTML;
            
            // Actualizar métricas y turnos del día
            setTimeout(() => {
                MetricsModule.loadTodayMetrics();
                TurnosDiaModule.cargarTurnosHoy();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error en markOldBookings:', error);
            statusDiv.innerHTML = `<div style="color: #dc3545;">❌ Error: ${error.message}</div>`;
        }
    },
    
    /**
     * Muestra ofertas existentes
     */
    viewExistingOffers: async function() {
        const output = ADMIN_DOM.toolsOutput;
        const statusDiv = ADMIN_DOM.toolsStatus;
        const contentDiv = ADMIN_DOM.toolsContent;
        
        if (!output || !statusDiv) {
            console.error('❌ Elementos de salida no encontrados');
            return;
        }
        
        // Mostrar estado
        output.style.display = 'block';
        statusDiv.innerHTML = '<div style="color: #17a2b8;">👁️ Cargando ofertas existentes...</div>';
        contentDiv.innerHTML = '';
        
        try {
            console.log('📡 Consultando ofertas...');
            const response = await fetch(`${ADMIN_GAS_URL}/offers?select=*&order=created_at.desc`, {
                headers: { apikey: ADMIN_SUPA_KEY }
            });
            
            console.log('📊 Estado respuesta:', response.status);
            
            if (!response.ok) throw new Error(`Error ${response.status} al cargar ofertas`);
            
            const offers = await response.json();
            console.log(`📊 ${offers.length} ofertas encontradas`);
            
            if (!offers || offers.length === 0) {
                statusDiv.innerHTML = '<div style="color: #6c757d;">📭 No hay ofertas registradas</div>';
                return;
            }
            
            // Mostrar lista de ofertas
            statusDiv.innerHTML = `<div style="color: #28a745;">🎁 ${offers.length} oferta(s) encontrada(s)</div>`;
            
            let offersHTML = '<div style="margin-top: 15px;">';
            
            offers.forEach(offer => {
                const created = new Date(offer.created_at).toLocaleDateString('es-AR');
                const expires = offer.expires_at ? new Date(offer.expires_at).toLocaleString('es-AR') : 'Sin expiración';
                const active = offer.active !== false ? '✅ Activa' : '❌ Inactiva';
                const now = new Date();
                const isExpired = offer.expires_at && new Date(offer.expires_at) < now;
                const expiredBadge = isExpired ? '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px; margin-left: 8px;">Expirada</span>' : '';
                
                offersHTML += `
                    <div style="
                        padding: 12px;
                        margin: 8px 0;
                        background: ${isExpired ? '#f8d7da' : (offer.active === false ? '#f8f9fa' : '#e7f3ff')};
                        border-radius: 6px;
                        border-left: 4px solid ${isExpired ? '#dc3545' : (offer.active === false ? '#6c757d' : '#17a2b8')};
                        font-size: 14px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <strong>${offer.text}</strong>
                                <div style="color: #28a745; font-weight: bold; margin: 5px 0;">
                                    $${offer.price}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 12px; color: #6c757d;">${active} ${expiredBadge}</div>
                            </div>
                        </div>
                        
                        ${offer.description ? `
                            <div style="margin: 8px 0; color: #495057; font-style: italic;">
                                ${offer.description}
                            </div>
                        ` : ''}
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #6c757d;">
                            <div>📅 Creada: ${created}</div>
                            <div>⏰ Expira: ${expires}</div>
                        </div>
                    </div>
                `;
            });
            
            offersHTML += '</div>';
            contentDiv.innerHTML = offersHTML;
            
        } catch (error) {
            console.error('❌ Error cargando ofertas:', error);
            statusDiv.innerHTML = `<div style="color: #dc3545;">❌ Error: ${error.message}</div>`;
        }
    },
    
    /**
     * Configura eventos para las herramientas
     */
    setupEventListeners: function() {
        console.log('🔗 Configurando eventos de herramientas...');
        
        // Botón para marcar turnos pasados
        const markOldBtn = ADMIN_DOM.markOldBtn;
        if (markOldBtn) {
            console.log('✅ Configurando botón markOldBookingsBtn');
            markOldBtn.addEventListener('click', this.markOldBookings.bind(this));
        } else {
            console.error('❌ Botón markOldBookingsBtn no encontrado');
        }
        
        // Botón para ver ofertas existentes
        const viewOffersBtn = ADMIN_DOM.viewOffersBtn;
        if (viewOffersBtn) {
            console.log('✅ Configurando botón viewOffersBtn');
            viewOffersBtn.addEventListener('click', this.viewExistingOffers.bind(this));
        } else {
            console.error('❌ Botón viewOffersBtn no encontrado');
        }
        
        // Botón para actualizar todo
        const refreshBtn = ADMIN_DOM.refreshBtn;
        if (refreshBtn) {
            console.log('✅ Configurando botón refreshDataBtn');
            refreshBtn.addEventListener('click', () => {
                MetricsModule.loadTodayMetrics();
                TurnosDiaModule.cargarTurnosHoy();
                const output = ADMIN_DOM.toolsOutput;
                const statusDiv = ADMIN_DOM.toolsStatus;
                if (output && statusDiv) {
                    output.style.display = 'block';
                    statusDiv.innerHTML = '<div style="color: #28a745;">🔄 Datos actualizados correctamente</div>';
                    setTimeout(() => {
                        output.style.display = 'none';
                    }, 2000);
                }
            });
        } else {
            console.error('❌ Botón refreshDataBtn no encontrado');
        }
        
        console.log('✅ Todos los eventos configurados');
    }
};

// ==============================
// 3. MÓDULO DE OFERTAS
// ==============================
const AdminOffersModule = {
    /**
     * Inicializa el formulario de ofertas
     */
    initForm: function() {
        if (!ADMIN_DOM.offerForm) {
            console.warn('⚠️ Formulario de ofertas no encontrado');
            return;
        }
        
        console.log('✅ Inicializando formulario de ofertas...');
        
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const defaultDate = tomorrow.toISOString().split('T')[0];
        
        ADMIN_DOM.offerForm.innerHTML = `
            <div class="admin-form-section">
                <h3>🎁 Publicar Nueva Oferta</h3>
                
                <div class="form-group">
                    <label for="offerText">Título de la oferta</label>
                    <input type="text" id="offerText" placeholder="Ej: Corte + Barba" required>
                </div>
                
                <div class="form-group">
                    <label for="offerPrice">Precio especial ($)</label>
                    <input type="number" id="offerPrice" placeholder="Precio en pesos" min="0" step="100" required>
                </div>
                
                <div class="form-group">
                    <label for="offerDescription">Descripción (opcional)</label>
                    <textarea id="offerDescription" rows="3" placeholder="Detalles de la oferta..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="offerDuration">Duración estimada (minutos)</label>
                    <input type="number" id="offerDuration" min="15" step="15" value="60">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="offerExpiresDate">📅 Válida hasta</label>
                        <input type="date" id="offerExpiresDate" value="${defaultDate}">
                    </div>
                    <div class="form-group">
                        <label for="offerExpiresTime">⏰ Hora límite</label>
                        <input type="time" id="offerExpiresTime" value="23:59">
                    </div>
                </div>
                
                <button type="submit" class="btn-submit">Publicar Oferta</button>
                
                <div id="offerStatus" class="status-message"></div>
            </div>
        `;
        
        ADMIN_DOM.offerForm.onsubmit = this.handleSubmit.bind(this);
        console.log('✅ Formulario de ofertas inicializado');
    },
    
    /**
     * Maneja el envío del formulario
     */
    handleSubmit: async function(e) {
        e.preventDefault();
        
        const statusDiv = document.getElementById('offerStatus');
        this.showStatus(statusDiv, 'Publicando oferta...', 'loading');
        
        try {
            const offerData = this.getFormData();
            this.validateOfferData(offerData);
            
            await this.saveOffer(offerData);
            
            this.showStatus(statusDiv, '✅ Oferta publicada con cuenta regresiva', 'success');
            this.resetForm();
            
            // Notificar a otras partes de la app
            window.dispatchEvent(new CustomEvent('offersUpdated'));
            
            setTimeout(() => {
                if (statusDiv) statusDiv.style.display = 'none';
            }, 3000);
            
        } catch (err) {
            this.showStatus(statusDiv, `❌ Error: ${err.message}`, 'error');
            console.error('Error en oferta:', err);
        }
    },
    
    /**
     * Obtiene datos del formulario
     */
    getFormData: function() {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };
        
        const expiresDate = getValue('offerExpiresDate');
        const expiresTime = getValue('offerExpiresTime');
        const expiresAt = new Date(`${expiresDate}T${expiresTime}:00`);
        
        return {
            text: getValue('offerText'),
            price: Number(getValue('offerPrice')),
            description: getValue('offerDescription') || null,
            duration_minutes: Number(getValue('offerDuration') || 60),
            expires_at: expiresAt.toISOString(),
            active: true,
            created_at: new Date().toISOString()
        };
    },
    
    /**
     * Valida los datos de la oferta
     */
    validateOfferData: function(data) {
        if (!data.text) throw new Error('El título es requerido');
        if (!data.price || data.price <= 0) throw new Error('Precio inválido');
        if (!data.expires_at) throw new Error('Fecha de expiración requerida');
        
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
            throw new Error('La fecha no puede ser en el pasado');
        }
    },
    
    /**
     * Guarda la oferta en la API
     */
    saveOffer: async function(offerData) {
        console.log('📤 Guardando oferta:', offerData);
        
        const response = await fetch(`${ADMIN_GAS_URL}/offers`, {
            method: 'POST',
            headers: { 
                'apikey': ADMIN_SUPA_KEY, 
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(offerData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Error ${response.status}: ${error}`);
        }
        
        const result = await response.json();
        console.log('✅ Oferta guardada:', result);
        return result;
    },
    
    /**
     * Muestra mensajes de estado
     */
    showStatus: function(element, message, type) {
        if (!element) return;
        
        element.style.display = 'block';
        element.textContent = message;
        
        // Limpiar clases anteriores
        element.className = 'status-message';
        
        // Agregar clase según tipo
        element.classList.add(`status-${type}`);
    },
    
    /**
     * Reinicia el formulario
     */
    resetForm: function() {
        if (ADMIN_DOM.offerForm) {
            ADMIN_DOM.offerForm.reset();
        }
    },
    
    /**
     * Carga ofertas existentes
     */
    viewExisting: async function() {
        try {
            const response = await fetch(
                `${ADMIN_GAS_URL}/offers?select=*&order=created_at.desc`,
                { headers: { apikey: ADMIN_SUPA_KEY } }
            );
            
            if (!response.ok) throw new Error('Error al cargar ofertas');
            return await response.json();
            
        } catch (error) {
            console.error('Error viendo ofertas:', error);
            return [];
        }
    }
};

// ==============================
// 4. MÓDULO DE MÉTRICAS
// ==============================
const MetricsModule = {
    /**
     * Carga las métricas del día actual
     */
    loadTodayMetrics: async function() {
        if (!ADMIN_DOM.metricsDiv) {
            console.warn('⚠️ Div de métricas no encontrado');
            return;
        }
        
        try {
            ADMIN_DOM.metricsDiv.innerHTML = '<div class="loading">Cargando métricas...</div>';
            
            const today = new Date().toISOString().split('T')[0];
            const endpoint = `${ADMIN_GAS_URL}/${TABLA_TURNOS}?date=eq.${today}&select=*,services(name,price)`;
            
            console.log('📡 Consultando métricas para:', today);
            const response = await fetch(endpoint, {
                headers: { apikey: ADMIN_SUPA_KEY }
            });
            
            console.log('📊 Estado respuesta métricas:', response.status);
            
            if (!response.ok) throw new Error(`Error ${response.status} al cargar métricas`);
            
            const bookings = await response.json();
            console.log(`📊 ${bookings.length} turnos encontrados para hoy`);
            
            this.displayMetrics(bookings);
            // No mostramos la lista aquí porque ahora lo hace TurnosDiaModule
            
        } catch (error) {
            console.error('Error cargando métricas:', error);
            ADMIN_DOM.metricsDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
        }
    },
    
    /**
     * Muestra las métricas calculadas
     */
    displayMetrics: function(bookings) {
        const total = bookings.length;
        const completed = bookings.filter(b => b.status === 'completed').length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        
        // Calcular ingresos estimados
        const revenue = bookings.reduce((sum, booking) => {
            return sum + (booking.services?.price || 0);
        }, 0);
        
        ADMIN_DOM.metricsDiv.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>📅 Turnos Hoy</h4>
                    <p class="metric-value">${total}</p>
                </div>
                <div class="metric-card">
                    <h4>✅ Completados</h4>
                    <p class="metric-value">${completed}</p>
                </div>
                <div class="metric-card">
                    <h4>⏳ Pendientes</h4>
                    <p class="metric-value">${pending}</p>
                </div>
                <div class="metric-card">
                    <h4>💰 Ingresos Est.</h4>
                    <p class="metric-value">$${revenue.toLocaleString()}</p>
                </div>
            </div>
        `;
    },
    
    /**
     * Muestra la lista de turnos de hoy (ahora obsoleto - se usa TurnosDiaModule)
     */
    displayTodayList: function(bookings) {
        // Esta función ahora está obsoleta, se usa TurnosDiaModule.mostrarTurnosHoy()
        console.log('⚠️ displayTodayList obsoleto, usar TurnosDiaModule.mostrarTurnosHoy()');
    }
};

// ==============================
// 5. MÓDULO DE PRECIOS
// ==============================
const PricesModule = {
    /**
     * Inicializa el formulario de precios
     */
    initForm: function() {
        if (!ADMIN_DOM.priceForm) {
            console.warn('⚠️ Formulario de precios no encontrado');
            return;
        }
        
        console.log('✅ Inicializando formulario de precios...');
        ADMIN_DOM.priceForm.onsubmit = this.handleSubmit.bind(this);
    },
    
    /**
     * Maneja el envío del formulario
     */
    handleSubmit: async function(e) {
        e.preventDefault();
        
        try {
            const serviceName = document.getElementById('serviceName')?.value;
            const servicePrice = document.getElementById('servicePrice')?.value;
            
            if (!serviceName || !servicePrice) {
                throw new Error('Complete todos los campos');
            }
            
            await this.savePrice(serviceName, servicePrice);
            
            alert('✅ Precio guardado correctamente');
            ADMIN_DOM.priceForm.reset();
            
            // Recargar servicios si la función existe
            if (typeof window.reloadServices === 'function') {
                await window.reloadServices();
            }
            
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            console.error('Error guardando precio:', error);
        }
    },
    
    /**
     * Guarda un precio en la base de datos
     */
    savePrice: async function(serviceName, price) {
        console.log('📤 Guardando precio:', { serviceName, price });
        
        const response = await fetch(`${ADMIN_GAS_URL}/prices`, {
            method: 'POST',
            headers: {
                'apikey': ADMIN_SUPA_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name: serviceName.trim(),
                price: Number(price),
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status} al guardar precio`);
        }
        
        console.log('✅ Precio guardado');
        return response;
    }
};

// ==============================
// 6. FUNCIONES UTILITARIAS
// ==============================
const AdminUtils = {
    /**
     * Marca turnos pasados como completados
     */
    markOldBookingsAsCompleted: async function() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const response = await fetch(
                `${ADMIN_GAS_URL}/${TABLA_TURNOS}?date=lt.${today}&status=eq.pending&select=id,date,name,time`,
                { headers: { apikey: ADMIN_SUPA_KEY } }
            );
            
            if (!response.ok) throw new Error('Error al cargar turnos');
            const oldBookings = await response.json();
            
            if (oldBookings.length === 0) {
                return { updated: 0, message: '✅ No hay turnos pendientes' };
            }
            
            const confirmUpdate = confirm(
                `¿Marcar ${oldBookings.length} turnos pasados como "completados"?\n\n` +
                `Esto mantendrá el historial pero los marcará como finalizados.`
            );
            
            if (!confirmUpdate) {
                return { updated: 0, message: '❌ Operación cancelada' };
            }
            
            let updatedCount = 0;
            for (const booking of oldBookings) {
                try {
                    await fetch(`${ADMIN_GAS_URL}/${TABLA_TURNOS}?id=eq.${booking.id}`, {
                        method: 'PATCH',
                        headers: { 
                            apikey: ADMIN_SUPA_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'completed' })
                    });
                    updatedCount++;
                    console.log(`✅ ${booking.date} ${booking.time} - ${booking.name}`);
                } catch (err) {
                    console.error(`❌ Error en ${booking.id}:`, err);
                }
            }
            
            alert(`✅ ${updatedCount} turnos marcados como completados`);
            
            // Actualizar ambas vistas
            MetricsModule.loadTodayMetrics();
            TurnosDiaModule.cargarTurnosHoy();
            
            return { 
                updated: updatedCount, 
                total: oldBookings.length,
                message: `✅ ${updatedCount}/${oldBookings.length} turnos actualizados`
            };
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error: ' + error.message);
            throw error;
        }
    },
    
    /**
     * Configura los listeners de eventos principales
     */
    setupEventListeners: function() {
        // Botón de carga manual
        if (ADMIN_DOM.loadBtn) {
            ADMIN_DOM.loadBtn.onclick = () => MetricsModule.loadTodayMetrics();
        }
        
        // Eventos personalizados
        window.addEventListener('newBooking', () => {
            setTimeout(() => {
                MetricsModule.loadTodayMetrics();
                TurnosDiaModule.cargarTurnosHoy();
            }, 1000);
        });
        
        window.addEventListener('bookingCancelled', () => {
            setTimeout(() => {
                MetricsModule.loadTodayMetrics();
                TurnosDiaModule.cargarTurnosHoy();
            }, 1000);
        });
        
        window.addEventListener('bookingUpdated', () => {
            setTimeout(() => {
                MetricsModule.loadTodayMetrics();
                TurnosDiaModule.cargarTurnosHoy();
            }, 1000);
        });
    },
    
    /**
     * Inicia el refresh automático
     */
    startAutoRefresh: function(interval = 30000) {
        console.log('⏰ Iniciando auto-refresh cada', interval/1000, 'segundos');
        setInterval(() => {
            MetricsModule.loadTodayMetrics();
            TurnosDiaModule.cargarTurnosHoy();
        }, interval);
    }
};

// ==============================
// 7. INICIALIZACIÓN
// ==============================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin.js inicializando...');
    
    // Verificar elementos críticos
    if (!ADMIN_DOM.checkElements()) {
        console.warn('⚠️ Algunos elementos del admin no se encontraron');
    }
    
    // Verificar configuración
    if (!ADMIN_GAS_URL || !ADMIN_SUPA_KEY) {
        console.error('❌ ERROR: ADMIN_GAS_URL o ADMIN_SUPA_KEY no están definidos');
        alert('Error de configuración. Verifica las variables de API.');
        return;
    }
    
    console.log('✅ Configuración API verificada');
    
    // Crear/verificar sección de herramientas administrativas
    ADMIN_DOM.createAdminToolsSection();
    
    // Configurar eventos de herramientas
    AdminToolsModule.setupEventListeners();
    
    // Inicializar módulos principales
    AdminOffersModule.initForm();
    PricesModule.initForm();
    TurnosDiaModule.inicializar(); // <-- NUEVO: Inicializar gestión de turnos
    AdminUtils.setupEventListeners();
    
    // Cargar datos iniciales
    MetricsModule.loadTodayMetrics();
    TurnosDiaModule.cargarTurnosHoy(); // <-- NUEVO: Cargar turnos del día
    
    // Iniciar auto-refresh
    AdminUtils.startAutoRefresh();
    
    console.log('✅ Admin.js inicializado correctamente');
    
    // Verificación final
    setTimeout(() => {
        console.log('🧪 Verificación final:');
        console.log('- Tabla de turnos:', TABLA_TURNOS);
        console.log('- TurnosDiaModule:', typeof TurnosDiaModule);
        console.log('- Botón ver ofertas:', ADMIN_DOM.viewOffersBtn ? '✅ Encontrado' : '❌ No encontrado');
        console.log('- API URL:', ADMIN_GAS_URL);
    }, 500);
});

// ==============================
// 8. EXPORTAR AL ÁMBITO GLOBAL
// ==============================
window.AdminModule = {
    loadMetrics: MetricsModule.loadTodayMetrics,
    viewOffers: AdminOffersModule.viewExisting,
    markOldBookings: AdminUtils.markOldBookingsAsCompleted,
    savePrice: PricesModule.savePrice,
    cargarTurnosHoy: TurnosDiaModule.cargarTurnosHoy, // <-- NUEVO
    marcarComoCompletado: TurnosDiaModule.marcarComoCompletado // <-- NUEVO
};

// Exportar funciones de herramientas
window.AdminTools = AdminToolsModule;
window.TurnosDia = TurnosDiaModule; // <-- NUEVO

// ==============================
// 9. FUNCIONES GLOBALES PARA COMPATIBILIDAD
// ==============================
window.markOldBookingsAsCompleted = function() {
    AdminToolsModule.markOldBookings();
};

window.viewExistingOffers = function() {
    AdminToolsModule.viewExistingOffers();
};

// NUEVAS FUNCIONES GLOBALES
window.cargarTurnosDelDia = function() {
    return TurnosDiaModule.cargarTurnosHoy();
};

window.marcarTurnoCompletado = function(turnoId) {
    return TurnosDiaModule.marcarComoCompletado(turnoId);
};

console.log('✅ admin.js cargado correctamente - Herramientas administrativas disponibles');

// Test de conexión inmediata
setTimeout(() => {
    console.log('🧪 Test de conexión API...');
    fetch(ADMIN_GAS_URL + '/offers?limit=1', {
        headers: { apikey: ADMIN_SUPA_KEY }
    })
    .then(r => console.log(`📡 Test API: ${r.status} ${r.statusText}`))
    .catch(err => console.error('❌ Test API falló:', err));
}, 1000);