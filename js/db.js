// ========== SUPABASE CONFIG ==========
const SUPA_URL = 'https://athjkugyucogikjlwxbz.supabase.co';
const SUPA_KEY = 'sb_publishable_JE1Toit6Fr-BPDtCbRrlpA_Tr94QgAv';
const GAS_URL = `${SUPA_URL}/rest/v1`;

// ========== FIREBASE (AUTH) ==========
const firebaseConfig = {
  apiKey: "AIzaSyDaevmlZwskjQQhQfGOpFriPNwg4Kx2OeE",
  authDomain: "as-barber2.firebaseapp.com",
  projectId: "as-barber2",
  appId: "1:438163815866:web:6b18d7746e8c7874693183"
};
firebase.initializeApp(firebaseConfig);

// ========== SUPABASE FUNCIONES ==========
async function loadServices() {
  const res = await fetch(`${GAS_URL}/services?select=*&order=id`, {
    headers: { apikey: SUPA_KEY }
  });
  return res.json();
}

async function loadMetrics() {
  const res = await fetch(`${GAS_URL}/bookings?select=price`, {
    headers: { apikey: SUPA_KEY }
  });
  const rows = await res.json();
  const total = rows.reduce((s, b) => s + (b.price || 0), 0);
  const count = rows.length;
  const avg = count ? (total / count).toFixed(2) : 0;
  return { total, count, avg, peak: '14:00' };
}

async function postOffer(text) {
  await fetch(`${GAS_URL}/offers`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

async function savePrice(name, price) {
  await fetch(`${GAS_URL}/services`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price })
  });
}

// ========== INDEXEDDB (OFFLINE) ==========
const dbName = 'asDB';
const storeName = 'bookings';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ========== SAVEBOOKING FUNCIONAL ==========
async function saveBooking(data) {
  console.log('💾 saveBooking ejecutando...', data);
  
  try {
    // Intentar Supabase directamente
    const response = await fetch(`${GAS_URL}/bookings`, {
      method: 'POST',
      headers: { 
        apikey: SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    console.log('📡 Status:', response.status);
    
    if (response.ok) {
      // Verificar si la respuesta tiene contenido JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log('✅ Guardado en Supabase:', result);
        return result;
      } else {
        // Respuesta exitosa pero vacía
        console.log('✅ Guardado en Supabase (respuesta vacía)');
        return { success: true, status: response.status, data: data };
      }
    } else {
      const errorText = await response.text();
      console.warn('⚠️ Supabase falló:', errorText);
      
      // Fallback a IndexedDB
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      const bookingWithMeta = {
        ...data,
        id: Date.now(),
        created_at: new Date().toISOString(),
        status: 'pending_sync'
      };
      
      await store.add(bookingWithMeta);
      await tx.complete;
      
      console.log('💾 Guardado en IndexedDB:', bookingWithMeta);
      return bookingWithMeta;
    }
    
  } catch (error) {
    console.error('💥 Error crítico:', error);
    throw error;
  }
}

async function syncBookings() {
  const db = await openDB();
  const all = await db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
  if (!all.length) return;
  
  for (const b of all) {
    try {
      await fetch(`${GAS_URL}/bookings`, {
        method: 'POST',
        headers: { 
          apikey: SUPA_KEY, 
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(b)
      });
      // Si éxito, borrar
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(b.id);
    } catch (e) {
      console.warn('No se pudo sincronizar:', b.id);
    }
  }
}

// ========== EXPORTAR ==========
window.saveBooking = saveBooking;
window.loadServices = loadServices;
window.loadMetrics = loadMetrics;

console.log('✅ db.js cargado - saveBooking lista');