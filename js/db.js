// ========== SUPABASE CONFIG ==========
const SUPA_URL = 'https://athjkugyucogikjlwxbz.supabase.co';
const SUPA_KEY = 'sb_publishable_JE1Toit6Fr-BPDtCbRrlpA_Tr94QgAv'; // TU ANON KEY
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

async function saveBooking(data) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).add(data);
  await tx.complete;
  syncBookings(); // intentamos enviar a Supabase
}

async function syncBookings() {
  const db = await openDB();
  const all = await db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
  if (!all.length) return;
  for (const b of all) {
    await fetch(`${GAS_URL}/bookings`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(b)
    });
  }
  // borramos local
  const tx = db.transaction(storeName, 'readwrite');
  all.forEach(b => tx.objectStore(storeName).delete(b.id));
  await tx.complete;
}