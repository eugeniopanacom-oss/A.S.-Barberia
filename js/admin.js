const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

// Crear campos adicionales para ofertas si no existen
function enhanceOfferForm() {
  if (!offerForm) return;
  
  // Si ya tiene los campos extras, no hacer nada
  if (document.getElementById('offerPrice')) return;
  
  // Agregar campos adicionales
  offerForm.innerHTML = `
    <h3>Publicar Nueva Oferta</h3>
    <input type="text" id="offerText" placeholder="Título de la oferta (ej: Corte + Barba)" required style="
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    ">
    
    <input type="number" id="offerPrice" placeholder="Precio especial $" style="
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    ">
    
    <textarea id="offerDescription" placeholder="Descripción detallada (opcional)" rows="3" style="
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
      font-family: inherit;
    "></textarea>
    
    <input type="text" id="offerDuration" placeholder="Duración estimada (ej: 60 min)" style="
      width: 100%;
      padding: 10px;
      margin: 5px 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box;
    ">
    
    <button type="submit" style="
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    ">Publicar Oferta</button>
    
    <div id="offerStatus" style="
      margin-top: 10px;
      padding: 10px;
      border-radius: 4px;
      display: none;
    "></div>
  `;
}

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
  
  // Mejorar formulario de ofertas
  enhanceOfferForm();
  
  // Refrescar automáticamente cada 30 segundos
  setInterval(loadTodayMetrics, 30000);
});

// Escuchar eventos de nueva reserva
window.addEventListener('newBooking', function() {
  console.log('📢 Nueva reserva detectada, actualizando métricas...');
  setTimeout(loadTodayMetrics, 1000);
});

// FORMULARIO DE OFERTAS MEJORADO
offerForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const statusDiv = document.getElementById('offerStatus');
  statusDiv.style.display = 'block';
  statusDiv.style.background = '#fff3cd';
  statusDiv.style.color = '#856404';
  statusDiv.textContent = 'Publicando oferta...';
  
  try {
    const offerData = {
      text: document.getElementById('offerText').value.trim(),
      price: document.getElementById('offerPrice').value || null,
      description: document.getElementById('offerDescription').value.trim() || '',
      duration: document.getElementById('offerDuration').value.trim() || '',
      created_at: new Date().toISOString()
    };
    
    if (!offerData.text) {
      throw new Error('El título de la oferta es requerido');
    }
    
    await fetch(`${GAS_URL}/offers`, {
      method: 'POST',
      headers: { 
        apikey: SUPA_KEY, 
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(offerData)
    });
    
    // Éxito
    statusDiv.style.background = '#d4edda';
    statusDiv.style.color = '#155724';
    statusDiv.textContent = '✅ Oferta publicada exitosamente';
    
    // Limpiar formulario
    offerForm.reset();
    
    // Notificar a app.js que hay ofertas nuevas
    window.dispatchEvent(new CustomEvent('offersUpdated'));
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
    
  } catch (err) {
    console.error('Error al publicar oferta:', err);
    statusDiv.style.background = '#f8d7da';
    statusDiv.style.color = '#721c24';
    statusDiv.textContent = `❌ Error: ${err.message}`;
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

// ---- función para ver ofertas existentes ----
async function viewExistingOffers() {
  try {
    const offers = await fetch(`${GAS_URL}/offers?select=*&order=created_at.desc`, {
      headers: { apikey: SUPA_KEY }
    }).then(r => r.json());
    
    console.log('Ofertas existentes:', offers);
    return offers;
  } catch (error) {
    console.error('Error viendo ofertas:', error);
    return [];
  }
}

console.log('✅ admin.js cargado - Sistema de ofertas mejorado');