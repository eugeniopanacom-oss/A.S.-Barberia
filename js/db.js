// ========== SUPABASE CONFIG ==========
const SUPA_URL = 'https://as-barber.supabase.co';        // tu Project URL
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // tu Anon Key
const GAS_URL = `${SUPA_URL}/rest/v1`;                   // usamos REST de Supabase

// ========== HEADERS CORS YA VIENEN ==========
async function loadServices() {
  const res = await fetch(`${GAS_URL}/services?select=*&order=id`, {
    headers: { apikey: SUPA_KEY }
  });
  return res.json();
}

async function loadMetrics() {
  const bookings = await fetch(`${GAS_URL}/bookings?select=price`, {
    headers: { apikey: SUPA_KEY }
  }).then(r => r.json());
  const total = bookings.reduce((s, b) => s + (b.price || 0), 0);
  const count = bookings.length;
  const avg   = count ? (total / count).toFixed(2) : 0;
  return { total, count, avg, peak: '14:00' }; // hora pico hard por ahora
}

async function postOffer(text) {
  await fetch(`${GAS_URL}/offers`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

async function savePrice(name, price) {
  await fetch(`${GAS_URL}/services', {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price })
  });
}

// ---------- sync local → Supabase ----------
async function syncBookings() {
  const db = await openDB();
  const all = await db.transaction('bookings').objectStore('bookings').getAll();
  if (!all.length) return;
  for (const b of all) {
    await fetch(`${GAS_URL}/bookings`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(b)
    });
  }
  // borramos local
  const tx = db.transaction('bookings', 'readwrite');
  all.forEach(b => tx.objectStore('bookings').delete(b.id));
  await tx.complete;
}