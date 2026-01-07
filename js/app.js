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