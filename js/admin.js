const loadBtn = document.getElementById('loadMetrics');
const metricsDiv = document.getElementById('metrics');
const todayList = document.getElementById('todayList');
const offerForm = document.getElementById('offerForm');
const priceForm = document.getElementById('priceForm');

// Verificar que los elementos existen
if (!loadBtn || !metricsDiv || !todayList || !offerForm) {
  console.error('❌ Error: Elementos del DOM no encontrados');
}

// Función para verificar y crear formulario de ofertas
function initOfferForm() {
  const offerForm = document.getElementById('offerForm');
  if (!offerForm) return;
  
  // Calcular fecha por defecto (24 horas desde ahora)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const defaultDate = tomorrow.toISOString().split('T')[0];
  const defaultTime = "23:59";
  
  offerForm.innerHTML = `
    <h3>🎁 Publicar Nueva Oferta</h3>
    
    <input type="text" 
           id="offerText" 
           placeholder="Título de la oferta (ej: Corte + Barba)" 
           required 
           style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    
    <input type="number" 
           id="offerPrice" 
           placeholder="Precio especial $" 
           min="0" 
           step="100"
           required
           style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    
    <textarea id="offerDescription" 
              placeholder="Descripción detallada (opcional)" 
              rows="3"
              style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit;"></textarea>
    
    <!-- DURACIÓN EN MINUTOS (mantener para referencia) -->
    <input type="number" 
           id="offerDuration" 
           placeholder="Duración estimada en minutos" 
           min="15" 
           step="15"
           value="60"
           style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    
    <!-- FECHA Y HORA DE EXPIRACIÓN -->
    <div style="display: flex; gap: 10px; margin: 10px 0;">
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">📅 Válida hasta:</label>
        <input type="date" 
               id="offerExpiresDate" 
               value="${defaultDate}"
               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">⏰ Hora límite:</label>
        <input type="time" 
               id="offerExpiresTime" 
               value="${defaultTime}"
               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
    </div>
    
    <button type="submit" 
            style="width: 100%; padding: 12px; margin: 10px 0; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; transition: background 0.3s;">
      Publicar Oferta
    </button>
    
    <div id="offerStatus" style="margin-top: 10px; padding: 10px; border-radius: 4px; display: none;"></div>
  `;
  
  offerForm.onsubmit = handleOfferSubmit;
}

// Función separada para manejar el envío del formulario
async function handleOfferSubmit(e) {
  e.preventDefault();
  
  const statusDiv = document.getElementById('offerStatus');
  statusDiv.style.display = 'block';
  statusDiv.style.background = '#fff3cd';
  statusDiv.style.color = '#856404';
  statusDiv.textContent = 'Publicando oferta...';
  
  try {
    // Obtener valores
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? (element.value || '').trim() : '';
    };
    
    const text = getValue('offerText');
    const price = getValue('offerPrice');
    const description = getValue('offerDescription');
    const duration = getValue('offerDuration');
    const expiresDate = getValue('offerExpiresDate');
    const expiresTime = getValue('offerExpiresTime');
    
    // Validaciones
    if (!text) throw new Error('El título es requerido');
    if (!price || isNaN(price) || Number(price) <= 0) throw new Error('Precio inválido');
    if (!expiresDate) throw new Error('Fecha de expiración requerida');
    
    // Crear fecha de expiración combinando date + time
    const expiresAt = new Date(`${expiresDate}T${expiresTime}:00`);
    
    // Verificar que no sea fecha pasada
    if (expiresAt < new Date()) {
      throw new Error('La fecha de expiración no puede ser en el pasado');
    }
    
    const offerData = {
      text: text,
      price: Number(price),
      description: description || null,
      duration_minutes: duration ? Number(duration) : 60,
      expires_at: expiresAt.toISOString(),
      active: true,
      created_at: new Date().toISOString()
    };
    
    console.log('📤 Enviando oferta:', offerData);
    
    const response = await fetch(`${GAS_URL}/offers`, {
      method: 'POST',
      headers: { 
        'apikey': SUPA_KEY, 
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(offerData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    // Éxito
    statusDiv.style.background = '#d4edda';
    statusDiv.style.color = '#155724';
    statusDiv.textContent = '✅ Oferta publicada con cuenta regresiva';
    
    // Limpiar formulario
    const form = document.getElementById('offerForm');
    if (form) form.reset();
    
    window.dispatchEvent(new CustomEvent('offersUpdated'));
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
    
  } catch (err) {
    console.error('❌ Error:', err);
    statusDiv.style.background = '#f8d7da';
    statusDiv.style.color = '#721c24';
    statusDiv.textContent = `❌ Error: ${err.message}`;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔄 Admin.js inicializando...');
  
  // Inicializar formulario de ofertas
  initOfferForm();
  
  // Configurar botón de métricas si existe
  if (loadBtn) {
    loadBtn.onclick = loadTodayMetrics;
  }
  
  // Cargar métricas automáticamente
  loadTodayMetrics();
  
  // Refrescar automáticamente cada 30 segundos
  setInterval(loadTodayMetrics, 30000);
});

// Escuchar eventos de nueva reserva
window.addEventListener('newBooking', function() {
  console.log('📢 Nueva reserva detectada, actualizando métricas...');
  setTimeout(loadTodayMetrics, 1000);
});

// Manejar formulario de precios
if (priceForm) {
  priceForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const serviceName = document.getElementById('serviceName')?.value;
      const servicePrice = document.getElementById('servicePrice')?.value;
      
      if (!serviceName || !servicePrice) {
        alert('Complete todos los campos');
        return;
      }
      
      await savePrice(serviceName, servicePrice);
      priceForm.reset();
      alert('Precio guardado');
      
      // Recargar servicios
      if (typeof reloadServices === 'function') {
        await reloadServices();
      }
    } catch (err) {
      alert('Error al guardar precio: ' + err.message);
    }
  };
}

// Para escuchar eventos (modificaciones o cancelaciones de turnos)
window.addEventListener('bookingCancelled', function() {
  console.log('📢 Turno cancelado por usuario, actualizando métricas...');
  setTimeout(loadTodayMetrics, 1000);
});

window.addEventListener('bookingUpdated', function() {
  console.log('📢 Turno modificado por usuario, actualizando métricas...');
  setTimeout(loadTodayMetrics, 1000);
});

// Función para marcar turnos pasados como completados
async function markOldBookingsAsCompleted() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const oldBookings = await fetch(
      `${GAS_URL}/bookings?date=lt.${today}&status=eq.pending&select=id,date,name,time`,
      { headers: { apikey: SUPA_KEY } }
    ).then(r => r.json());
    
    if (oldBookings.length === 0) {
      console.log('✅ No hay turnos pasados pendientes');
      return { updated: 0, message: 'No hay turnos pendientes para marcar' };
    }
    
    console.log(`📝 Encontrados ${oldBookings.length} turnos pasados pendientes`);
    
    const confirmUpdate = confirm(
      `¿Marcar ${oldBookings.length} turnos pasados como "completados"?\n\n` +
      `Esto mantendrá el historial pero los marcará como finalizados.`
    );
    
    if (!confirmUpdate) return { updated: 0, message: 'Cancelado' };
    
    let updatedCount = 0;
    for (const booking of oldBookings) {
      try {
        await fetch(`${GAS_URL}/bookings?id=eq.${booking.id}`, {
          method: 'PATCH',
          headers: { 
            apikey: SUPA_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ status: 'completed' })
        });
        updatedCount++;
        console.log(`✅ Marcado como completado: ${booking.date} ${booking.time} - ${booking.name}`);
      } catch (err) {
        console.error(`❌ Error actualizando ${booking.id}:`, err);
      }
    }
    
    alert(`✅ ${updatedCount} turnos marcados como completados`);
    console.log(`🎉 Actualización completada: ${updatedCount} turnos`);
    
    return { updated: updatedCount, total: oldBookings.length };
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error: ' + error.message);
    throw error;
  }
}

// Función para ver ofertas existentes
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

// Función auxiliar para guardar precios (debes tenerla en db.js)
async function savePrice(serviceName, price) {
  if (!window.GAS_URL || !window.SUPA_KEY) {
    throw new Error('Configuración de API no encontrada');
  }
  
  const response = await fetch(`${GAS_URL}/prices`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      name: serviceName,
      price: Number(price),
      created_at: new Date().toISOString()
    })
  });
  
  if (!response.ok) {
    throw new Error(`Error ${response.status} al guardar precio`);
  }
  
  return response;
}

console.log('✅ admin.js cargado correctamente');

// Exportar funciones para uso global
window.markOldBookingsAsCompleted = markOldBookingsAsCompleted;
window.viewExistingOffers = viewExistingOffers;