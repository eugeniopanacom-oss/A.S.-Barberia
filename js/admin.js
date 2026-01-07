const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

// FUNCIÓN MEJORADA para cargar métricas
async function loadTodayMetrics() {
  try {
    // Usar fecha ACTUAL, no fija
    const today = new Date().toISOString().split('T')[0]; // ⬅️ FECHA DINÁMICA
    
    // ---------- métricas y turnos de HOY ----------
    const todayBookings = await fetch(`${GAS_URL}/bookings?date=eq.${today}&select=price`, {
      headers: { apikey: SUPA_KEY }
    }).then(r => r.json());

    const total = todayBookings.reduce((s, b) => s + (b.price || 0), 0);
    const count = todayBookings.length;
    const avg   = count ? (total / count).toFixed(2) : 0;

    metricsDiv.innerHTML = `
      <p><strong>Recaudación HOY (${today}):</strong> $${total}</p>
      <p><strong>Turnos HOY:</strong> ${count}</p>
      <p><strong>Promedio HOY:</strong> $${avg}</p>
      <p><strong>Hora pico:</strong> 14:00</p>
    `;

    // lista de hoy
    const res = await fetch(`${GAS_URL}/bookings?date=eq.${today}&select=time,name,service&order=time`, {
      headers: { apikey: SUPA_KEY }
    });
    const list = await res.json();

    todayList.innerHTML = Array.isArray(list) && list.length
      ? list.map(b => `<li><strong>${b.time}</strong> - ${b.name} - ${b.service}</li>`).join('')
      : '<li>Sin turnos hoy</li>';
    
    console.log(`📊 Métricas cargadas para ${today}: ${count} turnos, $${total}`);
    
  } catch (err) {
    console.error('❌ Error al cargar métricas:', err);
    metricsDiv.innerHTML = `<p style="color: red;">Error al cargar métricas: ${err.message}</p>`;
  }
}

// Botón para cargar métricas
loadBtn.onclick = loadTodayMetrics;

// Cargar métricas automáticamente al abrir admin
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔄 Cargando métricas iniciales...');
  loadTodayMetrics();
  
  // Refrescar automáticamente cada 30 segundos
  setInterval(loadTodayMetrics, 30000);
});

// ⬇️⬇️⬇️ AGREGAR ESTO: Escuchar eventos de nueva reserva ⬇️⬇️⬇️
window.addEventListener('newBooking', function() {
  console.log('📢 Nueva reserva detectada, actualizando métricas...');
  setTimeout(loadTodayMetrics, 1000); // Esperar 1s para que Supabase procese
});

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

console.log('✅ admin.js cargado - Métricas se actualizan automáticamente');