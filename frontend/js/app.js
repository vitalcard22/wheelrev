/* ---------- API CONFIG ---------- */
// Update this once the backend is deployed (e.g. your Fly.io URL).
// Left as localhost for local development.
const API_BASE = 'http://localhost:4000/api';

/* ---------- DATA (live, populated by boot()) ---------- */
let CARS = [];
let GALLERY = {};
let usingFallbackData = false;

/* ---------- STATE ---------- */
let mode = 'daily'; // 'daily' | 'luxury'
let activeBrandChip = '';
let compareIds = [];

/* ---------- INIT ---------- */
function uniqueSorted(arr){ return [...new Set(arr)].sort(); }

function populateSelects(){
  const brandSel = document.getElementById('searchBrand');
  const typeSel = document.getElementById('searchType');
  brandSel.innerHTML = '<option value="">All brands</option>' +
    uniqueSorted(CARS.map(c=>c.brand)).map(b=>`<option value="${b}">${b}</option>`).join('');
  typeSel.innerHTML = '<option value="">Any body type</option>' +
    uniqueSorted(CARS.map(c=>c.type)).map(t=>`<option value="${t}">${t}</option>`).join('');
}

function buildBrandChips(){
  const bar = document.getElementById('filterbar');
  bar.querySelectorAll('.chip:not([data-brand=""])').forEach(el=>el.remove());
  const brandsInMode = uniqueSorted(CARS.filter(c=>c.tier===mode).map(c=>c.brand));
  const spacer = bar.querySelector('.spacer');
  brandsInMode.forEach(b=>{
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = b;
    chip.dataset.brand = b;
    chip.onclick = ()=>setBrandChip(chip);
    bar.insertBefore(chip, spacer);
  });
}

function setBrandChip(el){
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  activeBrandChip = el.dataset.brand;
  document.getElementById('searchBrand').value = activeBrandChip;
  applyFilters();
}

/* ---------- PHOTO with fallback to icon ---------- */
function handleImgError(imgEl, tier){
  imgEl.parentElement.innerHTML = carIcon(tier);
}
function carPhoto(c){
  if(!c.img) return carIcon(c.tier);
  return `<img src="${c.img}" alt="${c.brand} ${c.model}" loading="lazy" onerror="handleImgError(this,'${c.tier}')">`;
}
function renderThumbstrip(c){
  const photos = (typeof GALLERY !== 'undefined' && GALLERY[c.id]) ? GALLERY[c.id] : null;
  if(!photos || photos.length < 2) return '';
  return `<div class="thumbstrip">${photos.map((url,i)=>
    `<img src="${url}" class="${i===0?'active':''}" onclick="swapMainPhoto(this,'${url}')" loading="lazy">`
  ).join('')}</div>`;
}
function swapMainPhoto(thumbEl, url){
  document.getElementById('panelMainArt').innerHTML = `<img src="${url}" alt="">`;
  thumbEl.parentElement.querySelectorAll('img').forEach(i=>i.classList.remove('active'));
  thumbEl.classList.add('active');
}

/* ---------- ICON (generic car silhouette, not brand specific) ---------- */
function carIcon(tier){
  const stroke = tier==='luxury' ? '#C6A15B' : '#1E4FD8';
  return `<svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 60 L28 34 Q34 24 48 24 L138 24 Q150 24 158 34 L172 60" stroke="${stroke}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <rect x="10" y="58" width="168" height="18" rx="9" stroke="${stroke}" stroke-width="3" fill="none" opacity="0.85"/>
    <circle cx="48" cy="78" r="11" stroke="${stroke}" stroke-width="3" fill="none"/>
    <circle cx="146" cy="78" r="11" stroke="${stroke}" stroke-width="3" fill="none"/>
    <line x1="70" y1="24" x2="70" y2="46" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
    <line x1="118" y1="24" x2="118" y2="46" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
  </svg>`;
}

/* ---------- RENDER GRID ---------- */
function currentFiltered(){
  const brand = document.getElementById('searchBrand').value;
  const type = document.getElementById('searchType').value;
  const priceRange = document.getElementById('searchPrice').value;
  return CARS.filter(c=>{
    if(c.tier !== mode) return false;
    if(brand && c.brand !== brand) return false;
    if(type && c.type !== type) return false;
    if(priceRange){
      const [min,max] = priceRange.split('-').map(Number);
      if(c.price < min || c.price > max) return false;
    }
    return true;
  });
}

function fmtPrice(p){ return '$' + p.toLocaleString('en-US'); }

function renderGrid(){
  const list = currentFiltered();
  const grid = document.getElementById('grid');
  document.getElementById('resultCount').textContent = `${list.length} car${list.length!==1?'s':''}`;

  if(list.length === 0){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">
      <h3>Nothing matches yet.</h3>
      <p>Try a wider price range or clear a filter.</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map((c,i)=>{
    const inCompare = compareIds.includes(c.id);
    return `
    <div class="card" style="transition-delay:${Math.min(i%12,12)*40}ms" onclick="openPanel('${c.id}')">
      <div class="art">${carPhoto(c)}</div>
      <div class="brandline">
        <span class="brand">${c.brand}</span>
        <span class="badge">${c.type}</span>
      </div>
      <h3>${c.model}</h3>
      <div class="meta">${c.year} &middot; ${c.hp} hp &middot; ${c.drivetrain}</div>
      <div class="priceline">
        <div class="price">${fmtPrice(c.price)}<br><small>starting MSRP</small></div>
        <button class="compare-btn ${inCompare?'on':''}" onclick="event.stopPropagation(); toggleCompare('${c.id}')">${inCompare? '✓ Added' : '+ Compare'}</button>
      </div>
    </div>`;
  }).join('');
  observeCards();
}

function applyFilters(){ renderGrid(); }

/* ---------- MODE TOGGLE ---------- */
function toggleMode(){
  mode = mode === 'daily' ? 'luxury' : 'daily';
  document.documentElement.setAttribute('data-mode', mode);
  document.getElementById('modeLabel').textContent = mode==='daily' ? 'Daily Drivers' : 'Private Collection';
  document.getElementById('heroEyebrow').textContent = mode==='daily' ? 'Every car has a lane' : 'Some cars need no introduction';
  document.getElementById('heroTitle').textContent = mode==='daily'
    ? 'Find the car that fits your road.'
    : 'Step into the private collection.';
  document.getElementById('heroSub').textContent = mode==='daily'
    ? 'Browse everyday favorites from Toyota, Ford, Honda and Tesla — or step into the private collection for Ferrari, Bentley, Rolls-Royce and Lexus.'
    : 'Rolls-Royce, Ferrari, Bentley and the flagship lines from Mercedes-Benz, BMW and Porsche. No price is quiet about what it is.';
  document.getElementById('searchBrand').value = '';
  document.getElementById('searchType').value = '';
  document.getElementById('searchPrice').value = '';
  activeBrandChip = '';
  buildBrandChips();
  document.querySelector('.chip[data-brand=""]').classList.add('active');
  renderGrid();
  renderHeroCarousel();
}

/* ---------- DETAIL PANEL ---------- */
function openPanel(id){
  const c = CARS.find(x=>x.id===id);
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  const inCompare = compareIds.includes(c.id);

  const crossoverNote = CROSSOVER_BRANDS.includes(c.brand)
    ? `<div class="also">${c.brand} also builds ${c.tier==='luxury' ? 'more attainable everyday models — switch to <b>Daily Drivers</b> to see them.' : 'flagship models in the private collection — switch to <b>Private Collection</b> to see them.'}</div>`
    : '';

  panel.innerHTML = `
    <button class="close" onclick="closePanel()">&times;</button>
    <div class="art-lg" id="panelMainArt">${carPhoto(c)}</div>
    ${renderThumbstrip(c)}
    <div class="brand">${c.brand}</div>
    <h2>${c.model}</h2>
    <div class="tagline">${c.tagline}</div>
    <div class="specs">
      <div><div class="label">Year</div><div class="val">${c.year}</div></div>
      <div><div class="label">Body type</div><div class="val">${c.type}</div></div>
      <div><div class="label">Horsepower</div><div class="val mono">${c.hp} hp</div></div>
      <div><div class="label">Drivetrain</div><div class="val">${c.drivetrain}</div></div>
      <div><div class="label">Seats</div><div class="val">${c.seats}</div></div>
      <div><div class="label">Origin</div><div class="val">${c.origin}</div></div>
      ${c.range!=='N/A' ? `<div><div class="label">EV range</div><div class="val mono">${c.range}</div></div>` : ''}
    </div>
    <div class="bigprice mono">${fmtPrice(c.price)}</div>
    ${crossoverNote}
    <button class="add-compare ${inCompare?'on':''}" onclick="toggleCompare('${c.id}', true)">${inCompare? '✓ Added to compare' : '+ Add to compare'}</button>
  `;
  overlay.classList.add('show');
  panel.classList.add('show');
}
function closePanel(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('panel').classList.remove('show');
}

/* ---------- COMPARE ---------- */
function toggleCompare(id, fromPanel){
  const idx = compareIds.indexOf(id);
  if(idx>-1){
    compareIds.splice(idx,1);
  } else {
    if(compareIds.length>=3){
      compareIds.shift();
    }
    compareIds.push(id);
  }
  renderGrid();
  renderCompareBar();
  if(fromPanel) openPanel(id);
  document.getElementById('navCompareCount').textContent = compareIds.length;
  const mobileCount = document.getElementById('navCompareCountMobile');
  if(mobileCount) mobileCount.textContent = compareIds.length;
}

function renderCompareBar(){
  const bar = document.getElementById('comparebar');
  const slots = document.getElementById('compareSlots');
  if(compareIds.length===0){ bar.classList.remove('show'); return; }
  bar.classList.add('show');
  slots.innerHTML = compareIds.map(id=>{
    const c = CARS.find(x=>x.id===id);
    return `<div class="slot">${c.brand} ${c.model} <button onclick="toggleCompare('${id}')">&times;</button></div>`;
  }).join('');
}

function openModal(){
  if(compareIds.length===0) return;
  const wrap = document.getElementById('compareTableWrap');
  const cars = compareIds.map(id=>CARS.find(x=>x.id===id));
  const rows = [
    ['Price', c=>fmtPrice(c.price)],
    ['Body type', c=>c.type],
    ['Horsepower', c=>c.hp+' hp'],
    ['Drivetrain', c=>c.drivetrain],
    ['Seats', c=>c.seats],
    ['Origin', c=>c.origin],
    ['EV range', c=>c.range],
  ];
  wrap.innerHTML = `<table class="compare-table">
    <tr><th>&nbsp;</th>${cars.map(c=>`<td class="name">${c.brand} ${c.model}</td>`).join('')}</tr>
    ${rows.map(([label,fn])=>`<tr><th>${label}</th>${cars.map(c=>`<td>${fn(c)}</td>`).join('')}</tr>`).join('')}
  </table>`;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal(){ document.getElementById('modalOverlay').classList.remove('show'); }

/* ---------- VIEW SWITCHING ---------- */
function showHome(){
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('listingView').style.display = 'none';
  document.getElementById('backToHome').style.display = 'none';
  window.scrollTo({top:0, behavior:'smooth'});
}
function showListing(brand){
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('listingView').style.display = 'block';
  document.getElementById('backToHome').style.display = 'inline-flex';
  if(brand){
    // pick the tier that has cars for this brand so they aren't hidden
    const hasDaily = CARS.some(c=>c.brand===brand && c.tier==='daily');
    const hasLuxury = CARS.some(c=>c.brand===brand && c.tier==='luxury');
    if(mode==='daily' && !hasDaily && hasLuxury) toggleModeSilent('luxury');
    else if(mode==='luxury' && !hasLuxury && hasDaily) toggleModeSilent('daily');
    activeBrandChip = brand;
    document.getElementById('searchBrand').value = brand;
  } else {
    activeBrandChip = '';
    document.getElementById('searchBrand').value = '';
  }
  buildBrandChips();
  const chipToActivate = brand
    ? [...document.querySelectorAll('.chip')].find(c=>c.dataset.brand===brand)
    : document.querySelector('.chip[data-brand=""]');
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  if(chipToActivate) chipToActivate.classList.add('active');
  renderGrid();
  window.scrollTo({top:0, behavior:'smooth'});
}
function toggleModeSilent(newMode){
  mode = newMode;
  document.documentElement.setAttribute('data-mode', mode);
  document.getElementById('modeLabel').textContent = mode==='daily' ? 'Daily Drivers' : 'Private Collection';
}
function searchFromHome(){
  showListing();
  applyFilters();
}

/* ---------- BRAND SHOWCASE ---------- */
function buildBrandShowcase(){
  const brands = uniqueSorted(CARS.map(c=>c.brand));
  const wrap = document.getElementById('brandGrid');
  wrap.innerHTML = brands.map(b=>{
    const carsForBrand = CARS.filter(c=>c.brand===b);
    const rep = carsForBrand.find(c=>c.tier==='daily' && c.img) || carsForBrand.find(c=>c.img) || carsForBrand[0];
    const img = rep && rep.img ? rep.img : '';
    return `<div class="brand-card" onclick="showListing('${b}')">
      ${img ? `<img src="${img}" alt="${b}" loading="lazy">` : ''}
      <div class="overlay-grad"></div>
      <div class="info">
        <div class="bname">${b}</div>
        <div class="bcount">${carsForBrand.length} model${carsForBrand.length!==1?'s':''}</div>
      </div>
    </div>`;
  }).join('');
  observeGeneric('.brand-card');
}

/* ---------- FEATURED FLAGSHIPS ---------- */
const FLAGSHIP_IDS = ['rr-phantom','ferrari-296','porsche-911','tesla-s','toyota-land-cruiser','lexus-lc','bentley-continental','merc-maybach'];
function buildFlagshipRow(){
  const wrap = document.getElementById('flagshipRow');
  const cars = FLAGSHIP_IDS.map(id=>CARS.find(c=>c.id===id)).filter(Boolean);
  wrap.innerHTML = cars.map(c=>`
    <div class="flagship-card" onclick="goToCarFromHome('${c.id}')">
      <div class="fimg">${carPhoto(c)}</div>
      <div class="finfo">
        <div class="fbrand">${c.brand}</div>
        <div class="fmodel">${c.model}</div>
        <div class="fprice">${fmtPrice(c.price)}</div>
      </div>
    </div>`).join('');
  observeGeneric('.flagship-card');
}
function goToCarFromHome(id){
  const c = CARS.find(x=>x.id===id);
  if(!c) return;
  if(mode !== c.tier) toggleModeSilent(c.tier);
  showListing();
  applyFilters();
  openPanel(id);
}

/* ---------- TIER SPLIT ---------- */
function buildTierSplit(){
  const dailyCar = CARS.find(c=>c.id==='toy-camry') || CARS.find(c=>c.tier==='daily');
  const luxuryCar = CARS.find(c=>c.id==='rr-ghost') || CARS.find(c=>c.tier==='luxury');
  const wrap = document.getElementById('tierSplit');
  wrap.innerHTML = `
    <div class="tier-panel" onclick="goTier('daily')">
      <img src="${dailyCar.img}" alt="">
      <div class="overlay-grad"></div>
      <div class="tinfo">
        <div class="tkicker">Everyday lineup</div>
        <h3>Daily Drivers</h3>
        <p>Toyota, Ford, Honda, Tesla and more — real cars for the daily commute.</p>
      </div>
    </div>
    <div class="tier-panel" onclick="goTier('luxury')">
      <img src="${luxuryCar.img}" alt="">
      <div class="overlay-grad"></div>
      <div class="tinfo">
        <div class="tkicker">By appointment</div>
        <h3>Private Collection</h3>
        <p>Rolls-Royce, Ferrari, Bentley and the flagship lines — no price is quiet about what it is.</p>
      </div>
    </div>
  `;
}
function goTier(tier){
  if(mode !== tier) toggleModeSilent(tier);
  showListing();
}

/* ---------- GENERIC SCROLL REVEAL ---------- */
function observeGeneric(selector){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.1, rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll(selector+':not(.visible)').forEach(el=>obs.observe(el));
}

/* ---------- MOBILE MENU ---------- */
function toggleMobileMenu(){
  document.getElementById('mobileMenu').classList.toggle('open');
}
function closeMobileMenu(){
  document.getElementById('mobileMenu').classList.remove('open');
}

/* ---------- HERO CAROUSEL ---------- */
let heroInterval = null;
let heroIndex = 0;
function pickHeroPhotos(tier, count){
  const brands = [...new Set(CARS.filter(c=>c.tier===tier && c.img).map(c=>c.brand))];
  const picks = [];
  for(const b of brands){
    const car = CARS.find(c=>c.tier===tier && c.brand===b && c.img);
    if(car) picks.push(car.img);
    if(picks.length>=count) break;
  }
  return picks.length ? picks : CARS.filter(c=>c.img).slice(0,count).map(c=>c.img);
}
function renderHeroCarousel(){
  const photos = pickHeroPhotos(mode, 5);
  const el = document.getElementById('heroCarousel');
  heroIndex = 0;
  el.innerHTML = photos.map((url,i)=>`<img src="${url}" class="${i===0?'active':''}" alt="">`).join('');
  if(heroInterval) clearInterval(heroInterval);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(photos.length>1 && !reduceMotion){
    heroInterval = setInterval(()=>{
      const imgs = el.querySelectorAll('img');
      if(!imgs.length) return;
      imgs[heroIndex].classList.remove('active');
      heroIndex = (heroIndex+1) % imgs.length;
      imgs[heroIndex].classList.add('active');
    }, 5000);
  }
}

/* ---------- BRAND TICKER ---------- */
function buildTicker(){
  const brands = uniqueSorted(CARS.map(c=>c.brand));
  const track = document.getElementById('brandTicker');
  const items = brands.map(b=>`<span>${b}</span>`).join('');
  track.innerHTML = items + items; // duplicate for seamless loop
}

/* ---------- ANIMATED STATS ---------- */
function animateCount(el, target, suffix, duration){
  const start = performance.now();
  function step(now){
    const progress = Math.min((now-start)/duration, 1);
    const eased = 1 - Math.pow(1-progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
let statsAnimated = false;
function initStatsObserver(){
  const strip = document.getElementById('statsStrip');
  const prices = CARS.map(c=>c.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const priceEl = document.getElementById('statPriceSpan');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting && !statsAnimated){
        statsAnimated = true;
        document.querySelectorAll('.stat-num[data-target]').forEach(el=>{
          const target = parseInt(el.dataset.target, 10);
          const suffix = el.dataset.suffix || '';
          if(reduceMotion){ el.textContent = target + suffix; }
          else { animateCount(el, target, suffix, 1400); }
        });
        priceEl.textContent = reduceMotion
          ? `${fmtPrice(minP)} – ${fmtPrice(maxP)}`
          : '';
        if(!reduceMotion){
          animatePriceRange(priceEl, minP, maxP, 1400);
        }
        obs.disconnect();
      }
    });
  }, {threshold:0.3});
  obs.observe(strip);
}
function animatePriceRange(el, min, max, duration){
  const start = performance.now();
  function step(now){
    const progress = Math.min((now-start)/duration, 1);
    const eased = 1 - Math.pow(1-progress, 3);
    el.textContent = `${fmtPrice(Math.round(eased*min))} – ${fmtPrice(Math.round(eased*max))}`;
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- CARD SCROLL REVEAL ---------- */
let cardObserver = null;
function observeCards(){
  if(!cardObserver){
    cardObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          cardObserver.unobserve(entry.target);
        }
      });
    }, {threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  }
  document.querySelectorAll('.card:not(.visible)').forEach(card=>cardObserver.observe(card));
}

/* ---------- BOOT ---------- */
/* ---------- REVEAL OBSERVER (generic sections) ---------- */
function initRevealObserver(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
}

/* ---------- BOOT (fetch live data from backend, fall back to bundled data) ---------- */
async function loadCarData(){
  try {
    const res = await fetch(`${API_BASE}/cars`, {cache:'no-store'});
    if(!res.ok) throw new Error(`Backend responded with ${res.status}`);
    const json = await res.json();
    if(!json.cars || !json.cars.length) throw new Error('Backend returned no cars');
    CARS = json.cars;
    GALLERY = {};
    json.cars.forEach(c=>{
      if(c.gallery && c.gallery.length > 1) GALLERY[c.id] = c.gallery;
    });
    usingFallbackData = false;
    console.log(`WheelRev: loaded ${CARS.length} cars from backend API.`);
  } catch(err){
    console.warn('WheelRev: backend unreachable, using bundled fallback data.', err.message);
    CARS = FALLBACK_CARS;
    GALLERY = FALLBACK_GALLERY;
    usingFallbackData = true;
  }
}

async function boot(){
  await loadCarData();
  populateSelects();
  buildBrandChips();
  renderGrid();
  renderHeroCarousel();
  buildTicker();
  initStatsObserver();
  buildBrandShowcase();
  buildFlagshipRow();
  buildTierSplit();
  initRevealObserver();
}

boot();
