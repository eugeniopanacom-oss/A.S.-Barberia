// Configurá tu proyecto Firebase gratis
const firebaseConfig = {
  apiKey: "AIzaSyDaevmlZwskjQQhQfGOpFriPNwg4Kx2OeE",
  authDomain: "as-barber2.firebaseapp.com",
  projectId: "as-barber2",
  appId: "1:438163815866:web:6b18d7746e8c7874693183"
};
firebase.initializeApp(firebaseConfig);

// URL del Google Apps Script (paso 4)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyJI0LtWqAUfASJ4E_3SuuftO1K5TFmh0SQ6SL__cOPOjae67Y1s75xot1D3wLxxLZSQg/exec';

// IndexedDB local para offline
const dbName = 'asDB';
const storeName = 'bookings';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName, {keyPath: 'id', autoIncrement: true});
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// Guardar turno localmente y después intentar enviar al sheet
async function saveBooking(data) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).add(data);
  await tx.complete;
  // Intentar sync
  syncBookings();
}

// Sync con Google Sheets
async function syncBookings() {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const all = await tx.objectStore(storeName).getAll();
  if (!all.length) return;
  try {
    await fetch(GAS_URL, {method: 'POST', body: JSON.stringify({bookings: all})});
    // Si llegó, borramos local
    const tx2 = db.transaction(storeName, 'readwrite');
    all.forEach(b => tx2.objectStore(storeName).delete(b.id));
    await tx2.complete;
  } catch (e) {
    console.warn('Sync falló, se reintenta más tarde');
  }
}

// Cargar servicios y precios (desde sheet)
async function loadServices() {
  const res = await fetch(GAS_URL + '?action=getServices');
  return res.json();
}

// Cargar métricas
async function loadMetrics() {
  const res = await fetch(GAS_URL + '?action=metrics');
  return res.json();
}

// Publicar oferta
async function postOffer(text) {
  await fetch(GAS_URL, {method: 'POST', body: JSON.stringify({action: 'offer', text})});
}

// Guardar precio
async function savePrice(name, price) {
  await fetch(GAS_URL, {method: 'POST', body: JSON.stringify({action: 'price', name, price})});
}