const serviceSel = document.getElementById('service');
const dateInput = document.getElementById('date');
const timeSel = document.getElementById('time');
const form = document.getElementById('bookingForm');
const msg = document.getElementById('msg');

// Cargar servicios
const data = {
  uid: user.uid,
  name: user.displayName,
  email: user.email,
  service: serviceSel.value,
  date: new Date().toISOString().slice(0, 10), // ← solo YYYY-MM-DD
  time: timeSel.value,
  price: parseInt(serviceSel.selectedOptions[0].text.split('$')[1]),
  created: new Date().toISOString()
};

// Horarios fijos (podes hacerlo dinámico después)
const hours = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];
hours.forEach(h => {
  const opt = document.createElement('option');
  opt.value = h;
  opt.textContent = h;
  timeSel.appendChild(opt);
});

// Minimo hoy
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
  await saveBooking(data);
  msg.textContent = '¡Turno reservado!';
  form.reset();
};