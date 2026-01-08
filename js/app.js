// app.js - Módulo principal de cliente para Barbería PWA
// Variables globales
const APP_CONFIG = {
    GAS_URL: window.GAS_URL || '',
    SUPA_KEY: window.SUPA_KEY || '',
    WORKING_HOURS: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']
};

// ==============================
// 1. MÓDULO DE ELEMENTOS DEL DOM
// ==============================
const DOM = {
    // Elementos principales
    serviceSel: document.getElementById('service'),
    dateInput: document.getElementById('date'),
    timeSel: document.getElementById('time'),
    form: document.getElementById('bookingForm'),
    msg: document.getElementById('msg'),
    
    // Ofertas
    offerSel: null,
    offerDescription: null,
    
    // Mis turnos
    myBookingsSection: null,
    myBookingsList: null,
    bookingActions: null,
    editBookingForm: null,
    
    // Disponibilidad
    timeAvailability: null,
    
    /**
     * Inicializa todos los elementos del DOM
     */
    init: function() {
        console.log('🔄 Inicializando elementos DOM...');
        
        // Crear elementos dinámicos si no existen
        this.createDynamicElements();
        
        // Configurar elementos existentes
        this.setupElements();
        
        return this;
    },
    
    /**
     * Crea elementos dinámicos necesarios
     */
    createDynamicElements: function() {
        // 1. Selector de ofertas
        if (!document.getElementById('offer')) {
            this.createOfferSelect();
        }
        this.offerSel = document.getElementById('offer');
        this.offerDescription = document.getElementById('offerDescription');
        
        // 2. Sección de disponibilidad
        if (!document.getElementById('timeAvailability')) {
            this.createAvailabilityElement();
        }
        this.timeAvailability = document.getElementById('timeAvailability');
        
        // 3. Sección "Mis Turnos"
        if (!document.getElementById('myBookings')) {
            this.createMyBookingsSection();
        }
        this.myBookingsSection = document.getElementById('myBookings');
        this.myBookingsList = document.getElementById('myBookingsList');
        this.bookingActions = document.getElementById('bookingActions');
        this.editBookingForm = document.getElementById('editBookingForm');
    },
    
    /**
     * Crea selector de ofertas
     */
    createOfferSelect: function() {
        const container = document.createElement('div');
        container.className = 'offer-selector';
        container.innerHTML = `
            <h3 class="section-title">
                <span class="icon">🎁</span> Ofertas Especiales
            </h3>
            <select id="offer" class="form-select">
                <option value="">-- Selecciona una oferta --</option>
            </select>
            <div id="offerDescription" class="offer-description"></div>
        `;
        
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.parentNode.insertBefore(container, bookingForm);
        }
        
        return container;
    },
    
    /**
     * Crea elemento de disponibilidad
     */
    createAvailabilityElement: function() {
        const div = document.createElement('div');
        div.id = 'timeAvailability';
        div.className = 'availability-display';
        
        if (this.timeSel) {
            this.timeSel.parentNode.appendChild(div);
        }
        
        return div;
    },
    
    /**
     * Crea sección "Mis Turnos"
     */
    createMyBookingsSection: function() {
        const section = document.createElement('section');
        section.id = 'myBookings';
        section.className = 'my-bookings-section';
        section.innerHTML = `
            <h2 class="section-title">
                <span class="icon">📅</span> Mis Turnos Reservados
            </h2>
            <div id="myBookingsList" class="bookings-list">
                <p class="loading-message">Cargando tus turnos...</p>
            </div>
            <div id="bookingActions" class="edit-booking-form" style="display: none;">
                <h3 class="form-title">
                    <span class="icon">✏️</span> Modificar Turno
                </h3>
                <form id="editBookingForm" class="edit-form">
                    <input type="hidden" id="editBookingId">
                    
                    <div class="form-group">
                        <label for="editService" class="form-label">Nuevo servicio</label>
                        <select id="editService" class="form-select" required></select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editDate" class="form-label">Nueva fecha</label>
                            <input type="date" id="editDate" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="editTime" class="form-label">Nueva hora</label>
                            <select id="editTime" class="form-select" required></select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-success">
                            <span class="icon">💾</span> Guardar Cambios
                        </button>
                        <button type="button" id="cancelEditBtn" class="btn btn-secondary">
                            <span class="icon">❌</span> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.parentNode.insertBefore(section, bookingForm.nextSibling);
        }
        
        return section;
    },
    
    /**
     * Configura elementos existentes
     */
    setupElements: function() {
        // Configurar fecha mínima (hoy)
        if (this.dateInput) {
            this.dateInput.min = new Date().toISOString().split('T')[0];
        }
        
        // Configurar horas fijas
        if (this.timeSel) {
            this.timeSel.innerHTML = '';
            APP_CONFIG.WORKING_HOURS.forEach(hour => {
                const option = document.createElement('option');
                option.value = hour;
                option.textContent = hour;
                this.timeSel.appendChild(option);
            });
        }
    }
};

// ==============================
// 2. MÓDULO DE DISPONIBILIDAD
// ==============================
const AvailabilityModule = {
    /**
     * Verifica horarios disponibles para una fecha
     */
    checkAvailableTimes: async function(selectedDate) {
        if (!selectedDate || !DOM.timeSel) return;
        
        try {
            DOM.timeAvailability.innerHTML = '<div class="loading">Verificando disponibilidad...</div>';
            DOM.timeAvailability.style.display = 'block';
            
            const response = await fetch(
                `${APP_CONFIG.GAS_URL}/bookings?date=eq.${selectedDate}&select=time`,
                { headers: { apikey: APP_CONFIG.SUPA_KEY } }
            );
            
            if (!response.ok) throw new Error('Error al verificar disponibilidad');
            
            const bookedTimes = await response.json();
            const occupiedTimes = bookedTimes.map(b => b.time);
            
            this.updateTimeOptions(occupiedTimes);
            this.showAvailability(occupiedTimes);
            
        } catch (error) {
            console.warn('⚠️ No se pudieron verificar horarios:', error);
            DOM.timeAvailability.innerHTML = `
                <div class="error">
                    ⚠️ Error al verificar disponibilidad
                </div>
            `;
        }
    },
    
    /**
     * Actualiza opciones de horario según disponibilidad
     */
    updateTimeOptions: function(occupiedTimes) {
        const options = DOM.timeSel.options;
        
        for (let i = 0; i < options.length; i++) {
            const time = options[i].value;
            const isOccupied = occupiedTimes.includes(time);
            
            options[i].disabled = isOccupied;
            options[i].textContent = isOccupied ? `${time} - ❌ OCUPADO` : time;
            options[i].className = isOccupied ? 'option-disabled' : '';
        }
    },
    
    /**
     * Muestra resumen de disponibilidad
     */
    showAvailability: function(occupiedTimes) {
        const availableCount = APP_CONFIG.WORKING_HOURS.length - occupiedTimes.length;
        
        if (availableCount === 0) {
            DOM.timeAvailability.innerHTML = `
                <div class="availability-fail">
                    ⚠️ No hay horarios disponibles para esta fecha
                </div>
            `;
        } else if (occupiedTimes.length > 0) {
            DOM.timeAvailability.innerHTML = `
                <div class="availability-info">
                    📅 ${availableCount} horario(s) disponible(s) | 
                    <small>Ocupados: ${occupiedTimes.join(', ')}</small>
                </div>
            `;
        } else {
            DOM.timeAvailability.innerHTML = `
                <div class="availability-success">
                    ✅ Todos los horarios disponibles
                </div>
            `;
            setTimeout(() => {
                DOM.timeAvailability.style.display = 'none';
            }, 2000);
        }
    },
    
    /**
     * Verifica si un horario específico está disponible
     */
    isTimeAvailable: async function(date, time) {
        try {
            const response = await fetch(
                `${APP_CONFIG.GAS_URL}/bookings?date=eq.${date}&time=eq.${time}&select=id`,
                { headers: { apikey: APP_CONFIG.SUPA_KEY } }
            );
            
            if (!response.ok) throw new Error('Error de red');
            
            const existing = await response.json();
            return existing.length === 0;
            
        } catch (error) {
            console.error('Error verificando disponibilidad:', error);
            return false;
        }
    }
};

// ==============================
// 3. MÓDULO DE OFERTAS
// ==============================
const OffersModule = {
    /**
     * Carga ofertas y las muestra en el selector
     */
    loadOffers: async function() {
        try {
            const offers = await this.fetchOffers();
            this.updateOfferSelect(offers);
            this.setupOfferEvents();
            
            console.log(`✅ ${offers.length} oferta(s) cargada(s)`);
            
        } catch (error) {
            console.error('❌ Error cargando ofertas:', error);
            this.showOfferError();
        }
    },
    
    /**
     * Obtiene ofertas desde la API
     */
    fetchOffers: async function() {
        const response = await fetch(
            `${APP_CONFIG.GAS_URL}/offers?select=*&order=created_at.desc`,
            { headers: { apikey: APP_CONFIG.SUPA_KEY } }
        );
        
        if (!response.ok) throw new Error('Error al cargar ofertas');
        
        const offers = await response.json();
        return this.filterActiveOffers(offers);
    },
    
    /**
     * Filtra ofertas activas y no expiradas
     */
    filterActiveOffers: function(offers) {
        const now = new Date();
        return offers.filter(offer => {
            if (offer.active === false) return false;
            
            if (offer.expires_at) {
                return new Date(offer.expires_at) > now;
            }
            
            return true;
        });
    },
    
    /**
     * Actualiza el selector de ofertas
     */
    updateOfferSelect: function(offers) {
        if (!DOM.offerSel) return;
        
        // Guardar selección actual
        const currentValue = DOM.offerSel.value;
        
        // Limpiar opciones (excepto la primera)
        DOM.offerSel.innerHTML = '<option value="">-- Selecciona una oferta --</option>';
        
        if (offers.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay ofertas disponibles";
            DOM.offerSel.appendChild(option);
            return;
        }
        
        // Agregar cada oferta
        offers.forEach(offer => {
            const option = document.createElement('option');
            option.value = offer.id;
            option.textContent = `${offer.text} – $${offer.price}`;
            
            // Almacenar datos adicionales
            option.dataset.description = offer.description || '';
            option.dataset.price = offer.price;
            option.dataset.expiresAt = offer.expires_at;
            option.dataset.duration = offer.duration_minutes || 60;
            
            DOM.offerSel.appendChild(option);
        });
        
        // Restaurar selección si existe
        if (currentValue) {
            DOM.offerSel.value = currentValue;
            this.handleOfferChange();
        }
    },
    
    /**
     * Configura eventos del selector de ofertas
     */
    setupOfferEvents: function() {
        if (DOM.offerSel) {
            DOM.offerSel.addEventListener('change', () => this.handleOfferChange());
        }
    },
    
    /**
     * Maneja cambio en selector de ofertas
     */
    handleOfferChange: function() {
        if (!DOM.offerSel || !DOM.offerDescription) return;
        
        const selectedOption = DOM.offerSel.options[DOM.offerSel.selectedIndex];
        
        if (DOM.offerSel.value && selectedOption.dataset.description) {
            this.showOfferDetails(selectedOption);
        } else {
            this.hideOfferDetails();
            this.restoreServiceSelector();
        }
    },
    
    /**
     * Muestra detalles de la oferta seleccionada
     */
    showOfferDetails: function(option) {
        let html = '';
        
        // Descripción
        if (option.dataset.description) {
            html += `<div class="offer-detail">
                <strong>📝 Descripción:</strong><br>
                ${option.dataset.description}
            </div>`;
        }
        
        // Precio
        if (option.dataset.price) {
            html += `<div class="offer-detail">
                <strong>💰 Precio especial:</strong> $${option.dataset.price}
            </div>`;
        }
        
        // Tiempo restante (si tiene expiración)
        if (option.dataset.expiresAt) {
            html += this.getCountdownHTML(option.dataset.expiresAt);
        }
        
        DOM.offerDescription.innerHTML = html;
        DOM.offerDescription.style.display = 'block';
        
        // Actualizar selector de servicios con la oferta
        this.updateServiceSelector(option);
    },
    
    /**
     * Genera HTML para cuenta regresiva
     */
    getCountdownHTML: function(expiresAt) {
        const expiresDate = new Date(expiresAt);
        const now = new Date();
        const diffMs = expiresDate - now;
        
        if (diffMs <= 0) return '';
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const urgencyClass = diffHours < 1 ? 'urgent' : 'normal';
        
        return `
            <div class="offer-countdown ${urgencyClass}">
                <strong>⏰ Tiempo restante:</strong><br>
                <span class="countdown-timer">
                    ${diffHours > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffMinutes} minutos`}
                </span><br>
                <small>Válida hasta: ${expiresDate.toLocaleString('es-AR')}</small>
            </div>
        `;
    },
    
    /**
     * Actualiza selector de servicios con oferta seleccionada
     */
    updateServiceSelector: function(option) {
        if (!DOM.serviceSel) return;
        
        DOM.serviceSel.innerHTML = `
            <option value="${option.textContent}" selected>
                ${option.textContent}
            </option>
        `;
        
        // Actualizar campo oculto de precio (si existe)
        const priceInput = document.getElementById('servicePrice');
        if (priceInput) {
            priceInput.value = option.dataset.price;
        }
    },
    
    /**
     * Restaura selector de servicios normal
     */
    restoreServiceSelector: async function() {
        if (!DOM.serviceSel) return;
        
        try {
            await ServicesModule.loadServices();
        } catch (error) {
            console.error('Error restaurando servicios:', error);
        }
    },
    
    /**
     * Oculta detalles de oferta
     */
    hideOfferDetails: function() {
        if (DOM.offerDescription) {
            DOM.offerDescription.style.display = 'none';
        }
    },
    
    /**
     * Muestra error en ofertas
     */
    showOfferError: function() {
        if (DOM.offerSel) {
            DOM.offerSel.innerHTML = '<option value="">Error cargando ofertas</option>';
        }
    }
};

// ==============================
// 4. MÓDULO DE SERVICIOS
// ==============================
const ServicesModule = {
    /**
     * Carga servicios desde la API
     */
    loadServices: async function() {
        try {
            const services = await this.fetchServices();
            this.updateServiceSelect(services);
            return services;
            
        } catch (error) {
            console.error('❌ Error cargando servicios:', error);
            throw error;
        }
    },
    
    /**
     * Obtiene servicios desde la API
     */
    fetchServices: async function() {
        const response = await fetch(
            `${APP_CONFIG.GAS_URL}/services?select=*&order=price.asc`,
            { headers: { apikey: APP_CONFIG.SUPA_KEY } }
        );
        
        if (!response.ok) throw new Error('Error al cargar servicios');
        
        return await response.json();
    },
    
    /**
     * Actualiza selector de servicios
     */
    updateServiceSelect: function(services) {
        if (!DOM.serviceSel) return;
        
        DOM.serviceSel.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
        
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = `${service.name} – $${service.price}`;
            option.dataset.price = service.price;
            DOM.serviceSel.appendChild(option);
        });
        
        // Configurar evento para actualizar precio
        DOM.serviceSel.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const priceInput = document.getElementById('servicePrice');
            
            if (priceInput && selectedOption.dataset.price) {
                priceInput.value = selectedOption.dataset.price;
            }
        });
    }
};

// ==============================
// 5. MÓDULO DE TURNOS DEL USUARIO
// ==============================
const MyBookingsModule = {
    /**
     * Carga turnos del usuario actual
     */
    loadMyBookings: async function() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                this.showLoginMessage();
                return;
            }
            
            const bookings = await this.fetchUserBookings(user.uid);
            this.displayBookings(bookings);
            
            console.log(`✅ ${bookings.length} turno(s) cargado(s)`);
            
        } catch (error) {
            console.error('❌ Error cargando turnos:', error);
            this.showErrorMessage(error);
        }
    },
    
    /**
     * Obtiene turnos del usuario
     */
    fetchUserBookings: async function(userId) {
        const today = new Date().toISOString().split('T')[0];
        
        const response = await fetch(
            `${APP_CONFIG.GAS_URL}/bookings?uid=eq.${userId}&status=eq.pending&date=gte.${today}&select=*&order=date.asc,time.asc`,
            { headers: { apikey: APP_CONFIG.SUPA_KEY } }
        );
        
        if (!response.ok) throw new Error('Error al cargar turnos');
        
        return await response.json();
    },
    
    /**
     * Muestra turnos en la lista
     */
    displayBookings: function(bookings) {
        if (!DOM.myBookingsList) return;
        
        if (bookings.length === 0) {
            DOM.myBookingsList.innerHTML = `
                <div class="empty-bookings">
                    <p>No tenés turnos reservados</p>
                    <p class="subtext">¡Reservá tu primer turno ahora!</p>
                </div>
            `;
            return;
        }
        
        DOM.myBookingsList.innerHTML = bookings.map(booking => 
            this.createBookingCard(booking)
        ).join('');
    },
    
    /**
     * Crea tarjeta HTML para un turno
     */
    createBookingCard: function(booking) {
        const bookingDate = new Date(booking.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const isToday = bookingDate.getTime() === today.getTime();
        const isPast = bookingDate < today;
        
        const statusClass = isToday ? 'booking-today' : (isPast ? 'booking-past' : 'booking-upcoming');
        const statusLabel = isToday ? 'HOY' : (isPast ? 'PASADO' : '');
        
        return `
            <div id="booking-${booking.id}" class="booking-card ${statusClass}">
                <div class="booking-header">
                    <div class="booking-title">
                        <strong class="service-name">${booking.service}</strong>
                        ${statusLabel ? `<span class="status-badge">${statusLabel}</span>` : ''}
                    </div>
                    <div class="booking-actions">
                        <button onclick="MyBookingsModule.editBooking(${booking.id})" class="btn-edit">
                            <span class="icon">✏️</span> Modificar
                        </button>
                        <button onclick="MyBookingsModule.cancelBooking(${booking.id})" class="btn-cancel">
                            <span class="icon">❌</span> Cancelar
                        </button>
                    </div>
                </div>
                
                <div class="booking-details">
                    <div class="detail-item">
                        <span class="icon">📅</span>
                        <strong>Fecha:</strong> ${booking.date}
                    </div>
                    <div class="detail-item">
                        <span class="icon">⏰</span>
                        <strong>Hora:</strong> ${booking.time}
                    </div>
                    <div class="detail-item">
                        <span class="icon">💰</span>
                        <strong>Precio:</strong> $${booking.price}
                    </div>
                    <div class="detail-item">
                        <span class="icon">🆔</span>
                        <strong>Reserva #:</strong> ${booking.id}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Cancela un turno
     */
    cancelBooking: async function(bookingId) {
        try {
            // Obtener detalles del turno
            const booking = await this.fetchBookingDetails(bookingId);
            
            const confirmCancel = confirm(
                `¿Estás seguro de cancelar este turno?\n\n` +
                `Servicio: ${booking.service}\n` +
                `Fecha: ${booking.date}\n` +
                `Hora: ${booking.time}\n\n` +
                `Esta acción no se puede deshacer.`
            );
            
            if (!confirmCancel) return;
            
            await this.updateBookingStatus(bookingId, 'cancelled');
            
            alert('✅ Turno cancelado exitosamente');
            this.loadMyBookings();
            
            // Notificar al admin
            window.dispatchEvent(new CustomEvent('bookingCancelled'));
            
        } catch (error) {
            console.error('❌ Error cancelando turno:', error);
            alert('❌ Error al cancelar el turno: ' + error.message);
        }
    },
    
    /**
     * Obtiene detalles de un turno
     */
    fetchBookingDetails: async function(bookingId) {
        const response = await fetch(
            `${APP_CONFIG.GAS_URL}/bookings?id=eq.${bookingId}`,
            { headers: { apikey: APP_CONFIG.SUPA_KEY } }
        );
        
        if (!response.ok) throw new Error('Turno no encontrado');
        
        const data = await response.json();
        return data[0];
    },
    
    /**
     * Actualiza estado de un turno
     */
    updateBookingStatus: async function(bookingId, status) {
        const response = await fetch(`${APP_CONFIG.GAS_URL}/bookings?id=eq.${bookingId}`, {
            method: 'PATCH',
            headers: { 
                apikey: APP_CONFIG.SUPA_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        return response;
    },
    
    /**
     * Prepara edición de un turno
     */
    editBooking: async function(bookingId) {
        try {
            const booking = await this.fetchBookingDetails(bookingId);
            
            // Verificar que no sea un turno pasado
            const today = new Date().toISOString().split('T')[0];
            if (booking.date < today) {
                alert('⚠️ No se pueden modificar turnos pasados');
                return;
            }
            
            this.prepareEditForm(booking);
            this.showEditForm();
            
        } catch (error) {
            console.error('❌ Error preparando edición:', error);
            alert('Error: ' + error.message);
        }
    },
    
    /**
     * Prepara formulario de edición
     */
    prepareEditForm: function(booking) {
        document.getElementById('editBookingId').value = booking.id;
        document.getElementById('editDate').value = booking.date;
        document.getElementById('editDate').min = new Date().toISOString().split('T')[0];
        
        // Llenar servicios
        const editServiceSelect = document.getElementById('editService');
        editServiceSelect.innerHTML = '';
        
        // Cargar servicios async para el formulario de edición
        ServicesModule.fetchServices().then(services => {
            services.forEach(s => {
                const option = document.createElement('option');
                option.value = s.name;
                option.textContent = `${s.name} – $${s.price}`;
                option.selected = s.name === booking.service;
                editServiceSelect.appendChild(option);
            });
        });
        
        // Llenar horas
        const editTimeSelect = document.getElementById('editTime');
        editTimeSelect.innerHTML = '';
        
        APP_CONFIG.WORKING_HOURS.forEach(hour => {
            const option = document.createElement('option');
            option.value = hour;
            option.textContent = hour;
            option.selected = hour === booking.time;
            editTimeSelect.appendChild(option);
        });
    },
    
    /**
     * Muestra formulario de edición
     */
    showEditForm: function() {
        if (DOM.bookingActions) {
            DOM.bookingActions.style.display = 'block';
            DOM.bookingActions.scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    /**
     * Oculta formulario de edición
     */
    hideEditForm: function() {
        if (DOM.bookingActions) {
            DOM.bookingActions.style.display = 'none';
            if (DOM.editBookingForm) {
                DOM.editBookingForm.reset();
            }
        }
    },
    
    /**
     * Actualiza un turno
     */
    updateBooking: async function(bookingId, updates) {
        const response = await fetch(`${APP_CONFIG.GAS_URL}/bookings?id=eq.${bookingId}`, {
            method: 'PATCH',
            headers: { 
                apikey: APP_CONFIG.SUPA_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                ...updates,
                updated_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        return response;
    },
    
    /**
     * Muestra mensaje de inicio de sesión
     */
    showLoginMessage: function() {
        if (DOM.myBookingsList) {
            DOM.myBookingsList.innerHTML = `
                <div class="login-message">
                    <p>Iniciá sesión para ver tus turnos reservados</p>
                </div>
            `;
        }
    },
    
    /**
     * Muestra mensaje de error
     */
    showErrorMessage: function(error) {
        if (DOM.myBookingsList) {
            DOM.myBookingsList.innerHTML = `
                <div class="error-message">
                    <p>⚠️ Error al cargar tus turnos</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
};

// ==============================
// 6. MÓDULO DE RESERVAS
// ==============================
const BookingModule = {
    /**
     * Maneja el envío del formulario de reserva
     */
    handleSubmit: async function(e) {
        e.preventDefault();
        
        try {
            // 1. Validar usuario
            const user = this.validateUser();
            
            // 2. Validar datos del formulario
            const formData = this.validateForm();
            
            // 3. Verificar disponibilidad final
            await this.validateAvailability(formData.date, formData.time);
            
            // 4. Preparar datos de reserva
            const bookingData = this.prepareBookingData(user, formData);
            
            // 5. Guardar reserva
            const result = await this.saveBooking(bookingData);
            
            // 6. Procesar éxito
            this.handleSuccess(bookingData);
            
            return result;
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    },
    
    /**
     * Valida que el usuario esté autenticado
     */
    validateUser: function() {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('Primero iniciá sesión');
        }
        return user;
    },
    
    /**
     * Valida datos del formulario
     */
    validateForm: function() {
        if (!DOM.dateInput || !DOM.dateInput.value) {
            throw new Error('Por favor, selecciona una fecha');
        }
        
        const selectedTime = DOM.timeSel?.value;
        if (!selectedTime || DOM.timeSel?.selectedOptions[0]?.disabled) {
            throw new Error('Por favor, selecciona un horario disponible');
        }
        
        const serviceText = DOM.serviceSel?.selectedOptions[0]?.text || '';
        const priceMatch = serviceText.match(/\$(\d+)/);
        const price = priceMatch ? parseInt(priceMatch[1]) : 0;
        
        return {
            date: DOM.dateInput.value,
            time: selectedTime,
            service: DOM.serviceSel?.value || '',
            price: price
        };
    },
    
    /**
     * Valida disponibilidad del horario
     */
    validateAvailability: async function(date, time) {
        const isAvailable = await AvailabilityModule.isTimeAvailable(date, time);
        if (!isAvailable) {
            // Actualizar lista de disponibilidad
            await AvailabilityModule.checkAvailableTimes(date);
            throw new Error('Este horario ya fue reservado. Por favor, selecciona otro.');
        }
    },
    
    /**
     * Prepara datos de reserva
     */
    prepareBookingData: function(user, formData) {
        const bookingData = {
            uid: user.uid,
            name: user.displayName || 'Cliente',
            email: user.email || '',
            service: formData.service,
            date: formData.date,
            time: formData.time,
            price: formData.price,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        // Agregar información de oferta si hay una seleccionada
        if (DOM.offerSel && DOM.offerSel.value) {
            const selectedOption = DOM.offerSel.options[DOM.offerSel.selectedIndex];
            bookingData.is_offer = true;
            bookingData.offer_id = DOM.offerSel.value;
            bookingData.offer_price = selectedOption.dataset.price;
            bookingData.offer_text = selectedOption.textContent;
        }
        
        console.log('📤 Turno a guardar:', bookingData);
        return bookingData;
    },
    
    /**
     * Guarda la reserva en la API
     */
    saveBooking: async function(bookingData) {
        // Esta función debe estar definida globalmente (db.js)
        if (typeof window.saveBooking !== 'function') {
            throw new Error('Función saveBooking no disponible');
        }
        
        return await window.saveBooking(bookingData);
    },
    
    /**
     * Maneja reserva exitosa
     */
    handleSuccess: function(bookingData) {
        // Mostrar mensaje de éxito
        if (DOM.msg) {
            DOM.msg.textContent = '¡Turno reservado con éxito!';
            DOM.msg.className = 'success-message';
        }
        
        // Actualizar disponibilidad
        AvailabilityModule.checkAvailableTimes(bookingData.date);
        
        // Limpiar formulario
        if (DOM.form) {
            DOM.form.reset();
            // Restaurar servicios normales
            ServicesModule.loadServices();
            // Limpiar oferta seleccionada
            if (DOM.offerSel) {
                DOM.offerSel.value = '';
                OffersModule.hideOfferDetails();
            }
        }
        
        // Notificar nueva reserva
        window.dispatchEvent(new CustomEvent('newBooking', { 
            detail: bookingData
        }));
        
        // Recargar turnos del usuario después de un tiempo
        setTimeout(() => {
            MyBookingsModule.loadMyBookings();
        }, 2000);
        
        console.log('📢 Evento newBooking disparado');
    },
    
    /**
     * Maneja error en reserva
     */
    handleError: function(error) {
        console.error('❌ Error en reserva:', error);
        
        if (DOM.msg) {
            DOM.msg.textContent = 'Error: ' + error.message;
            DOM.msg.className = 'error-message';
        }
        
        alert('Error al reservar: ' + error.message);
    }
};

// ==============================
// 7. MÓDULO DE EVENTOS
// ==============================
const EventsModule = {
    /**
     * Configura todos los event listeners
     */
    setup: function() {
        // Evento de cambio de fecha
        if (DOM.dateInput) {
            DOM.dateInput.addEventListener('change', (e) => {
                if (e.target.value) {
                    AvailabilityModule.checkAvailableTimes(e.target.value);
                }
            });
        }
        
        // Evento submit del formulario principal
        if (DOM.form) {
            DOM.form.addEventListener('submit', (e) => BookingModule.handleSubmit(e));
        }
        
        // Evento submit del formulario de edición
        if (DOM.editBookingForm) {
            DOM.editBookingForm.addEventListener('submit', this.handleEditSubmit);
        }
        
        // Botón cancelar edición
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                MyBookingsModule.hideEditForm();
            });
        }
        
        // Escuchar eventos de autenticación
        this.setupAuthListeners();
        
        // Escuchar eventos de ofertas
        window.addEventListener('offersUpdated', () => {
            console.log('📢 Ofertas actualizadas, recargando...');
            setTimeout(() => OffersModule.loadOffers(), 1000);
        });
        
        // Auto-refresh de turnos
        this.setupAutoRefresh();
    },
    
    /**
     * Maneja envío del formulario de edición
     */
    handleEditSubmit: async function(e) {
        e.preventDefault();
        
        const bookingId = document.getElementById('editBookingId').value;
        const newDate = document.getElementById('editDate').value;
        const newTime = document.getElementById('editTime').value;
        const newService = document.getElementById('editService').value;
        
        try {
            // Verificar disponibilidad del nuevo horario
            const isAvailable = await AvailabilityModule.isTimeAvailable(newDate, newTime);
            if (!isAvailable) {
                // Verificar si es el mismo turno
                const existing = await AvailabilityModule.checkBookingAtTime(newDate, newTime);
                if (!existing || existing[0]?.id != bookingId) {
                    throw new Error('Este horario ya está ocupado. Por favor, elegí otro.');
                }
            }
            
            // Obtener precio del nuevo servicio
            const serviceText = document.getElementById('editService').selectedOptions[0]?.text || '';
            const priceMatch = serviceText.match(/\$(\d+)/);
            const newPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
            
            // Actualizar turno
            await MyBookingsModule.updateBooking(bookingId, {
                date: newDate,
                time: newTime,
                service: newService,
                price: newPrice
            });
            
            alert('✅ Turno actualizado exitosamente');
            
            // Ocultar formulario y actualizar lista
            MyBookingsModule.hideEditForm();
            MyBookingsModule.loadMyBookings();
            
            // Notificar al admin
            window.dispatchEvent(new CustomEvent('bookingUpdated'));
            
        } catch (error) {
            console.error('❌ Error actualizando turno:', error);
            alert('❌ Error al actualizar el turno: ' + error.message);
        }
    },
    
    /**
     * Configura listeners de autenticación
     */
    setupAuthListeners: function() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    // Cargar turnos del usuario
                    setTimeout(() => MyBookingsModule.loadMyBookings(), 1000);
                }
            });
        }
    },
    
    /**
     * Configura auto-refresh
     */
    setupAutoRefresh: function() {
        // Actualizar ofertas cada minuto
        setInterval(() => OffersModule.loadOffers(), 60000);
        
        // Actualizar turnos cada 30 segundos (si está autenticado)
        setInterval(() => {
            const user = firebase.auth().currentUser;
            if (user) {
                MyBookingsModule.loadMyBookings();
            }
        }, 30000);
    }
};

// ==============================
// 8. INICIALIZACIÓN
// ==============================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Barbería PWA - Inicializando app.js...');
    
    try {
        // 1. Inicializar elementos DOM
        DOM.init();
        
        // 2. Verificar configuración
        if (!APP_CONFIG.GAS_URL || !APP_CONFIG.SUPA_KEY) {
            throw new Error('Configuración de API no encontrada');
        }
        
        // 3. Cargar datos iniciales
        await ServicesModule.loadServices();
        await OffersModule.loadOffers();
        
        // 4. Configurar eventos
        EventsModule.setup();
        
        // 5. Verificar disponibilidad si hay fecha seleccionada
        if (DOM.dateInput && DOM.dateInput.value) {
            AvailabilityModule.checkAvailableTimes(DOM.dateInput.value);
        }
        
        console.log('✅ app.js inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        alert('Error inicializando la aplicación: ' + error.message);
    }
});

// ==============================
// 9. EXPORTAR AL ÁMBITO GLOBAL
// ==============================
window.AppModules = {
    DOM: DOM,
    Availability: AvailabilityModule,
    Offers: OffersModule,
    Services: ServicesModule,
    MyBookings: MyBookingsModule,
    Booking: BookingModule,
    Events: EventsModule
};

// Exportar funciones para uso global
window.editBooking = (id) => MyBookingsModule.editBooking(id);
window.cancelBooking = (id) => MyBookingsModule.cancelBooking(id);

console.log('✅ app.js cargado - Sistema de reservas activo');