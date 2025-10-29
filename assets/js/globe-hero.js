// /assets/js/globe-hero.js - Non-Module Version
// Libraries loaded via script tags, accessed from window
const THREE = window.THREE;
const ThreeGlobe = window.ThreeGlobe;
const { feature } = window.topojson;

console.log('🌍 Globe starting with:', {
  THREE: !!THREE,
  ThreeGlobe: !!ThreeGlobe,
  feature: !!feature
});

if (!THREE || !ThreeGlobe || !feature) {
  console.error('❌ Globe dependencies not loaded');
  const mountEl = document.getElementById('globe-hero');
  if (mountEl) {
    mountEl.innerHTML = '<div style="color:#fecaca;padding:2rem;text-align:center;">Globe dependencies failed to load.</div>';
  }
  throw new Error('Globe dependencies missing');
}

// ========================================
// RAM MANAGEMENT - ADDED FOR MEMORY OPTIMIZATION
// ========================================
let isPaused = false;
let isVisible = true;

// Pause when page hidden
document.addEventListener('visibilitychange', () => {
  isPaused = document.hidden;
  isVisible = !document.hidden;
  console.log('🌍 Globe:', isPaused ? 'Paused (hidden)' : 'Running');
});

// Pause when scrolled away
const checkVisibility = () => {
  const globeEl = document.getElementById('globe-hero');
  if (globeEl) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      isPaused = !entry.isIntersecting;
      console.log('🌍 Globe:', isVisible ? 'In view' : 'Out of view');
    }, { threshold: 0.1, rootMargin: '50px' });
    observer.observe(globeEl);
  }
};

// Check visibility after DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkVisibility);
} else {
  checkVisibility();
}

// ========================================
// GLOBE INITIALIZATION
// ========================================

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const mountEl = document.getElementById('globe-hero');
if (!mountEl) throw new Error('#globe-hero not found');

// ===== UI Elements =====
const tickerEl = document.getElementById('attack-ticker');
const countEl = document.getElementById('attack-count');
const todayEl = document.getElementById('attack-today');

// ===== UI Update Functions =====
const updateCount = () => {
  if (countEl) {
    countEl.textContent = `${attacks.length} active`;
  }
};

// ===== Today's Attack Counter =====
const TODAY_KEY = 'cybersmrt_attacks_today';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadTodayCount() {
  const stored = JSON.parse(localStorage.getItem(TODAY_KEY) || '{}');
  const key = todayKey();
  if (!stored.date || stored.date !== key) {
    const fresh = { date: key, count: 0 };
    localStorage.setItem(TODAY_KEY, JSON.stringify(fresh));
    return 0;
  }
  return stored.count || 0;
}

function saveTodayCount(count) {
  localStorage.setItem(TODAY_KEY, JSON.stringify({ date: todayKey(), count }));
}

let attacksToday = loadTodayCount();

function updateTodayUI() {
  if (todayEl) todayEl.textContent = `Today: ${attacksToday}`;
}
updateTodayUI();

function msUntilLocalMidnight() {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );
  return next - now;
}

function scheduleMidnightReset() {
  setTimeout(() => {
    attacksToday = 0;
    saveTodayCount(attacksToday);
    updateTodayUI();
    scheduleMidnightReset();
  }, msUntilLocalMidnight());
}
scheduleMidnightReset();

// ===== Visual Constants =====
const STROKE = 0.65;
const MIN_ALT = 0.10;
const MAX_ALT = 0.35;
const ARC_TRAVEL_MIN_MS = 1200;
const ARC_TRAVEL_MAX_MS = 2800;
const ARC_DASH_LENGTH = 0.4; // Increased from 0.22 for more visible arcs
const ARC_DASH_GAP_SAFE = 0.1; // Reduced from 0.78 so arcs look more continuous
const AXIAL_TILT_DEG = 23.4;
// Reduce star count on mobile
const STAR_COUNT = window.matchMedia('(max-width: 768px)').matches ? 500 : 1000;

// ===== Attack Categories =====
const CATS = {
  nonprofit: { label: 'Nonprofit', color: '#22d3ee', badge: 'badge-np' },
  school: { label: 'School', color: '#a78bfa', badge: 'badge-sch' },
  smb: { label: 'Small Business', color: '#f59e0b', badge: 'badge-smb' },
  underserved: { label: 'Underserved', color: '#f472b6', badge: 'badge-uv' }
};

// ===== Geographic Data =====
const ORIGIN_HUBS = [
  // North America
  ['Ashburn, US', 39.0438, -77.4874, 'na'],
  ['Chicago, US', 41.8781, -87.6298, 'na'],
  ['Honolulu, US', 21.3069, -157.8583, 'na'],
  ['Dallas, US', 32.7767, -96.7970, 'na'],
  ['Los Angeles, US', 34.0522, -118.2437, 'na'],
  ['Seattle, US', 47.6062, -122.3321, 'na'],
  ['New York, US', 40.7128, -74.0060, 'na'],
  ['Miami, US', 25.7617, -80.1918, 'na'],
  ['Denver, US', 39.7392, -104.9903, 'na'],
  ['Toronto, CA', 43.6532, -79.3832, 'na'],
  ['Montreal, CA', 45.5017, -73.5673, 'na'],
  ['Vancouver, CA', 49.2827, -123.1207, 'na'],

  // Europe
  ['London, UK', 51.5074, -0.1278, 'eu'],
  ['Frankfurt, DE', 50.1109, 8.6821, 'eu'],
  ['Amsterdam, NL', 52.3676, 4.9041, 'eu'],
  ['Paris, FR', 48.8566, 2.3522, 'eu'],
  ['Madrid, ES', 40.4168, -3.7038, 'eu'],
  ['Stockholm, SE', 59.3293, 18.0686, 'eu'],
  ['Dublin, IE', 53.3498, -6.2603, 'eu'],
  ['Warsaw, PL', 52.2297, 21.0122, 'eu'],
  ['Milan, IT', 45.4642, 9.1900, 'eu'],
  ['Zurich, CH', 47.3769, 8.5417, 'eu'],
  ['Moscow, RU', 55.7558, 37.6173, 'eu'],
  ['Istanbul, TR', 41.0082, 28.9784, 'eu'],

  // Asia Pacific
  ['Singapore, SG', 1.3521, 103.8198, 'apac'],
  ['Tokyo, JP', 35.6762, 139.6503, 'apac'],
  ['Seoul, KR', 37.5665, 126.9780, 'apac'],
  ['Hong Kong, HK', 22.3193, 114.1694, 'apac'],
  ['Sydney, AU', -33.8688, 151.2093, 'apac'],
  ['Mumbai, IN', 19.0760, 72.8777, 'apac'],
  ['Bangkok, TH', 13.7563, 100.5018, 'apac'],
  ['Taipei, TW', 25.0330, 121.5654, 'apac'],
  ['Beijing, CN', 39.9042, 116.4074, 'apac'],
  ['Shanghai, CN', 31.2304, 121.4737, 'apac'],
  ['Melbourne, AU', -37.8136, 144.9631, 'apac'],
  ['Osaka, JP', 34.6937, 135.5023, 'apac'],

  // Latin America
  ['São Paulo, BR', -23.5505, -46.6333, 'latam'],
  ['Santiago, CL', -33.4489, -70.6693, 'latam'],
  ['Mexico City, MX', 19.4326, -99.1332, 'latam'],
  ['Buenos Aires, AR', -34.6037, -58.3816, 'latam'],
  ['Lima, PE', -12.0464, -77.0428, 'latam'],
  ['Bogotá, CO', 4.7110, -74.0721, 'latam'],
  ['Rio de Janeiro, BR', -22.9068, -43.1729, 'latam'],

  // Africa & Middle East
  ['Johannesburg, ZA', -26.2041, 28.0473, 'africa'],
  ['Nairobi, KE', -1.2921, 36.8219, 'africa'],
  ['Cairo, EG', 30.0444, 31.2357, 'africa'],
  ['Cape Town, ZA', -33.9249, 18.4241, 'africa'],
  ['Lagos, NG', 6.5244, 3.3792, 'africa'],
  ['Dubai, AE', 25.2048, 55.2708, 'africa'],
  ['Tel Aviv, IL', 32.0853, 34.7818, 'africa']
];

const DEST_POOLS = {
  nonprofit: [
    // Africa
    ['Kigali, RW', -1.9706, 30.1044],
    ['Nairobi, KE', -1.2921, 36.8219],
    ['Accra, GH', 5.6037, -0.1870],
    ['Lagos, NG', 6.5244, 3.3792],
    ['Addis Ababa, ET', 9.0320, 38.7469],
    ['Kampala, UG', 0.3476, 32.5825],
    ['Dar es Salaam, TZ', -6.7924, 39.2083],
    ['Dakar, SN', 14.7167, -17.4677],

    // Asia
    ['Manila, PH', 14.5994, 120.9842],
    ['Jakarta, ID', -6.2088, 106.8456],
    ['Kathmandu, NP', 27.7172, 85.3240],
    ['Dhaka, BD', 23.8103, 90.4125],
    ['Yangon, MM', 16.8661, 96.1951],
    ['Phnom Penh, KH', 11.5564, 104.9282],
    ['Colombo, LK', 6.9271, 79.8612],

    // Latin America
    ['Lima, PE', -12.0464, -77.0428],
    ['Bogotá, CO', 4.7110, -74.0721],
    ['Guatemala City, GT', 14.6349, -90.5069],
    ['San Salvador, SV', 13.6929, -89.2182],
    ['Tegucigalpa, HN', 14.0723, -87.1921],
    ['Managua, NI', 12.1150, -86.2362],

    // North America - underserved cities
    ['Detroit, US', 42.3314, -83.0458],
    ['El Paso, US', 31.7619, -106.4850],
    ['Honolulu, US', 21.3069, -157.8583],
    ['Flint, US', 43.0125, -83.6875],
    ['Camden, US', 39.9259, -75.1196],
    ['Newark, US', 40.7357, -74.1724]
  ],

  school: [
    // Africa
    ['Lusaka, ZM', -15.3875, 28.3228],
    ['Gulu, UG', 2.7724, 32.2881],
    ['Mombasa, KE', -4.0435, 39.6682],
    ['Kumasi, GH', 6.6885, -1.6244],
    ['Bamako, ML', 12.6392, -8.0029],
    ['Ouagadougou, BF', 12.3714, -1.5197],

    // Asia
    ['Ulaanbaatar, MN', 47.8864, 106.9057],
    ['Dhaka, BD', 23.8103, 90.4125],
    ['Hyderabad, IN', 17.3850, 78.4867],
    ['Kolkata, IN', 22.5726, 88.3639],
    ['Patna, IN', 25.5941, 85.1376],
    ['Lucknow, IN', 26.8467, 80.9462],
    ['Peshawar, PK', 34.0151, 71.5249],
    ['Lahore, PK', 31.5497, 74.3436],

    // Latin America
    ['La Paz, BO', -16.4897, -68.1193],
    ['Cusco, PE', -13.5319, -71.9675],
    ['Oaxaca, MX', 17.0732, -96.7266],
    ['Chiapas, MX', 16.7569, -93.1292],
    ['Iquitos, PE', -3.7437, -73.2516],
    ['Manaus, BR', -3.4653, -62.2159],

    // North America - rural/underserved
    ['Memphis, US', 35.1495, -90.0490],
    ['Birmingham, US', 33.5186, -86.8104],
    ['Honolulu, US', 21.3069, -157.8583],
    ['Jackson, US', 32.2988, -90.1848],
    ['Albuquerque, US', 35.0844, -106.6504],
    ['Fresno, US', 36.7378, -119.7871]
  ],

  smb: [
    // Latin America
    ['Guadalajara, MX', 20.6597, -103.3496],
    ['Monterrey, MX', 25.6866, -100.3161],
    ['Medellín, CO', 6.2442, -75.5812],
    ['Quito, EC', -0.1807, -78.4678],
    ['Cartagena, CO', 10.3910, -75.4794],
    ['Valparaíso, CL', -33.0472, -71.6127],
    ['Córdoba, AR', -31.4201, -64.1888],
    ['Puebla, MX', 19.0414, -98.2063],

    // Asia
    ['Cebu, PH', 10.3157, 123.8854],
    ['Surabaya, ID', -7.2575, 112.7521],
    ['Ho Chi Minh City, VN', 10.8231, 106.6297],
    ['Chiang Mai, TH', 18.7883, 98.9853],
    ['Penang, MY', 5.4164, 100.3327],
    ['Da Nang, VN', 16.0544, 108.2022],
    ['Hanoi, VN', 21.0285, 105.8542],
    ['Bali, ID', -8.4095, 115.1889],

    // Africa
    ['Kampala, UG', 0.3476, 32.5825],
    ['Cairo, EG', 30.0444, 31.2357],
    ['Casablanca, MA', 33.5731, -7.5898],
    ['Marrakech, MA', 31.6295, -7.9811],
    ['Tunis, TN', 36.8065, 10.1815],
    ['Lusaka, ZM', -15.3875, 28.3228],

    // North America - small business hubs
    ['Honolulu, US', 21.3069, -157.8583],
    ['Austin, US', 30.2672, -97.7431],
    ['Portland, US', 45.5152, -122.6784],
    ['Nashville, US', 36.1627, -86.7816],
    ['Raleigh, US', 35.7796, -78.6382],
    ['Boulder, US', 40.0150, -105.2705]
  ],

  underserved: [
    // Asia
    ['Kabul, AF', 34.5553, 69.2075],
    ['Karachi, PK', 24.8607, 67.0011],
    ['Chittagong, BD', 22.3569, 91.7832],
    ['Yangon, MM', 16.8661, 96.1951],
    ['Vientiane, LA', 17.9757, 102.6331],
    ['Dili, TL', -8.5569, 125.5603],

    // Africa
    ['Mogadishu, SO', 2.0469, 45.3182],
    ['Khartoum, SD', 15.5007, 32.5599],
    ['N\'Djamena, TD', 12.1348, 15.0557],
    ['Conakry, GN', 9.6412, -13.5784],
    ['Niamey, NE', 13.5127, 2.1128],
    ['Bangui, CF', 4.3947, 18.5582],

    // Latin America
    ['Port-au-Prince, HT', 18.5944, -72.3074],
    ['Tegucigalpa, HN', 14.0723, -87.1921],
    ['La Paz, BO', -16.4897, -68.1193],
    ['Managua, NI', 12.1150, -86.2362],

    // North America - highest poverty areas
    ['McAllen, US', 26.2034, -98.2300],
    ['Laredo, US', 27.5306, -99.4803],
    ['Brownsville, US', 25.9017, -97.4975],
    ['Pine Ridge, US', 43.0248, -102.5557]
  ]
};

// Attack vectors
const DEFAULT_VECTORS = {
  nonprofit: ['Phishing', 'Ransomware', 'DDoS', 'BEC'],
  school: ['Phishing', 'Ransomware', 'Data Breach', 'Account Takeover'],
  smb: ['Ransomware', 'SQL Injection', 'DDoS', 'Credential Stuffing'],
  underserved: ['Phishing', 'Ransomware', 'Malware', 'Account Compromise']
};

const SIM = {
  origin_region_share: { na: 0.4, eu: 0.25, apac: 0.2, latam: 0.1, africa: 0.05 },
  category_share: { nonprofit: 0.32, school: 0.28, smb: 0.25, underserved: 0.15 },
  vectors: DEFAULT_VECTORS
};

// Utility
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function pickWeighted(items, weightFn) {
  const ws = items.map(i => Math.max(0, weightFn(i)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (total === 0) return pick(items);
  const r = Math.random() * total;
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += ws[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

function greatCircleDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function arcAltitude(origin, dest) {
  const d = greatCircleDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  const ratio = Math.min(d / 20000, 1);
  return MIN_ALT + ratio * (MAX_ALT - MIN_ALT);
}

function travelMsForDistance(origin, dest) {
  const d = greatCircleDistance(origin.lat, origin.lng, dest.lat, dest.lng);
  const ratio = Math.min(d / 20000, 1);
  return ARC_TRAVEL_MIN_MS + ratio * (ARC_TRAVEL_MAX_MS - ARC_TRAVEL_MIN_MS);
}

// State
let attacks = [];
let nextId = 1;
const tickerRowById = new Map();
let renderer, animId, globe, ro;

// ===== Initialize =====
async function init() {
  const resp = await fetch(WORLD_TOPO_URL);
  const topo = await resp.json();
  const countries = feature(topo, topo.objects.countries);

  // Setup globe
  globe = new ThreeGlobe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .showAtmosphere(true)
    .atmosphereColor('#667eea')
    .atmosphereAltitude(0.20)
    .polygonsData(countries.features)
    .polygonCapColor(() => 'rgba(2,10,22,0.7)')
    .polygonSideColor(() => 'rgba(2,10,22,0.2)')
    .polygonStrokeColor(() => 'rgba(102,126,234,0.35)');

  // Group with tilt
  const globeGroup = new THREE.Group();
  globeGroup.add(globe);
  globeGroup.rotation.z = -(AXIAL_TILT_DEG * Math.PI / 180);

  // Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.z = 280;

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);
  mountEl.appendChild(renderer.domElement);

  // Sizing
  function onSize() {
    const w = mountEl.clientWidth;
    const h = mountEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  onSize();
  ro = new ResizeObserver(onSize);
  ro.observe(mountEl);

  // Stars
  const pos = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 600 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    pos.push(x, y, z);
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starGeom.computeBoundingSphere();
  const stars = new THREE.Points(
    starGeom,
    new THREE.PointsMaterial({ size: 0.7, transparent: true, opacity: 0.7 })
  );

  // Add lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(200, 200, 200);

  scene.add(stars, ambient, dir, globeGroup);

  // Add drag controls
  let dragging = false;
  let prev = { x: 0, y: 0 };

  mountEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    dragging = true;
    prev = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    e.preventDefault();
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev = { x: e.clientX, y: e.clientY };
    globeGroup.rotation.y += dx * 0.005;
    globeGroup.rotation.x += dy * 0.003;
  });

  // Prevent touch scrolling on globe
  mountEl.style.touchAction = 'none';

  // Animation loop - MODIFIED FOR RAM MANAGEMENT
  const clock = new THREE.Clock();
  let lastPrune = 0;

  (function tick() {
    // Check if should render - ADDED FOR RAM MANAGEMENT
    if (!isPaused && isVisible) {
      const t = clock.getElapsedTime();
      globeGroup.rotation.y += 0.0015;
      globeGroup.position.y = Math.sin(t * 0.5) * 0.5;

      const now = performance.now();
      if (now - lastPrune > 200) {
        pruneExpired(now);
        lastPrune = now;
      }

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(tick);
  })();

  // Start attack simulation
  startWeightedTraffic();

  console.log('✅ Globe initialized successfully');
}

// ===== Update Globe Layers =====
function syncLayers() {
  globe
    .arcsData(attacks)
    .arcStartLat('startLat')
    .arcStartLng('startLng')
    .arcEndLat('endLat')
    .arcEndLng('endLng')
    .arcAltitude('arcAlt')
    .arcColor('color')
    .arcStroke(STROKE)
    .arcDashLength(() => ARC_DASH_LENGTH)
    .arcDashGap(() => ARC_DASH_GAP_SAFE)
    .arcDashInitialGap(() => 0)
    .arcDashAnimateTime(a => a.travelMs || 2500);

  // Add endpoint markers
  const pts = attacks.flatMap(a => ([
    { lat: a.startLat, lng: a.startLng },
    { lat: a.endLat, lng: a.endLng }
  ]));

  globe
    .pointsData(pts)
    .pointAltitude(0.03)
    .pointRadius(0.45)
    .pointResolution(6)
    .pointColor(() => '#f59e0b');

  updateCount();
}

// ===== Public API =====
window.CyberGlobe = {
  addAttack({ category = 'nonprofit', origin, dest, vector }) {
    const cfg = CATS[category] || CATS.nonprofit;
    const id = nextId++;
    const arcAlt = arcAltitude(origin, dest);
    const travelMs = travelMsForDistance(origin, dest);
    const ttl = travelMs + 1500; // Keep arc visible for 1.5s after animation completes

    attacks.push({
      id,
      startLat: origin.lat,
      startLng: origin.lng,
      endLat: dest.lat,
      endLng: dest.lng,
      arcAlt,
      color: cfg.color,
      createdAt: performance.now(),
      travelMs,
      expiresAt: performance.now() + ttl
    });

    syncLayers();
    addTickerRow({ id, category, cfg, origin, dest, vector });

    attacksToday += 1;
    saveTodayCount(attacksToday);
    updateTodayUI();
  },

  clear() {
    attacks.length = 0;
    syncLayers();
    clearTicker();
  }
};

// ===== Ticker Management =====
function addTickerRow({ id, category, cfg, origin, dest, vector }) {
  if (!tickerEl) return;

  const row = document.createElement('div');
  row.className = 'attack-item';
  row.dataset.id = String(id);
  row.innerHTML = `
    <div class="attack-item__line">${origin.name} ⟶ ${dest.name}</div>
    <div class="attack-badge ${cfg.badge}">${cfg.label}</div>
    <div class="attack-item__meta">
      ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      • ${vector}
    </div>`;

  tickerEl.appendChild(row);
  tickerRowById.set(id, row);

  // Keep only last 60 items
  while (tickerEl.children.length > 60) {
    tickerEl.removeChild(tickerEl.firstChild);
  }

  // Auto-scroll to bottom
  tickerEl.scrollTop = tickerEl.scrollHeight;
}

function removeTickerRow(id) {
  const row = tickerRowById.get(id);
  if (row && row.parentNode) {
    row.parentNode.removeChild(row);
  }
  tickerRowById.delete(id);
}

function clearTicker() {
  if (tickerEl) {
    tickerEl.innerHTML = '';
    tickerRowById.clear();
  }
  updateCount();
}

// ===== Cleanup Expired Attacks =====
function pruneExpired(now = performance.now()) {
  if (!attacks.length) return;

  const aliveArcs = [];
  for (const a of attacks) {
    // Use expiresAt instead of just travelMs to keep arcs visible longer
    if (now >= a.expiresAt) {
      removeTickerRow(a.id);
    } else {
      aliveArcs.push(a);
    }
  }

  if (aliveArcs.length !== attacks.length) {
    attacks = aliveArcs;
    syncLayers();
  }
}

// ===== Attack Simulation =====
let trafficTimer;

function startWeightedTraffic() {
  const byReg = {
    na: ORIGIN_HUBS.filter(h => h[3] === 'na'),
    eu: ORIGIN_HUBS.filter(h => h[3] === 'eu'),
    apac: ORIGIN_HUBS.filter(h => h[3] === 'apac'),
    latam: ORIGIN_HUBS.filter(h => h[3] === 'latam'),
    africa: ORIGIN_HUBS.filter(h => h[3] === 'africa')
  };

  const regions = Object.keys(SIM.origin_region_share);
  const cats = Object.keys(CATS);

  const pickOrigin = () => {
    const r = pickWeighted(regions, rr => SIM.origin_region_share[rr] || 0);
    const hub = pick(byReg[r] || ORIGIN_HUBS);
    return { name: hub[0], lat: hub[1], lng: hub[2] };
  };

  const pickCategory = () => pickWeighted(cats, c => SIM.category_share?.[c] ?? 0.25);

  const pickDest = (cat) => {
    const p = DEST_POOLS[cat] || DEST_POOLS.nonprofit;
    const s = pick(p);
    return { name: s[0], lat: s[1], lng: s[2] };
  };

  const spawn = () => {
    const category = pickCategory();
    const origin = pickOrigin();
    const dest = pickDest(category);
    const vector = pick(SIM.vectors?.[category] || DEFAULT_VECTORS.nonprofit);
    window.CyberGlobe.addAttack({ category, origin, dest, vector });
  };

  // Detect mobile
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Initial burst - fewer on mobile
  const burstCount = isMobile ? 3 : 6;
  for (let i = 0; i < burstCount; i++) {
    setTimeout(spawn, i * 150);
  }

  // Continuous spawning - slower on mobile
  const spawnInterval = isMobile ? 1200 : 600;
  clearInterval(trafficTimer);
  trafficTimer = setInterval(spawn, spawnInterval);
}

// ===== Cleanup - ENHANCED FOR RAM MANAGEMENT =====
window.addEventListener('beforeunload', () => {
  console.log('🌍 Globe: Cleaning up resources');
  clearInterval(trafficTimer);
  if (animId) cancelAnimationFrame(animId);

  // Enhanced cleanup
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }

  if (ro) ro.disconnect();

  // Clear attacks and ticker
  attacks = [];
  tickerRowById.clear();
});

// ===== Initialize =====
init().catch(err => {
  console.error('[globe-hero] failed to init', err);
  mountEl.innerHTML = '<div role="alert" style="padding:1rem;color:#fecaca">Visualization failed to load.</div>';
});

console.log('🌍 Globe loaded with RAM management');