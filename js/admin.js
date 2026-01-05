const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

loadBtn.onclick = async () => {
  try {
    const m = await loadMetrics();
    metricsDiv.innerHTML = `
      <p>Recaudación total: $${m.total}</p>
      <p>Turnos totales: ${m.count}</p>
      <p>Promedio por turno: $${m.avg}</p>
      <p>Hora pico: ${m.peak}</p>
    `;
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${GAS_URL}?action=today&date=${today}`);
    const list = await res.json();
    todayList.innerHTML = list.map(b => `<li>${b.time} - ${b.name} - ${b.service}</li>`).join('');
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