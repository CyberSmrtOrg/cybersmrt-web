// /assets/js/globe-hero.js
import * as THREE from 'https://esm.sh/three@0.168.0';
import ThreeGlobe from 'https://esm.sh/three-globe@2.31.1?deps=three@0.168.0&exports=default';
import { feature } from 'https://esm.sh/topojson-client@3.1.0';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const mountEl = document.getElementById('globe-hero');
if (!mountEl) throw new Error('#globe-hero not found');

// ===== UI =====
const tickerEl = document.getElementById('attack-ticker');
const countEl  = document.getElementById('attack-count');
const updateCount = () => countEl && (countEl.textContent = `${attacks.length} active`);

// --- "Attacks today" counter, persisted per day (local timezone)
const todayEl = document.getElementById('attack-today');
const TODAY_KEY = 'cybersmrt_attacks_today';

function todayKey() {
  const d = new Date();
  // format YYYY-MM-DD in local time
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
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
    now.getDate() + 1, // tomorrow
    0, 0, 0, 0
  );
  return next - now;
}

function scheduleMidnightReset() {
  setTimeout(() => {
    attacksToday = 0;
    saveTodayCount(attacksToday);
    updateTodayUI();
    // schedule again for the next day
    scheduleMidnightReset();
  }, msUntilLocalMidnight());
}
scheduleMidnightReset();

// extend the existing updateCount to keep "active" text consistent
const updateActive = () => countEl && (countEl.textContent = `Active: ${attacks.length}`);

// ===== Style/Timing =====
const STROKE  = 0.65;
const MIN_ALT = 0.10;  // flatter
const MAX_ALT = 0.35;  // flatter

// --- flow tuning (FASTER) ---
const ARC_TRAVEL_MIN_MS = 1800;   // short hops duration
const ARC_TRAVEL_MAX_MS = 4200;   // long hops duration
const ARC_DASH_LENGTH   = 0.22;   // visible segment length (0..1)
const ARC_DASH_GAP_SAFE = 0.78;   // keep < 1 - ARC_DASH_LENGTH

// Axial tilt (Earth ≈ 23.4°)
const AXIAL_TILT_DEG = 23.4;

// ===== Categories =====
const CATS = {
  nonprofit:   { label: 'Nonprofit',     color: '#22d3ee', badge: 'badge-np'  },
  school:      { label: 'School',        color: '#a78bfa', badge: 'badge-sch' },
  smb:         { label: 'Small Business',color: '#f59e0b', badge: 'badge-smb' },
  underserved: { label: 'Underserved',   color: '#f472b6', badge: 'badge-uv'  }
};

// ===== Origins / Destinations =====
const ORIGIN_HUBS = [
  ['Ashburn, US', 39.0438, -77.4874, 'na'], ['Chicago, US', 41.8781, -87.6298, 'na'],
  ['Honolulu (Oʻahu), US', 21.3069, -157.8583, 'na'],
  ['Dallas, US', 32.7767, -96.7970, 'na'], ['Los Angeles, US', 34.0522, -118.2437, 'na'],
  ['Toronto, CA', 43.6532, -79.3832, 'na'], ['London, UK', 51.5074, -0.1278, 'eu'],
  ['Frankfurt, DE', 50.1109, 8.6821, 'eu'], ['Amsterdam, NL', 52.3676, 4.9041, 'eu'],
  ['Paris, FR', 48.8566, 2.3522, 'eu'], ['Madrid, ES', 40.4168, -3.7038, 'eu'],
  ['Singapore, SG', 1.3521, 103.8198, 'apac'], ['Tokyo, JP', 35.6762, 139.6503, 'apac'],
  ['Seoul, KR', 37.5665, 126.9780, 'apac'], ['Hong Kong, HK', 22.3193, 114.1694, 'apac'],
  ['Sydney, AU', -33.8688, 151.2093, 'apac'], ['São Paulo, BR', -23.5505, -46.6333, 'latam'],
  ['Santiago, CL', -33.4489, -70.6693, 'latam'], ['Mexico City, MX', 19.4326, -99.1332, 'latam'],
  ['Johannesburg, ZA', -26.2041, 28.0473, 'africa'], ['Nairobi, KE', -1.2921, 36.8219, 'africa'],
];

const DEST_POOLS = {
  nonprofit: [
    ['Kigali, RW', -1.9706, 30.1044], ['Nairobi, KE', -1.2921, 36.8219],
    ['Accra, GH', 5.6037, -0.1870], ['Lagos, NG', 6.5244, 3.3792],
    ['Manila, PH', 14.5994, 120.9842], ['Jakarta, ID', -6.2088, 106.8456],
    ['Lima, PE', -12.0464, -77.0428], ['Bogotá, CO', 4.7110, -74.0721],
    ['Detroit, US', 42.3314, -83.0458], ['El Paso, US', 31.7619, -106.4850],
    ['Honolulu (Oʻahu), US', 21.3069, -157.8583]
  ],
  school: [
    ['Lusaka, ZM', -15.3875, 28.3228], ['Gulu, UG', 2.7724, 32.2881],
    ['Ulaanbaatar, MN', 47.8864, 106.9057], ['Dhaka, BD', 23.8103, 90.4125],
    ['Hyderabad, IN', 17.3850, 78.4867], ['Kolkata, IN', 22.5726, 88.3639],
    ['La Paz, BO', -16.4897, -68.1193], ['Cusco, PE', -13.5319, -71.9675],
    ['Memphis, US', 35.1495, -90.0490], ['Birmingham, US', 33.5186, -86.8104],
    ['Honolulu (Oʻahu), US', 21.3069, -157.8583]
  ],
  smb: [
    ['Guadalajara, MX', 20.6597, -103.3496], ['Monterrey, MX', 25.6866, -100.3161],
    ['Medellín, CO', 6.2442, -75.5812], ['Quito, EC', -0.1807, -78.4678],
    ['Cebu, PH', 10.3157, 123.8854], ['Surabaya, ID', -7.2575, 112.7521],
    ['Ho Chi Minh City, VN', 10.8231, 106.6297], ['Kampala, UG', 0.3476, 32.5825],
    ['Cairo, EG', 30.0444, 31.2357], ['Casablanca, MA', 33.5731, -7.5898],
    ['Honolulu (Oʻahu), US', 21.3069, -157.8583]
  ],
  underserved: [
    ['Kinshasa, CD', -4.4419, 15.2663], ['Port-au-Prince, HT', 18.5944, -72.3074],
    ['Port Moresby, PG', -9.4438, 147.1803], ['Antananarivo, MG', -18.8792, 47.5079],
    ['Chittagong, BD', 22.3475, 91.8123], ['Karachi, PK', 24.8607, 67.0011],
    ['Gaza City, PS', 31.5246, 34.4500], ['Sana’a, YE', 15.3694, 44.1910],
    ['Mogadishu, SO', 2.0469, 45.3182], ['Harare, ZW', -17.8252, 31.0335],
    ['Honolulu (Oʻahu), US', 21.3069, -157.8583]
  ],
};

// ===== Defaults (overridable by /assets/data/attack-stats.json) =====
const DEFAULT_STATS = {
  category_share: { nonprofit: 0.30, school: 0.25, smb: 0.30, underserved: 0.15 },
  origin_region_share: { na: 0.35, eu: 0.25, apac: 0.25, latam: 0.08, africa: 0.07 },
  vectors: {
    nonprofit: ['Credential stuffing','Business Email Compromise','Ransomware','Web exploit'],
    school:    ['Phishing','Malware','Account takeover','Remote access trojan'],
    smb:       ['Phishing','Ransomware','SQLi','Vishing'],
    underserved:['Phishing','Malware','Smishing','Web exploit']
  }
};
let SIM = structuredClone(DEFAULT_STATS);
const DEFAULT_VECTORS = structuredClone(DEFAULT_STATS.vectors);

// ===== helpers =====
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
function pickWeighted(items, weightFn){
  const weights = items.map(weightFn);
  const sum = weights.reduce((a,b)=>a+b,0)||1;
  let r = Math.random()*sum;
  for (let i=0;i<items.length;i++){ r-=weights[i]; if(r<=0) return items[i]; }
  return items[items.length-1];
}
function greatCircleKm(a,b){
  const rad = d => d*Math.PI/180;
  const φ1=rad(a.lat), φ2=rad(b.lat), Δφ=rad(b.lat-a.lat), Δλ=rad(b.lng-a.lng);
  const h = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
function arcAltitude(a,b){
  const km = greatCircleKm(a,b);
  const t = Math.min(1, km/10000);
  return Math.min(MAX_ALT, Math.max(MIN_ALT, 0.10 + 0.25 * t));
}
function travelMsForDistance(a,b){
  const km = greatCircleKm(a,b);
  const t = Math.min(1, km/12000);
  return Math.round(ARC_TRAVEL_MIN_MS + (ARC_TRAVEL_MAX_MS - ARC_TRAVEL_MIN_MS) * t);
}
function ttlForDistance(a,b){
  return travelMsForDistance(a,b) + 80; // small cushion
}

// ===== three/globe (declared ONCE) =====
let renderer, camera, scene, globe, globeGroup, animId, ro;
let attacks = [];                 // active only
const tickerRowById = new Map();  // id -> DOM element
let nextId = 1;

  let resizeAttempts = 0;
const MAX_RESIZE_ATTEMPTS = 10;

function isMobileViewport() {
  // Use matchMedia for reliable mobile detection
  return window.matchMedia('(max-width: 768px)').matches;
}

function resize(){
  if(!renderer||!camera) return;

    const isMobile = isMobileViewport();
    const container = document.querySelector('.globe-viewport');

    let w, h;

    if (isMobile) {
      // Force dimensions on mobile - use actual viewport width
      const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      w = Math.max(300, Math.min(viewportWidth - 32, 400));
      h = 400;
      console.log(`Mobile globe resize (forced): ${w}x${h}, viewport: ${viewportWidth}`);
    } else {
      // Use container dimensions on desktop
      w = container?.clientWidth || mountEl.clientWidth || 400;
      h = container?.clientHeight || mountEl.clientHeight || 400;
      console.log(`Desktop globe resize: ${w}x${h}`);
    }

    // Ensure minimum valid size
    w = Math.max(w, 300);
    h = Math.max(h, 300);

    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

    // Add this after resize function
    function forceResize() {
      resize();
      if (globe) {
        // Force globe to recalculate
        setTimeout(resize, 100);
        setTimeout(resize, 500);
      }
    }

  // Call on orientation change
  window.addEventListener('orientationchange', forceResize);
  window.addEventListener('resize', resize);

  // Initial resize after load
  window.addEventListener('load', forceResize);

async function loadCountries(){
  const res = await fetch(WORLD_TOPO_URL, { cache:'force-cache' });
  const topo = await res.json();
  const obj = topo.objects?.countries || topo.objects?.ne_110m_admin_0_countries || topo.objects?.ne_50m_admin_0_countries;
  return feature(topo, obj);
}

async function init(){
  try{
    const r = await fetch('/assets/data/attack-stats.json', { cache:'no-cache' });
    if (r.ok) SIM = Object.assign({}, DEFAULT_STATS, await r.json());
  }catch{}

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050816, 120, 400);
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.z = 250;

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  mountEl.appendChild(renderer.domElement);

  // Wait for layout to settle before initial resize
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 100);
    } else {
      window.addEventListener('load', () => setTimeout(resolve, 100));
    }
  });

  ro = new ResizeObserver(() => {
    // Debounce rapid resizes
    clearTimeout(window.globeResizeTimeout);
    window.globeResizeTimeout = setTimeout(resize, 50);
  });
  ro.observe(mountEl);

  window.addEventListener('resize', () => {
    clearTimeout(window.globeResizeTimeout);
    window.globeResizeTimeout = setTimeout(resize, 50);
  });

  resize(); // Initial resize after layout settles

  const globeInstance = new ThreeGlobe({ waitForGlobeReady:true, animateIn:true })
    .globeImageUrl(null).bumpImageUrl(null).showAtmosphere(true)
    .atmosphereColor('#4f46e5').atmosphereAltitude(0.18)
    .arcsTransitionDuration(300); // less morph, snappier updates

  globe = globeInstance;

  // Axial tilt via group
  globeGroup = new THREE.Group();
  globeGroup.add(globe);
  globeGroup.rotation.z = THREE.MathUtils.degToRad(AXIAL_TILT_DEG);

  // Globe material
  const gmat = globe.globeMaterial();
  gmat.color = new THREE.Color('#0b132b'); gmat.emissive = new THREE.Color('#0b132b'); gmat.shininess = 5;

  // Countries
  const countriesGeo = await loadCountries();
  globe.polygonsData(countriesGeo.features)
       .polygonAltitude(0.007)
       .polygonCapColor(()=> 'rgba(59,130,246,0.25)')
       .polygonSideColor(()=> 'rgba(148,163,184,0.5)')
       .polygonStrokeColor(()=> 'rgba(203,213,225,0.8)');

  // Stars + lights
  const starCount=1000, pos=new Float32Array(starCount*3);
  for(let i=0;i<starCount;i++){ const j=i*3; pos[j]=(Math.random()-.5)*2000; pos[j+1]=(Math.random()-.5)*2000; pos[j+2]=(Math.random()-.5)*2000; }
  const starGeom = new THREE.BufferGeometry(); starGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  starGeom.computeBoundingSphere();
  const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({ size:.7, transparent:true, opacity:.7 }));
  const ambient = new THREE.AmbientLight(0xffffff, .6);
  const dir = new THREE.DirectionalLight(0xffffff, .8); dir.position.set(200,200,200);

  scene.add(stars, ambient, dir, globeGroup);

  // Drag to rotate (operate on the group)
  let dragging=false, prev={x:0,y:0};
  mountEl.addEventListener('pointerdown', e=>{ dragging=true; prev={x:e.clientX,y:e.clientY}; });
  window.addEventListener('pointerup', ()=> dragging=false);
  window.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const dx=e.clientX-prev.x, dy=e.clientY-prev.y; prev={x:e.clientX,y:e.clientY};
    globeGroup.rotation.y += dx*0.005; // yaw
    globeGroup.rotation.x += dy*0.003; // pitch
  });

  const clock = new THREE.Clock();
  let lastPrune = 0;
  (function tick(){
    const t = clock.getElapsedTime();
    globeGroup.rotation.y += 0.0015;
    globeGroup.position.y = Math.sin(t*0.5)*0.5;

    const now = performance.now();
    if (now - lastPrune > 200) { pruneExpired(now); lastPrune = now; }

    renderer.render(scene, camera);
    animId = requestAnimationFrame(tick);
  })();

  startWeightedTraffic();
}

// ===== layer sync (dashed, faster sweep) =====
function syncLayers() {
  globe
    .arcsData(attacks)
    .arcStartLat('startLat').arcStartLng('startLng')
    .arcEndLat('endLat').arcEndLng('endLng')
    .arcAltitude('arcAlt')
    .arcColor('color')
    .arcStroke(STROKE)
    .arcDashLength(() => ARC_DASH_LENGTH)
    .arcDashGap(() => ARC_DASH_GAP_SAFE)
    .arcDashInitialGap(() => 0)
    .arcDashAnimateTime(a => a.travelMs || 2500);

  // endpoints
  const pts = attacks.flatMap(a => ([
    { lat: a.startLat, lng: a.startLng },
    { lat: a.endLat,   lng: a.endLng   }
  ]));
  globe
    .pointsData(pts)
    .pointAltitude(0.03)
    .pointRadius(0.45)
    .pointResolution(6)
    .pointColor(() => '#f59e0b');

  updateActive && updateActive();
}

// ===== public API =====
window.CyberGlobe = {
  addAttack({ category='nonprofit', origin, dest, vector }) {
    const cfg = CATS[category] || CATS.nonprofit;
    const id = nextId++;
    const arcAlt = arcAltitude(origin, dest);
    const travelMs = travelMsForDistance(origin, dest);
    const ttl = travelMs + 80;

    attacks.push({
      id,
      startLat: origin.lat, startLng: origin.lng,
      endLat: dest.lat,     endLng: dest.lng,
      arcAlt, color: cfg.color,
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
  clear(){ attacks.length = 0; syncLayers(); clearTicker(); }
};

// ===== ticker =====
function addTickerRow({ id, category, cfg, origin, dest, vector }){
  if (!tickerEl) return;
  const row = document.createElement('div');
  row.className = 'attack-item'; row.dataset.id = String(id);
  row.innerHTML = `
    <div class="attack-item__line">${origin.name} ⟶ ${dest.name}</div>
    <div class="attack-badge ${cfg.badge}">${cfg.label}</div>
    <div class="attack-item__meta">
      ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
      • ${vector}
    </div>`;
  tickerEl.appendChild(row);
  tickerRowById.set(id, row);
  while (tickerEl.children.length > 60) tickerEl.removeChild(tickerEl.firstChild);
  tickerEl.scrollTop = tickerEl.scrollHeight;
}
function removeTickerRow(id){
  const row = tickerRowById.get(id);
  if (row && row.parentNode) row.parentNode.removeChild(row);
  tickerRowById.delete(id);
}
function clearTicker(){ if (tickerEl){ tickerEl.innerHTML=''; tickerRowById.clear(); } updateActive(); }

// ===== pruning =====
function pruneExpired(now = performance.now()){
  if (!attacks.length) return;

  const aliveArcs = [];
  for (const a of attacks) {
    if (now >= a.createdAt + a.travelMs) {
      removeTickerRow(a.id);   // arc finished; drop from ticker
    } else {
      aliveArcs.push(a);
    }
  }
  if (aliveArcs.length !== attacks.length) {
    attacks = aliveArcs;
    syncLayers();              // refresh arcs/points
  }
}

// ===== weighted simulator =====
let trafficTimer;
function startWeightedTraffic(){
  const byReg = {
    na: ORIGIN_HUBS.filter(h=>h[3]==='na'),
    eu: ORIGIN_HUBS.filter(h=>h[3]==='eu'),
    apac: ORIGIN_HUBS.filter(h=>h[3]==='apac'),
    latam: ORIGIN_HUBS.filter(h=>h[3]==='latam'),
    africa: ORIGIN_HUBS.filter(h=>h[3]==='africa'),
  };
  const regions = Object.keys(SIM.origin_region_share);
  const cats = Object.keys(CATS);

  const pickOrigin = () => {
    const r = pickWeighted(regions, rr => SIM.origin_region_share[rr] || 0);
    const hub = pick(byReg[r] || ORIGIN_HUBS);
    return { name: hub[0], lat: hub[1], lng: hub[2] };
  };
  const pickCategory = () => pickWeighted(cats, c => SIM.category_share?.[c] ?? 0.25);
  const pickDest = (cat) => { const p = DEST_POOLS[cat] || DEST_POOLS.nonprofit; const s = pick(p); return { name:s[0], lat:s[1], lng:s[2] }; };

  const spawn = () => {
    const category = pickCategory();
    const origin = pickOrigin();
    const dest = pickDest(category);
    const vector = pick(SIM.vectors?.[category] || DEFAULT_VECTORS.nonprofit);
    window.CyberGlobe.addAttack({ category, origin, dest, vector });
  };

  for (let i=0;i<6;i++) setTimeout(spawn, i*150); // warm-up burst
  clearInterval(trafficTimer);
  trafficTimer = setInterval(spawn, 600);
}

// ===== lifecycle =====
window.addEventListener('beforeunload', () => {
  clearInterval(trafficTimer);
  if (animId) cancelAnimationFrame(animId);
  if (renderer) renderer.dispose();
  if (ro) ro.disconnect();
});

init().catch(err => {
  console.error('[globe-hero] failed to init', err);
  mountEl.innerHTML = '<div role="alert" style="padding:1rem;color:#fecaca">Visualization failed to load.</div>';
});
