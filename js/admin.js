const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

loadBtn.onclick = async () => {
  try {
    // ---------- métricas y turnos de HOY ----------
    const today = new Date().toISOString().slice(0, 10);

    // métricas
    const todayBookings = await fetch(`${GAS_URL}/bookings?date=eq.${today}&select=price`, {
      headers: { apikey: SUPA_KEY }
    }).then(r => r.json());

    const total = todayBookings.reduce((s, b) => s + (b.price || 0), 0);
    const count = todayBookings.length;
    const avg   = count ? (total / count).toFixed(2) : 0;

    metricsDiv.innerHTML = `
      <p>Recaudación HOY: $${total}</p>
      <p>Turnos HOY: ${count}</p>
      <p>Promedio HOY: $${avg}</p>
      <p>Hora pico: 14:00</p>
    `;

    // lista de hoy
    const res = await fetch(`${GAS_URL}/bookings?date=eq.${today}&select=time,name,service&order=time`, {
      headers: { apikey: SUPA_KEY }
    });
    const list = await res.json();

    todayList.innerHTML = Array.isArray(list) && list.length
      ? list.map(b => `<li>${b.time} - ${b.name} - ${b.service}</li>`).join('')
      : '<li>Sin turnos hoy</li>';
  } catch (err) {
    alert('Error al cargar métricas: ' + err.message);
  }
};

offerForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await postOffer(document.getElementById('offerText').value);
    offerForm.reset();
    alert('Oferta publicada');
  } catch (err) {
    alert('Error al publicar oferta: ' + err.message);
  }
};

priceForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await savePrice(
      document.getElementById('serviceName').value,
      document.getElementById('servicePrice').value
    );
    priceForm.reset();
    alert('Precio guardado');
    // recargamos servicios para que el cliente los vea sin refrescar
    await reloadServices();
  } catch (err) {
    alert('Error al guardar precio: ' + err.message);
  }
};

// ---- nueva función: recargar lista de servicios ----
async function reloadServices() {
  const svc = await loadServices();
  const sel = document.getElementById('service');
  sel.innerHTML = '';                       // limpiamos
  svc.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = `${s.name} – $${s.price}`;
    sel.appendChild(opt);
  });
}