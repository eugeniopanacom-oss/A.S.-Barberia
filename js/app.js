const serviceSel = document.getElementById('service');
const dateInput = document.getElementById('date');
const timeSel = document.getElementById('time');
const form = document.getElementById('bookingForm');
const msg = document.getElementById('msg');
const timeAvailability = document.getElementById('timeAvailability') || createAvailabilityElement();

// Crear elemento para mostrar disponibilidad si no existe
function createAvailabilityElement() {
  const div = document.createElement('div');
  div.id = 'timeAvailability';
  div.style.marginTop = '10px';
  div.style.padding = '10px';
  div.style.borderRadius = '5px';
  div.style.display = 'none';
  timeSel.parentNode.appendChild(div);
  return div;
}

// Mis turnos (cancelacion/modificacion)
const myBookingsSection = document.getElementById('myBookings') || createMyBookingsSection();
const myBookingsList = document.getElementById('myBookingsList');

// Función para crear la sección de mis turnos
function createMyBookingsSection() {
  const section = document.createElement('section');
  section.id = 'myBookings';
  section.style.cssText = `
    margin: 30px 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid #dee2e6;
  `;
  
  section.innerHTML = `
    <h2 style="margin-top: 0; color: #333;">📅 Mis Turnos Reservados</h2>
    <div id="myBookingsList" style="
      min-height: 100px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    ">
      <p style="text-align: center; color: #6c757d; font-style: italic;">
        Cargando tus turnos...
      </p>
    </div>
    <div id="bookingActions" style="
      margin-top: 15px;
      display: none;
      padding: 15px;
      background: #e7f3ff;
      border-radius: 8px;
    ">
      <h3 style="margin-top: 0;">✏️ Modificar Turno</h3>
      <form id="editBookingForm">
        <input type="hidden" id="editBookingId">
        <label>Nuevo servicio:
          <select id="editService" required></select>
        </label>
        <label>Nueva fecha:
          <input type="date" id="editDate" required>
        </label>
        <label>Nueva hora:
          <select id="editTime" required></select>
        </label>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button type="submit" style="flex: 1; background: #28a745;">💾 Guardar Cambios</button>
          <button type="button" id="cancelEditBtn" style="flex: 1; background: #6c757d;">❌ Cancelar</button>
        </div>
      </form>
    </div>
  `;
  
  // Insertar después del formulario de reserva
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.parentNode.insertBefore(section, bookingForm.nextSibling);
  } else {
    document.getElementById('userSection').appendChild(section);
  }
  
  return section;
}

// ---------- FUNCIÓN: Cargar turnos del usuario ----------
async function loadMyBookings() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      myBookingsList.innerHTML = `
        <p style="text-align: center; color: #6c757d;">
          Inicia sesión para ver tus turnos reservados
        </p>
      `;
      return;
    }
    
    // Cargar solo turnos pendientes del usuario actual
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(
      `${GAS_URL}/bookings?uid=eq.${user.uid}&status=eq.pending&date=gte.${today}&select=*&order=date.asc,time.asc`,
      { headers: { apikey: SUPA_KEY } }
    );
    
    const bookings = await response.json();
    
    if (bookings.length === 0) {
      myBookingsList.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #6c757d;">No tenés turnos reservados</p>
          <p style="font-size: 0.9em; opacity: 0.8;">¡Reservá tu primer turno ahora!</p>
        </div>
      `;
      return;
    }
    
    let bookingsHTML = '';
    
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isToday = bookingDate.getTime() === today.getTime();
      const isPast = bookingDate < today;
      
      bookingsHTML += `
        <div id="booking-${booking.id}" style="
          padding: 15px;
          margin: 10px 0;
          background: ${isToday ? '#fff3cd' : (isPast ? '#f8f9fa' : '#e7f3ff')};
          border-radius: 8px;
          border-left: 4px solid ${isToday ? '#ffc107' : (isPast ? '#6c757d' : '#007bff')};
          position: relative;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
          ">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                <strong style="font-size: 1.1em;">${booking.service}</strong>
                ${isToday ? '<span style="background: #ffc107; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">HOY</span>' : ''}
                ${isPast ? '<span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">PASADO</span>' : ''}
              </div>
              <div style="color: #495057; font-size: 0.95em;">
                <div>📅 <strong>Fecha:</strong> ${booking.date}</div>
                <div>⏰ <strong>Hora:</strong> ${booking.time}</div>
                <div>💰 <strong>Precio:</strong> $${booking.price}</div>
                <div>🆔 <strong>Reserva #:</strong> ${booking.id}</div>
              </div>
            </div>
            
            <div style="
              display: flex;
              flex-direction: column;
              gap: 8px;
              min-width: 120px;
            ">
              <button onclick="editBooking(${booking.id})" style="
                background: #17a2b8;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 5px;
                justify-content: center;
              ">
                ✏️ Modificar
              </button>
              
              <button onclick="cancelBooking(${booking.id}, '${booking.service}', '${booking.date} ${booking.time}')" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 5px;
                justify-content: center;
              ">
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    myBookingsList.innerHTML = bookingsHTML;
    console.log(`✅ ${bookings.length} turno(s) cargado(s) para el usuario`);
    
  } catch (error) {
    console.error('❌ Error cargando turnos:', error);
    myBookingsList.innerHTML = `
      <div style="color: #dc3545; text-align: center; padding: 20px;">
        <p>⚠️ Error al cargar tus turnos</p>
        <p style="font-size: 0.9em;">${error.message}</p>
      </div>
    `;
  }
}

// ---------- FUNCIÓN: Cancelar turno ----------
async function cancelBooking(bookingId, service, datetime) {
  const confirmCancel = confirm(
    `¿Estás seguro de cancelar este turno?\n\n` +
    `Servicio: ${service}\n` +
    `Fecha y hora: ${datetime}\n\n` +
    `Esta acción no se puede deshacer.`
  );
  
  if (!confirmCancel) return;
  
  try {
    // Cambiar estado a 'cancelled' en lugar de eliminar
    const response = await fetch(`${GAS_URL}/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: { 
        apikey: SUPA_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    if (response.ok) {
      alert('✅ Turno cancelado exitosamente');
      
      // Actualizar la lista
      loadMyBookings();
      
      // Notificar al admin
      window.dispatchEvent(new CustomEvent('bookingCancelled'));
    } else {
      throw new Error(`Error ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error cancelando turno:', error);
    alert('❌ Error al cancelar el turno: ' + error.message);
  }
}

// ========== CARGAR OFERTAS EN FORMULARIO DE RESERVA ==========

// Función para cargar ofertas en el selector
async function loadOffersIntoForm() {
  try {
    const offerSelect = document.getElementById('offerSelect');
    if (!offerSelect) return;
    
    const offers = await loadAllOffers();
    
    if (!offers || offers.length === 0) {
      offerSelect.innerHTML = '<option value="">No hay ofertas disponibles</option>';
      return;
    }
    
    // Limpiar y agregar opciones (manteniendo la primera opción)
    const firstOption = offerSelect.options[0];
    offerSelect.innerHTML = '';
    offerSelect.appendChild(firstOption);
    
    // Agregar cada oferta
    offers.forEach(offer => {
      if (offer.active !== false) { // Solo ofertas activas
        const option = document.createElement('option');
        option.value = offer.id;
        option.textContent = `${offer.text} - $${offer.price} (${offer.duration} min)`;
        option.dataset.price = offer.price;
        option.dataset.text = offer.text;
        option.dataset.description = offer.description || '';
        offerSelect.appendChild(option);
      }
    });
    
    // Configurar evento change
    offerSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      const offerDescription = document.getElementById('offerDescription');
      const serviceSelect = document.getElementById('service');
      
      if (this.value && selectedOption.dataset.description) {
        // Mostrar descripción
        offerDescription.innerHTML = `<strong>📝 Descripción:</strong> ${selectedOption.dataset.description}`;
        offerDescription.style.display = 'block';
        
        // Actualizar selector de servicio con la oferta seleccionada
        if (serviceSelect) {
          serviceSelect.innerHTML = `
            <option value="${selectedOption.dataset.text}" selected>
              ${selectedOption.dataset.text} - $${selectedOption.dataset.price}
            </option>
          `;
          
          // Actualizar campo oculto de precio
          const priceInput = document.getElementById('servicePrice');
          if (priceInput) {
            priceInput.value = selectedOption.dataset.price;
          }
        }
      } else {
        // Ocultar descripción
        offerDescription.style.display = 'none';
        
        // Restaurar servicios normales
        if (serviceSelect && !this.value) {
          reloadServices();
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error cargando ofertas en formulario:', error);
  }
}

// Función para mostrar cuenta regresiva en ofertas
function updateOfferCountdowns() {
  const offerElements = document.querySelectorAll('[data-expires-at]');
  
  offerElements.forEach(element => {
    const expiresAt = new Date(element.dataset.expiresAt);
    const now = new Date();
    const diffMs = expiresAt - now;
    
    if (diffMs <= 0) {
      // Oferta expirada
      element.innerHTML = '<span style="color: #dc3545;">⏰ Oferta expirada</span>';
      return;
    }
    
    // Calcular horas y minutos restantes
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Formatear
    let countdownText = '';
    if (diffHours > 0) {
      countdownText += `${diffHours}h `;
    }
    countdownText += `${diffMinutes}m`;
    
    // Actualizar elemento
    element.innerHTML = `
      <span style="color: #28a745; font-weight: bold;">
        ⏳ Válida por: ${countdownText}
      </span>
    `;
  });
}

// Modificar loadOffersIntoForm para incluir cuenta regresiva
async function loadOffersIntoForm() {
  try {
    const offers = await loadAllOffers();
    const offerSelect = document.getElementById('offerSelect');
    const offerContainer = document.getElementById('offersContainer');
    
    if (!offers || offers.length === 0) {
      if (offerContainer) {
        offerContainer.innerHTML = '<p style="text-align: center; font-style: italic;">No hay ofertas disponibles</p>';
      }
      return;
    }
    
    // Filtrar ofertas activas y no expiradas
    const now = new Date();
    const activeOffers = offers.filter(offer => {
      if (offer.active === false) return false;
      if (offer.expires_at) {
        return new Date(offer.expires_at) > now;
      }
      return true; // Si no tiene fecha de expiración, se muestra
    });
    
    if (activeOffers.length === 0) {
      if (offerContainer) {
        offerContainer.innerHTML = '<p style="text-align: center; font-style: italic;">No hay ofertas activas</p>';
      }
      return;
    }
    
    // Actualizar selector en formulario
    if (offerSelect) {
      offerSelect.innerHTML = '<option value="">-- Sin oferta, elegir servicio normal --</option>';
      
      activeOffers.forEach(offer => {
        const option = document.createElement('option');
        option.value = offer.id;
        option.textContent = `${offer.text} - $${offer.price}`;
        option.dataset.price = offer.price;
        option.dataset.text = offer.text;
        option.dataset.description = offer.description || '';
        option.dataset.expiresAt = offer.expires_at;
        offerSelect.appendChild(option);
      });
    }
    
    // Actualizar sección visual de ofertas
    if (offerContainer) {
      offerContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${activeOffers.map(offer => `
            <div style="
              background: rgba(255, 255, 255, 0.2);
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 1.1em;">${offer.text}</strong>
                  <div style="font-size: 1.2em; font-weight: bold; color: #ffc107;">
                    $${offer.price}
                  </div>
                </div>
                <div id="countdown-${offer.id}" data-expires-at="${offer.expires_at}" style="
                  background: rgba(0, 0, 0, 0.3);
                  padding: 5px 10px;
                  border-radius: 20px;
                  font-size: 0.9em;
                ">
                  Cargando...
                </div>
              </div>
              ${offer.description ? `<div style="margin-top: 8px; font-style: italic;">${offer.description}</div>` : ''}
              <div style="margin-top: 8px; font-size: 0.9em; opacity: 0.9;">
                ⏱️ ${offer.duration_minutes || 60} min
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      // Iniciar cuenta regresiva
      updateOfferCountdowns();
      // Actualizar cada minuto
      setInterval(updateOfferCountdowns, 60000);
    }
    
  } catch (error) {
    console.error('❌ Error cargando ofertas:', error);
  }
}

// ========== MODIFICAR saveBooking PARA OFERTAS ==========

// Función modificada para manejar ofertas
async function saveBookingWithOffer(data) {
  const offerSelect = document.getElementById('offerSelect');
  
  // Si hay una oferta seleccionada, agregar info
  if (offerSelect && offerSelect.value) {
    data.is_offer = true;
    data.offer_id = offerSelect.value;
    data.offer_price = offerSelect.options[offerSelect.selectedIndex].dataset.price;
  }
  
  return await saveBooking(data);
}

// ========== MODIFICAR EL EVENTO SUBMIT DEL FORMULARIO ==========

// Busca en tu app.js donde está el evento submit del formulario
// y reemplaza la llamada a saveBooking por saveBookingWithOffer

// EJEMPLO: Si tienes algo así:
// bookingForm.onsubmit = async (e) => {
//   e.preventDefault();
//   const data = { ... };
//   const result = await saveBooking(data); // ← CAMBIAR ESTO
// };

// POR ESTO:
// bookingForm.onsubmit = async (e) => {
//   e.preventDefault();
//   const data = { ... };
//   const result = await saveBookingWithOffer(data); // ← POR ESTO
// };

// ========== INICIALIZACIÓN ==========

// En tu función principal (DOMContentLoaded), agrega:
document.addEventListener('DOMContentLoaded', async function() {
  // ... tu código existente ...
  
  // ✅ AGREGAR ESTAS LÍNEAS:
  await loadOffersIntoForm();
  
  // Escuchar cuando se publican nuevas ofertas
  window.addEventListener('offersUpdated', function() {
    console.log('🔄 Ofertas actualizadas, recargando selector...');
    loadOffersIntoForm();
  });
});

// ========== AGREGAR A app.js FUNCIONES NECESARIAS ==========

// Si no tienes estas funciones en app.js, agrégalas:
async function reloadServices() {
  const services = await loadServices();
  const serviceSelect = document.getElementById('service');
  
  if (!serviceSelect) return;
  
  serviceSelect.innerHTML = '<option value="">-- Selecciona un servicio --</option>';
  
  services.forEach(s => {
    const option = document.createElement('option');
    option.value = s.name;
    option.textContent = `${s.name} – $${s.price}`;
    option.dataset.price = s.price;
    serviceSelect.appendChild(option);
  });
  
  // Configurar evento para actualizar precio oculto
  serviceSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const priceInput = document.getElementById('servicePrice');
    
    if (priceInput && selectedOption.dataset.price) {
      priceInput.value = selectedOption.dataset.price;
    }
  });
}

// ---------- FUNCIÓN: Editar turno ----------
async function editBooking(bookingId) {
  try {
    // Cargar datos del turno
    const response = await fetch(
      `${GAS_URL}/bookings?id=eq.${bookingId}`,
      { headers: { apikey: SUPA_KEY } }
    );
    
    const booking = (await response.json())[0];
    if (!booking) throw new Error('Turno no encontrado');
    
    // Verificar que no sea un turno pasado
    const today = new Date().toISOString().split('T')[0];
    if (booking.date < today) {
      alert('⚠️ No se pueden modificar turnos pasados');
      return;
    }
    
    // Llenar formulario de edición
    document.getElementById('editBookingId').value = bookingId;
    document.getElementById('editDate').value = booking.date;
    document.getElementById('editDate').min = today;
    
    // Llenar select de servicios
    const editServiceSelect = document.getElementById('editService');
    editServiceSelect.innerHTML = '';
    
    const services = await loadServices();
    services.forEach(s => {
      const option = document.createElement('option');
      option.value = s.name;
      option.textContent = `${s.name} – $${s.price}`;
      option.selected = s.name === booking.service;
      editServiceSelect.appendChild(option);
    });
    
    // Llenar select de horas
    const editTimeSelect = document.getElementById('editTime');
    editTimeSelect.innerHTML = '';
    
    const hours = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];
    hours.forEach(h => {
      const option = document.createElement('option');
      option.value = h;
      option.textContent = h;
      option.selected = h === booking.time;
      editTimeSelect.appendChild(option);
    });
    
    // Mostrar formulario de edición
    document.getElementById('bookingActions').style.display = 'block';
    
    // Scroll al formulario
    document.getElementById('bookingActions').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('❌ Error preparando edición:', error);
    alert('Error: ' + error.message);
  }
}

// ---------- FORMULARIO DE EDICIÓN ----------
document.getElementById('editBookingForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const bookingId = document.getElementById('editBookingId').value;
  const newDate = document.getElementById('editDate').value;
  const newTime = document.getElementById('editTime').value;
  const newService = document.getElementById('editService').value;
  
  // Verificar disponibilidad del nuevo horario
  try {
    const availabilityCheck = await fetch(
      `${GAS_URL}/bookings?date=eq.${newDate}&time=eq.${newTime}&status=eq.pending&select=id`,
      { headers: { apikey: SUPA_KEY } }
    );
    
    const existing = await availabilityCheck.json();
    
    // Si hay otro turno en ese horario (y no es el mismo)
    if (existing.length > 0 && existing[0].id != bookingId) {
      alert('❌ Este horario ya está ocupado. Por favor, elegí otro.');
      return;
    }
    
    // Obtener precio del nuevo servicio
    const serviceText = document.getElementById('editService').selectedOptions[0]?.text || '';
    const priceMatch = serviceText.match(/\$(\d+)/);
    const newPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Actualizar turno
    const updateResponse = await fetch(`${GAS_URL}/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: { 
        apikey: SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        date: newDate,
        time: newTime,
        service: newService,
        price: newPrice,
        updated_at: new Date().toISOString()
      })
    });
    
    if (updateResponse.ok) {
      alert('✅ Turno actualizado exitosamente');
      
      // Ocultar formulario de edición
      document.getElementById('bookingActions').style.display = 'none';
      
      // Actualizar lista de turnos
      loadMyBookings();
      
      // Notificar al admin
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } else {
      throw new Error(`Error ${updateResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error actualizando turno:', error);
    alert('❌ Error al actualizar el turno: ' + error.message);
  }
});

// Botón para cancelar edición
document.getElementById('cancelEditBtn')?.addEventListener('click', function() {
  document.getElementById('bookingActions').style.display = 'none';
  document.getElementById('editBookingForm').reset();
});

// ---------- INICIALIZACIÓN ----------
// Escuchar cambios de autenticación
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // Cargar turnos del usuario
    setTimeout(loadMyBookings, 1000);
    
    // Actualizar turnos cada 30 segundos
    setInterval(loadMyBookings, 30000);
  }
});

// Actualizar turnos cuando se reserva uno nuevo
window.addEventListener('newBooking', function() {
  setTimeout(loadMyBookings, 2000);
});

// Hacer funciones globales para los botones onclick
window.cancelBooking = cancelBooking;
window.editBooking = editBooking;

console.log('✅ Sistema de gestión de turnos cargado');

// Crear elemento para ofertas si no existe
const offerSel = document.getElementById('offer') || createOfferSelect();

function createOfferSelect() {
  const container = document.createElement('div');
  container.style.cssText = `
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;
  
  container.innerHTML = `
    <h3 style="margin-top: 0; color: #333; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 1.2em;">🎁</span> Ofertas Especiales
    </h3>
    <select id="offer" style="
      width: 100%;
      padding: 10px;
      border: 2px solid #007bff;
      border-radius: 5px;
      font-size: 16px;
      background: white;
      cursor: pointer;
      transition: border-color 0.3s;
    ">
      <option value="">-- Selecciona una oferta --</option>
    </select>
    <div id="offerDescription" style="
      margin-top: 10px;
      padding: 12px;
      background: #e7f3ff;
      border-radius: 5px;
      border-left: 4px solid #007bff;
      display: none;
      font-size: 14px;
      line-height: 1.5;
    "></div>
  `;
  
  // Insertar antes del formulario de reserva
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.parentNode.insertBefore(container, bookingForm);
  } else {
    document.body.prepend(container);
  }
  
  return document.getElementById('offer');
}

// ---------- CARGAR OFERTAS EN EL SELECT ----------
async function loadOffersIntoSelect() {
  try {
    if (typeof loadAllOffers !== 'function') {
      console.warn('loadAllOffers no está disponible');
      return;
    }
    
    const offers = await loadAllOffers();
    const select = document.getElementById('offer');
    const descriptionDiv = document.getElementById('offerDescription');
    
    if (!select) return;
    
    // Guardar la opción seleccionada actual
    const currentValue = select.value;
    
    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    if (offers.length === 0) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No hay ofertas disponibles";
      select.appendChild(option);
      descriptionDiv.style.display = 'none';
      return;
    }
    
    // Agregar cada oferta como opción
    offers.forEach(offer => {
      const option = document.createElement('option');
      option.value = offer.id || offer.text;
      
      // Formato: "Texto – $Precio" (similar a servicios)
      let optionText = offer.text;
      if (offer.price) {
        optionText += ` – $${offer.price}`;
      }
      option.textContent = optionText;
      
      // Guardar datos completos en el option
      option.dataset.description = offer.description || offer.text;
      option.dataset.price = offer.price || '';
      option.dataset.duration = offer.duration || '';
      option.dataset.details = offer.details || '';
      
      select.appendChild(option);
    });
    
    // Restaurar la selección anterior si existe
    if (currentValue) {
      select.value = currentValue;
      triggerOfferChange(select);
    }
    
    console.log(`✅ ${offers.length} oferta(s) cargada(s)`);
    
  } catch (error) {
    console.error('❌ Error cargando ofertas:', error);
    const select = document.getElementById('offer');
    if (select) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "Error cargando ofertas";
      select.appendChild(option);
    }
  }
}

// Función para mostrar detalles de oferta seleccionada
function triggerOfferChange(select) {
  const descriptionDiv = document.getElementById('offerDescription');
  const selectedOption = select.options[select.selectedIndex];
  
  if (select.value && selectedOption.dataset.description) {
    let descriptionHTML = '';
    
    if (selectedOption.dataset.description) {
      descriptionHTML += `<div style="margin-bottom: 8px;"><strong>📝 Descripción:</strong> ${selectedOption.dataset.description}</div>`;
    }
    
    if (selectedOption.dataset.price) {
      descriptionHTML += `<div style="margin-bottom: 8px;"><strong>💰 Precio especial:</strong> $${selectedOption.dataset.price}</div>`;
    }
    
    if (selectedOption.dataset.duration) {
      descriptionHTML += `<div style="margin-bottom: 8px;"><strong>⏱️ Duración:</strong> ${selectedOption.dataset.duration}</div>`;
    }
    
    if (selectedOption.dataset.details) {
      descriptionHTML += `<div style="margin-bottom: 8px;"><strong>🔍 Detalles:</strong> ${selectedOption.dataset.details}</div>`;
    }
    
    descriptionDiv.innerHTML = descriptionHTML;
    descriptionDiv.style.display = 'block';
  } else {
    descriptionDiv.style.display = 'none';
  }
}

// ---------- cargar servicios ----------
loadServices().then(list => {
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = `${s.name} – $${s.price}`;
    serviceSel.appendChild(opt);
  });
  
  // Cargar ofertas después de servicios
  setTimeout(loadOffersIntoSelect, 100);
});

// horarios fijos
const hours = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];
hours.forEach(h => {
  const opt = document.createElement('option');
  opt.value = h;
  opt.textContent = h;
  timeSel.appendChild(opt);
});

// mínimo hoy
dateInput.min = new Date().toISOString().split('T')[0];

// ---------- FUNCIÓN: Verificar horarios ocupados ----------
async function checkAvailableTimes(selectedDate) {
  if (!selectedDate) return;
  
  try {
    const response = await fetch(
      `${GAS_URL}/bookings?date=eq.${selectedDate}&select=time`,
      { headers: { apikey: SUPA_KEY } }
    );
    
    const bookedTimes = await response.json();
    const occupiedTimes = bookedTimes.map(b => b.time);
    
    updateTimeOptions(occupiedTimes);
    showAvailability(occupiedTimes);
    
  } catch (error) {
    console.warn('⚠️ No se pudieron verificar horarios:', error);
  }
}

// ---------- FUNCIÓN: Actualizar opciones de horario ----------
function updateTimeOptions(occupiedTimes) {
  const options = timeSel.options;
  
  for (let i = 0; i < options.length; i++) {
    const time = options[i].value;
    
    if (occupiedTimes.includes(time)) {
      // Horario ocupado
      options[i].disabled = true;
      options[i].textContent = `${time} - ❌ OCUPADO`;
      options[i].style.color = '#999';
      options[i].style.backgroundColor = '#f5f5f5';
    } else {
      // Horario disponible
      options[i].disabled = false;
      options[i].textContent = time;
      options[i].style.color = '';
      options[i].style.backgroundColor = '';
    }
  }
}

// ---------- FUNCIÓN: Mostrar disponibilidad ----------
function showAvailability(occupiedTimes) {
  const availableCount = hours.length - occupiedTimes.length;
  
  if (availableCount === 0) {
    timeAvailability.innerHTML = `
      <div style="color: #d32f2f; background: #ffebee; padding: 8px; border-radius: 4px;">
        ⚠️ No hay horarios disponibles para esta fecha
      </div>
    `;
    timeAvailability.style.display = 'block';
  } else if (occupiedTimes.length > 0) {
    timeAvailability.innerHTML = `
      <div style="color: #1976d2; background: #e3f2fd; padding: 8px; border-radius: 4px;">
        📅 ${availableCount} horario(s) disponible(s) | 
        Ocupados: ${occupiedTimes.join(', ')}
      </div>
    `;
    timeAvailability.style.display = 'block';
  } else {
    timeAvailability.style.display = 'none';
  }
}

// ---------- EVENTO: Cambio de fecha ----------
dateInput.addEventListener('change', function() {
  if (this.value) {
    checkAvailableTimes(this.value);
  }
});

// ---------- EVENTO: Cambio de oferta ----------
if (offerSel) {
  offerSel.addEventListener('change', function() {
    triggerOfferChange(this);
  });
}

// ---------- VALIDACIÓN: Verificar duplicado antes de guardar ----------
async function isTimeAvailable(date, time) {
  try {
    const response = await fetch(
      `${GAS_URL}/bookings?date=eq.${date}&time=eq.${time}&select=id`,
      { headers: { apikey: SUPA_KEY } }
    );
    
    const existing = await response.json();
    return existing.length === 0; // True si está disponible
    
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    return false; // Por seguridad, no permitir si hay error
  }
}

// ---------- manejar reserva ----------
form.onsubmit = async (e) => {
  e.preventDefault();
  
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Primero iniciá sesión');
    return;
  }
  
  // Validar fecha seleccionada
  if (!dateInput.value) {
    alert('Por favor, selecciona una fecha');
    return;
  }
  
  // Validar horario seleccionado
  const selectedTime = timeSel.value;
  if (!selectedTime || timeSel.selectedOptions[0]?.disabled) {
    alert('Por favor, selecciona un horario disponible');
    return;
  }
  
  // Verificar disponibilidad FINAL (por si alguien reservó en el mismo momento)
  const isAvailable = await isTimeAvailable(dateInput.value, selectedTime);
  if (!isAvailable) {
    alert('⚠️ Este horario ya fue reservado. Por favor, selecciona otro.');
    checkAvailableTimes(dateInput.value); // Actualizar lista
    return;
  }
  
  // Obtener precio del servicio seleccionado
  const serviceText = serviceSel.selectedOptions[0]?.text || '';
  const priceMatch = serviceText.match(/\$(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1]) : 0;
  
  const bookingData = {
    uid: user.uid,
    name: user.displayName || 'Cliente',
    email: user.email || '',
    service: serviceSel.value,
    date: dateInput.value,
    time: selectedTime,
    price: price
  };
  
  console.log('📤 Turno a guardar:', bookingData);
  
  try {
    // Verificar que saveBooking existe
    if (typeof saveBooking !== 'function') {
      throw new Error('saveBooking no está disponible');
    }
    
    // Guardar
    const result = await saveBooking(bookingData);
    console.log('✅ Resultado:', result);
    
    // Mostrar éxito
    msg.textContent = '¡Turno reservado con éxito!';
    msg.style.color = 'green';
    
    // Actualizar disponibilidad después de reservar
    checkAvailableTimes(dateInput.value);
    
    // Limpiar formulario
    form.reset();
    
    // Notificar nueva reserva
    window.dispatchEvent(new CustomEvent('newBooking', { 
      detail: { 
        date: bookingData.date,
        time: bookingData.time,
        service: bookingData.service
      }
    }));
    
    console.log('📢 Evento newBooking disparado');
    
  } catch (error) {
    console.error('❌ Error:', error);
    msg.textContent = 'Error: ' + error.message;
    msg.style.color = 'red';
    alert('Error al reservar: ' + error.message);
  }
};

// ---------- MOSTRAR OFERTAS EN LA SECCIÓN ----------
async function displayOffers() {
  try {
    if (typeof loadOffers !== 'function') return;
    
    const offers = await loadOffers();
    const container = document.getElementById('offersContainer');
    
    if (!container) return;
    
    if (offers.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="font-style: italic;">No hay ofertas disponibles en este momento.</p>
          <p style="font-size: 0.9em; opacity: 0.8;">Vuelve pronto para ver nuestras promociones especiales.</p>
        </div>
      `;
      return;
    }
    
    let offersHTML = '';
    
    offers.forEach((offer, index) => {
      const isSpecial = index === 0; // Destacar la primera oferta
      
      offersHTML += `
        <div style="
          background: ${isSpecial ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          border-left: ${isSpecial ? '4px solid #ffd700' : '4px solid #4CAF50'};
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          ">
            <h3 style="margin: 0; font-size: 1.1em;">
              ${offer.text}
              ${offer.price ? `<span style="color: #ffd700;"> – $${offer.price}</span>` : ''}
            </h3>
            ${isSpecial ? '<span style="background: #ffd700; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">NUEVA</span>' : ''}
          </div>
          
          ${offer.description ? `
            <p style="margin: 8px 0; font-size: 0.95em; opacity: 0.9;">
              ${offer.description}
            </p>
          ` : ''}
          
          ${offer.duration ? `
            <div style="
              display: flex;
              align-items: center;
              gap: 5px;
              font-size: 0.9em;
              opacity: 0.8;
              margin-top: 5px;
            ">
              <span>⏱️</span>
              <span>${offer.duration}</span>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    container.innerHTML = offersHTML;
    
  } catch (error) {
    console.error('❌ Error mostrando ofertas:', error);
    const container = document.getElementById('offersContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; color: #ff6b6b; padding: 20px;">
          <p>⚠️ No se pudieron cargar las ofertas en este momento.</p>
        </div>
      `;
    }
  }
}

// Cargar ofertas al inicio
document.addEventListener('DOMContentLoaded', function() {
  displayOffers();
  
  // Actualizar ofertas cada 30 segundos
  setInterval(displayOffers, 30000);
});

// Escuchar cuando el admin actualice ofertas
window.addEventListener('offersUpdated', function() {
  console.log('📢 Ofertas actualizadas, recargando...');
  setTimeout(displayOffers, 1000);
});

// ---------- INICIALIZAR ----------
// Verificar disponibilidad si ya hay fecha seleccionada
if (dateInput.value) {
  checkAvailableTimes(dateInput.value);
}

// Cargar ofertas al iniciar
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(loadOffersIntoSelect, 500);
  
  // Actualizar ofertas cada 60 segundos
  setInterval(loadOffersIntoSelect, 60000);
});

// Escuchar cuando el admin actualiza ofertas
window.addEventListener('offersUpdated', function() {
  console.log('📢 Ofertas actualizadas, recargando...');
  setTimeout(loadOffersIntoSelect, 1000);
});

console.log('✅ app.js cargado - Sistema de disponibilidad y ofertas activo');