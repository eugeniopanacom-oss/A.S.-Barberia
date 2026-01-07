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

// ---------- cargar servicios ----------
loadServices().then(list => {
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = `${s.name} – $${s.price}`;
    serviceSel.appendChild(opt);
  });
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

// ---------- Inicializar ----------
// Verificar disponibilidad si ya hay fecha seleccionada
if (dateInput.value) {
  checkAvailableTimes(dateInput.value);
}

console.log('✅ app.js cargado - Sistema de disponibilidad activo');
