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
  console.log('Turno a guardar:', data);   // ← debug para ver qué fecha/hora se envía
  await saveBooking(data);
  // Busca donde se llame a saveBooking y agrega:
  console.log('🟡 Botón de reserva clickeado');
  msg.textContent = '¡Turno reservado!';
  form.reset();
};