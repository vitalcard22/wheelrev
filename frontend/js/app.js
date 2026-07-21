/* ---------- API CONFIG ---------- */
// Update this once the backend is deployed (e.g. your Fly.io URL).
// Left as localhost for local development.
const API_BASE = 'https://wheelrev-backend.fly.dev/api';

/* ---------- DATA (live, populated by boot()) ---------- */
let CARS = [];
let GALLERY = {};
let usingFallbackData = false;

/* ---------- STATE ---------- */
let mode = 'daily'; // 'daily' | 'luxury'
let activeBrandChip = '';
let compareIds = [];
let cartIds = [];

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
    const inCart = cartIds.includes(c.id);
    return `
    <div class="card" style="transition-delay:${Math.min(i%12,12)*45}ms" onclick="openPanel('${c.id}')">
      <div class="art">${carPhoto(c)}</div>
      <div class="body">
        <div class="brandline">
          <span class="brand">${c.brand}</span>
          <span class="badge">${c.type}</span>
        </div>
        <h3>${c.model}</h3>
        <div class="meta">${c.year} &middot; ${c.hp} hp &middot; ${c.drivetrain}</div>
        <div class="priceline">
          <div class="price">${fmtPrice(c.price)}<small>Starting MSRP</small></div>
          <div class="card-actions">
            <button class="cart-btn ${inCart?'on':''}" onclick="event.stopPropagation(); toggleCart('${c.id}')">${inCart? '✓ Reserved' : 'Reserve'}</button>
            <button class="compare-btn ${inCompare?'on':''}" onclick="event.stopPropagation(); toggleCompare('${c.id}')">${inCompare? '✓ Added' : 'Compare'}</button>
          </div>
        </div>
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
  const inCart = cartIds.includes(c.id);

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

    <div class="finance-calc">
      <div class="finance-calc-head">Estimate your payment</div>
      <div class="field-row">
        <div class="field"><label>Down payment</label><input type="number" id="fc_down" value="${Math.round(c.price*0.1)}" min="0" oninput="updateFinanceCalc(${c.price})"></div>
        <div class="field">
          <label>Loan term</label>
          <select id="fc_term" onchange="updateFinanceCalc(${c.price})">
            <option value="36">36 months</option>
            <option value="48">48 months</option>
            <option value="60" selected>60 months</option>
            <option value="72">72 months</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Estimated APR (%)</label>
        <input type="number" id="fc_apr" value="6.9" step="0.1" min="0" oninput="updateFinanceCalc(${c.price})">
      </div>
      <div class="finance-result">
        <span>Estimated payment</span>
        <span class="mono" id="fc_monthly">$0/mo</span>
      </div>
      <div class="finance-disclaimer">Estimate only, not a loan offer. Your actual rate depends on credit approval and lender terms.</div>
    </div>

    <button class="reserve-btn ${inCart?'on':''}" onclick="toggleCart('${c.id}', true)">${inCart? '✓ In your cart' : 'Reserve this car'}</button>
    <button class="add-compare ${inCompare?'on':''}" onclick="toggleCompare('${c.id}', true)">${inCompare? '✓ Added to compare' : '+ Add to compare'}</button>
  `;
  overlay.classList.add('show');
  panel.classList.add('show');
  updateFinanceCalc(c.price);
}
function closePanel(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('panel').classList.remove('show');
}

/* ---------- FINANCING CALCULATOR ---------- */
function updateFinanceCalc(price){
  const downEl = document.getElementById('fc_down');
  const termEl = document.getElementById('fc_term');
  const aprEl = document.getElementById('fc_apr');
  const resultEl = document.getElementById('fc_monthly');
  if(!downEl || !termEl || !aprEl || !resultEl) return;

  const down = Math.max(0, Number(downEl.value) || 0);
  const term = Number(termEl.value);
  const apr = Math.max(0, Number(aprEl.value) || 0);
  const principal = Math.max(0, price - down);
  const monthlyRate = apr / 100 / 12;

  let payment;
  if(monthlyRate === 0){
    payment = principal / term;
  } else {
    payment = principal * monthlyRate * Math.pow(1+monthlyRate, term) / (Math.pow(1+monthlyRate, term) - 1);
  }
  resultEl.textContent = `${fmtPrice(Math.round(payment))}/mo`;
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

/* ---------- CART / RESERVE ---------- */
function toggleCart(id, fromPanel){
  const idx = cartIds.indexOf(id);
  if(idx>-1){ cartIds.splice(idx,1); }
  else { cartIds.push(id); }
  renderGrid();
  renderCartBar();
  if(fromPanel) openPanel(id);
  const cartCount = document.getElementById('navCartCount');
  if(cartCount) cartCount.textContent = cartIds.length;
  const cartCountMobile = document.getElementById('navCartCountMobile');
  if(cartCountMobile) cartCountMobile.textContent = cartIds.length;
}

function renderCartBar(){
  const bar = document.getElementById('cartbar');
  const slots = document.getElementById('cartSlots');
  if(!bar) return;
  if(cartIds.length===0){ bar.classList.remove('show'); return; }
  bar.classList.add('show');
  slots.innerHTML = cartIds.map(id=>{
    const c = CARS.find(x=>x.id===id);
    return `<div class="slot">${c.brand} ${c.model} <button onclick="toggleCart('${id}')">&times;</button></div>`;
  }).join('');
}

function openCheckout(){
  if(cartIds.length===0) return;
  const cars = cartIds.map(id=>CARS.find(x=>x.id===id));
  const total = cars.reduce((sum,c)=>sum+c.price,0);

  // render car items with photos
  document.getElementById('checkoutItems').innerHTML = cars.map(c=>`
    <div class="checkout-car-item">
      <div class="thumb">${c.img ? `<img src="${c.img}" alt="">` : ''}</div>
      <div class="detail">
        <div class="cn">${c.brand} ${c.model}</div>
        <div class="cm">${c.year} · ${c.hp} hp · ${c.drivetrain}</div>
      </div>
      <div class="cp">${fmtPrice(c.price)}</div>
    </div>`).join('');

  document.getElementById('checkoutTotal').textContent = fmtPrice(total);
  document.getElementById('co_fc_down').value = Math.round(total*0.1);
  // set min date to today
  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('co_date');
  if(dateEl) dateEl.min = today;

  document.getElementById('checkoutForm').style.display = 'block';
  document.getElementById('checkoutSuccess').style.display = 'none';
  document.getElementById('checkoutError').textContent = '';
  document.getElementById('checkoutOverlay').classList.add('show');
  updateCheckoutFinanceCalc();
}
function updateCheckoutFinanceCalc(){
  const cars = cartIds.map(id=>CARS.find(x=>x.id===id));
  const total = cars.reduce((sum,c)=>sum+c.price,0);
  const downEl = document.getElementById('co_fc_down');
  const termEl = document.getElementById('co_fc_term');
  const aprEl = document.getElementById('co_fc_apr');
  const resultEl = document.getElementById('co_fc_monthly');
  if(!downEl || !termEl || !aprEl || !resultEl) return;

  const down = Math.max(0, Number(downEl.value) || 0);
  const term = Number(termEl.value);
  const apr = Math.max(0, Number(aprEl.value) || 0);
  const principal = Math.max(0, total - down);
  const monthlyRate = apr / 100 / 12;

  let payment;
  if(monthlyRate === 0){
    payment = principal / term;
  } else {
    payment = principal * monthlyRate * Math.pow(1+monthlyRate, term) / (Math.pow(1+monthlyRate, term) - 1);
  }
  resultEl.textContent = `${fmtPrice(Math.round(payment))}/mo`;
}
function closeCheckout(){
  const overlay = document.getElementById('checkoutOverlay');
  // cancel any pending Stripe redirect if modal is closed early
  if(overlay.dataset.pendingRedirect){
    clearTimeout(Number(overlay.dataset.pendingRedirect));
    delete overlay.dataset.pendingRedirect;
  }
  overlay.classList.remove('show');
}

// STRIPE_DEPOSIT_URL: paste your real Stripe payment link here once you create one
// at stripe.com → Products → Payment links. The link should be for a $500 deposit product.
const STRIPE_DEPOSIT_URL = 'https://buy.stripe.com/YOUR_LINK_HERE';

async function submitCheckout(withDeposit = false){
  const name = document.getElementById('co_name').value.trim();
  const email = document.getElementById('co_email').value.trim();
  const phone = document.getElementById('co_phone').value.trim();
  const financing = document.getElementById('co_financing').value;
  const message = document.getElementById('co_message').value.trim();
  const apptDate = document.getElementById('co_date')?.value || '';
  const apptTime = document.getElementById('co_time')?.value || '';
  const tiYear = document.getElementById('co_ti_year')?.value || '';
  const tiMake = document.getElementById('co_ti_make')?.value.trim() || '';
  const tiModel = document.getElementById('co_ti_model')?.value.trim() || '';
  const tiMiles = document.getElementById('co_ti_miles')?.value.trim() || '';
  const errEl = document.getElementById('checkoutError');

  if(!name || !email){
    errEl.textContent = 'Name and email are required.';
    return;
  }

  // Build a rich message string that includes appointment + trade-in details
  const extras = [];
  if(apptDate) extras.push(`Appointment: ${apptDate}${apptTime ? ' ' + apptTime : ''}`);
  if(tiMake || tiModel) extras.push(`Trade-in: ${tiYear} ${tiMake} ${tiModel}${tiMiles ? ' (' + tiMiles + ' miles)' : ''}`);
  if(message) extras.push(message);
  const fullMessage = extras.join(' | ') || null;

  const items = cartIds.map(id=>{
    const c = CARS.find(x=>x.id===id);
    return {id: c.id, brand: c.brand, model: c.model, price: c.price};
  });

  const btn = withDeposit
    ? document.getElementById('checkoutDepositBtn')
    : document.getElementById('checkoutSubmitBtn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try{
    const res = await fetch(`${API_BASE}/orders`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({items, name, email, phone, financing, message: fullMessage})
    });
    const json = await res.json();
    if(!res.ok){
      errEl.textContent = json.error || 'Something went wrong. Please try again.';
      btn.disabled = false;
      btn.textContent = origText;
      return;
    }

    // Show success screen with order reference
    const refEl = document.getElementById('checkoutRef');
    if(refEl && json.orderIds && json.orderIds.length){
      refEl.textContent = `Reference: WR-${String(json.orderIds[0]).padStart(5,'0')}`;
    }
    document.getElementById('checkoutForm').style.display = 'none';
    document.getElementById('checkoutSuccess').style.display = 'block';

    // Clear cart
    cartIds = [];
    renderGrid();
    renderCartBar();
    ['navCartCount','navCartCountMobile'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.textContent = 0;
    });

    // Redirect to Stripe if deposit was chosen
    if(withDeposit){
      if(STRIPE_DEPOSIT_URL.includes('YOUR_LINK_HERE')){
        if(refEl) refEl.textContent = (refEl.textContent ? refEl.textContent + ' · ' : '') + 'Stripe not yet configured — contact us directly to pay the deposit.';
      } else {
        const redirectTimer = setTimeout(()=>{ window.location.href = STRIPE_DEPOSIT_URL; }, 1800);
        // cancel redirect if modal is closed before it fires
        document.getElementById('checkoutOverlay').dataset.pendingRedirect = redirectTimer;
      }
    }
  } catch(err){
    errEl.textContent = 'Could not reach the server. Check your connection and try again.';
    btn.disabled = false;
    btn.textContent = origText;
  }
}

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
  document.getElementById('brandGrid').innerHTML = brands.map((b,i)=>{
    const forBrand = CARS.filter(c=>c.brand===b && c.img);
    const seen = new Set(); const photos = [];
    for(const c of forBrand){
      if(!seen.has(c.img)){ seen.add(c.img); photos.push(c.img); }
      if(photos.length>=4) break;
    }
    return `<div class="brand-card rv" data-d="${i%4}" onclick="showListing('${b}')">
      ${photos.map((u,j)=>`<img src="${u}" alt="${b}" loading="lazy" class="${j===0?'on':''}">`).join('')}
      <div class="veil"></div>
      <div class="meta"><span class="bn">${b}</span><span class="bc">${forBrand.length}</span></div>
    </div>`;
  }).join('');
  observeGeneric('.brand-card');
  initBrandCardCycling();
}

let brandCardIntervals = [];
function initBrandCardCycling(){
  brandCardIntervals.forEach(clearInterval);
  brandCardIntervals = [];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion) return;
  document.querySelectorAll('.brand-card').forEach((card, cardIndex)=>{
    const imgs = card.querySelectorAll('img');
    if(imgs.length < 2) return;
    let idx = 0;
    const interval = setInterval(()=>{
      imgs[idx].classList.remove('on');
      idx = (idx+1) % imgs.length;
      imgs[idx].classList.add('on');
    }, 3600 + (cardIndex % 5) * 420); // staggered so the grid never flips in unison
    brandCardIntervals.push(interval);
  });
}

/* ---------- FEATURED FLAGSHIPS ---------- */
const FLAGSHIP_IDS = ['rr-phantom','ferrari-296','porsche-911','tesla-s','toyota-land-cruiser','lexus-lc','bentley-continental','merc-maybach'];
function buildFlagshipRow(){
  const cars = FLAGSHIP_IDS.map(id=>CARS.find(c=>c.id===id)).filter(Boolean);
  document.getElementById('flagshipRow').innerHTML = cars.map(c=>`
    <div class="rail-card" onclick="goToCarFromHome('${c.id}')">
      <div class="ph">${carPhoto(c)}</div>
      <div class="info">
        <div class="rb">${c.brand}</div>
        <div class="rm">${c.model}</div>
        <div class="rp">${fmtPrice(c.price)}</div>
      </div>
    </div>`).join('');
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
  const dailyCar = CARS.find(c=>c.id==='toy-camry') || CARS.find(c=>c.tier==='daily' && c.img);
  const luxuryCar = CARS.find(c=>c.id==='rr-ghost') || CARS.find(c=>c.tier==='luxury' && c.img);
  const dailyCount = CARS.filter(c=>c.tier==='daily').length;
  const luxCount = CARS.filter(c=>c.tier==='luxury').length;
  document.getElementById('tierSplit').innerHTML = `
    <div class="lane rv" onclick="goTier('daily')">
      <div class="lane-media" data-par="0.14"><img src="${dailyCar.img}" alt="" loading="lazy"></div>
      <div class="lane-veil"></div>
      <div class="lane-body">
        <div class="tag">${dailyCount} cars \u00b7 everyday lineup</div>
        <h3>Daily Drivers</h3>
        <p>Toyota, Ford, Honda, Tesla. The cars that start every morning without being asked twice.</p>
        <div class="go">Browse daily</div>
      </div>
    </div>
    <div class="lane rv" data-d="1" onclick="goTier('luxury')">
      <div class="lane-media" data-par="0.14"><img src="${luxuryCar.img}" alt="" loading="lazy"></div>
      <div class="lane-veil"></div>
      <div class="lane-body">
        <div class="tag">${luxCount} cars \u00b7 by appointment</div>
        <h3>Private Collection</h3>
        <p>Rolls-Royce, Ferrari, Bentley and the flagship lines. No price here is quiet about what it is.</p>
        <div class="go">Browse private</div>
      </div>
    </div>`;
  observeGeneric('.lane');
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
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll(selector+':not(.in)').forEach(el=>obs.observe(el));
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
  el.innerHTML = photos.map((url,i)=>`<img src="${url}" class="${i===0?'on':''}" alt="">`).join('');
  if(heroInterval) clearInterval(heroInterval);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(photos.length>1 && !reduceMotion){
    heroInterval = setInterval(()=>{
      const imgs = el.querySelectorAll('img');
      if(!imgs.length) return;
      imgs[heroIndex].classList.remove('on');
      heroIndex = (heroIndex+1) % imgs.length;
      imgs[heroIndex].classList.add('on');
    }, 6000);
  }
}

/* ---------- BRAND TICKER ---------- */
function buildTicker(){
  const brands = uniqueSorted(CARS.map(c=>c.brand));
  const track = document.getElementById('brandTicker');
  const items = brands.map(b=>`<span>${b}</span>`).join('');
  track.innerHTML = items + items; // duplicated so the loop is seamless
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

/* ---------- FAQ ---------- */
const FAQS = [
  ['Does reserving a car cost anything?',
   'No. A reservation request is a message, not a payment \u2014 nothing is charged on this site and no card details are ever collected. It tells us which car you want so we can hold the conversation and arrange a test drive.'],
  ['Are the prices final?',
   'Prices shown are indicative starting MSRP for the base configuration. Options, taxes, title and registration are not included. We confirm the exact out-the-door figure in writing before anything is signed.'],
  ['Can I get financing through you?',
   'Yes, and you can also bring your own. Tell us which you prefer when you reserve. The payment estimator on each car is a rough guide only \u2014 it is not a quote, and your real rate depends on credit approval.'],
  ['Can I trade in my current car?',
   'Yes. Mention it in the reservation message and we will appraise it when you come in. A trade-in offer is separate from the price of the car you are buying.'],
  ['Do you deliver?',
   'Within Ohio, yes. Outside it, we can arrange transport at cost. Either way we walk you through the car over video first so there are no surprises on the truck.'],
  ['What if the car is gone by the time I arrive?',
   'Inventory moves. Reserving is the fastest way to avoid that \u2014 it flags the car as spoken for while we are in touch with you.']
];
function buildFaq(){
  const wrap = document.getElementById('faqList');
  if(!wrap) return;
  wrap.innerHTML = FAQS.map((f,i)=>`
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" onclick="toggleFaq(${i})" aria-expanded="false">
        ${f[0]}<span class="pm">+</span>
      </button>
      <div class="faq-a"><p>${f[1]}</p></div>
    </div>`).join('');
}
function toggleFaq(i){
  const item = document.getElementById('faq-'+i);
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(el=>{
    el.classList.remove('open');
    const b = el.querySelector('.faq-q'); if(b) b.setAttribute('aria-expanded','false');
  });
  if(!wasOpen){
    item.classList.add('open');
    item.querySelector('.faq-q').setAttribute('aria-expanded','true');
  }
}

/* ---------- VISIT PHOTO ---------- */
function buildVisitMedia(){
  const el = document.getElementById('visitMedia');
  if(!el) return;
  const c = CARS.find(x=>x.id==='porsche-911' && x.img) || CARS.find(x=>x.img);
  if(c) el.innerHTML = `<img src="${c.img}" alt="" loading="lazy" data-par="0.1">`;
}

/* ---------- PARALLAX ----------
   Elements with data-par drift slower than the page as it scrolls, so photos
   read like a camera tracking past them rather than a flat background. */
function initParallax(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = Array.from(document.querySelectorAll('[data-par]'));
  if(!els.length) return;
  let ticking = false;
  function apply(){
    const vh = window.innerHeight;
    els.forEach(el=>{
      const r = el.getBoundingClientRect();
      if(r.bottom < -200 || r.top > vh + 200) return;
      const mid = r.top + r.height/2;
      const offset = (mid - vh/2) / vh;
      const strength = parseFloat(el.dataset.par) || 0.12;
      el.style.transform = `translate3d(0, ${(offset * strength * 100).toFixed(2)}px, 0)`;
    });
    ticking = false;
  }
  function onScroll(){
    if(!ticking){ ticking = true; requestAnimationFrame(apply); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  apply();
}

/* ---------- REVEAL OBSERVER (generic sections) ---------- */
function initRevealObserver(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, {threshold:0.12, rootMargin:'0px 0px -60px 0px'});
  document.querySelectorAll('.rv').forEach(el=>obs.observe(el));
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
  buildFaq();
  buildVisitMedia();
  initRevealObserver();
  initParallax();
}

boot();
