const serviceSel = document.getElementById('service');
const dateInput = document.getElementById('date');
const timeSel = document.getElementById('time');
const form = document.getElementById('bookingForm');
const msg = document.getElementById('msg');

// ---------- cargar servicios + horarios ----------
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

form.onsubmit = async (e) => {
  e.preventDefault();
  const user = firebase.auth().currentUser;
  if (!user) return alert('Primero iniciá sesión');
  const data = {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    service: serviceSel.value,
    date: dateInput.value,
    time: timeSel.value,
    price: serviceSel.selectedOptions[0].text.split('$')[1],
    created: new Date().toISOString()
  };
  console.log('Turno a guardar:', data);

  try {
    if (typeof saveBooking !== 'undefined') {
     // CORRECCIÓN en app.js:
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  console.log('💾 Guardando turno desde formulario...');
  
  // OBTENER los valores del formulario
  const bookingData = {
    name: document.getElementById('name')?.value || '',
    email: document.getElementById('email')?.value || '',
    service: document.getElementById('service')?.value || '',
    date: document.getElementById('date')?.value || '',
    time: document.getElementById('time')?.value || '',
    price: parseInt(document.getElementById('price')?.value) || 0,
    uid: firebase.auth().currentUser?.uid || 'guest'
  };
  
  console.log('📦 Datos del formulario:', bookingData);
  
  // Validar campos obligatorios
  if (!bookingData.name || !bookingData.email || !bookingData.service) {
    alert('Por favor, completa todos los campos');
    return;
  }
  
  // Guardar
  try {
    await saveBooking(bookingData);
    console.log('✅ Turno guardado exitosamente');
    alert('¡Turno reservado con éxito!');
    
    // Limpiar formulario (opcional)
    this.reset();
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    alert('Error al reservar turno: ' + error.message);
  }
});
      await saveBooking(data);
      console.log('✅ saveBooking completado');
    } else {
      console.error('❌ ERROR: saveBooking no está definida');
      console.log('Usando fetch directo como fallback...');
      
      const response = await fetch(`${GAS_URL}/bookings`, {
        method: 'POST',
        headers: { 
          apikey: SUPA_KEY, 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      console.log('✅ Enviado via fetch:', result);
    }
    msg.textContent = '¡Turno reservado!';
    form.reset();
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error al reservar turno: ' + error.message);
  }
};