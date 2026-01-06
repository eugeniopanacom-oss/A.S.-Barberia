const serviceSel = document.getElementById('service');
const dateInput = document.getElementById('date');
const timeSel = document.getElementById('time');
const form = document.getElementById('bookingForm');
const msg = document.getElementById('msg');

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

// ---------- manejar reserva ----------
form.onsubmit = async (e) => {
  e.preventDefault();
  
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Primero iniciá sesión');
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
    time: timeSel.value,
    price: price
    // ⬅️ SIN 'created' - la tabla usa 'created_at' automático
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
    
    // Limpiar formulario
    form.reset();
    
    // Actualizar métricas si existe
    if (typeof loadMetrics === 'function') {
      setTimeout(() => loadMetrics(), 1000);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    msg.textContent = 'Error: ' + error.message;
    msg.style.color = 'red';
    alert('Error al reservar: ' + error.message);
  }
};

console.log('✅ app.js cargado - formulario listo');