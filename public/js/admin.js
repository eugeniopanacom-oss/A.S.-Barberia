const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

loadBtn.onclick = async () => {
  const m = await loadMetrics();
  metricsDiv.innerHTML = `
    <p>Recaudación total: $${m.total}</p>
    <p>Turnos totales: ${m.count}</p>
    <p>Promedio por turno: $${m.avg}</p>
    <p>Hora pico: ${m.peak}</p>
  `;
  // Turnos hoy
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${GAS_URL}?action=today&date=${today}`);
  const list = await res.json();
  todayList.innerHTML = list.map(b => `<li>${b.time} - ${b.name} - ${b.service}</li>`).join('');
};

offerForm.onsubmit = async (e) => {
  e.preventDefault();
  await postOffer(document.getElementById('offerText').value);
  offerForm.reset();
  alert('Oferta publicada');
};

priceForm.onsubmit = async (e) => {
  e.preventDefault();
  await savePrice(
    document.getElementById('serviceName').value,
    document.getElementById('servicePrice').value
  );
  priceForm.reset();
  alert('Precio guardado');
};