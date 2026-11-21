/* =======================================================================
   Ancestral Abode — app.js (ES Module)
   Client-side orchestration for the homestay website
   ======================================================================= */

const API = '';   // same-origin

/* ── Utilities ─────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const fmtINR = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ── Toast ── */
const toastStack = $('#toast-stack');
function toast(msg, type = 'info', duration = 4000) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${escape(msg)}</span>`;
  toastStack.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/* ── Header scroll behaviour ── */
(function initHeader() {
  const header = $('#site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ── Navigation (Mobile drawer & scrollspy) ── */
(function initNavigation() {
  const toggle = $('#nav-toggle');
  const drawer = $('#mobile-nav-drawer');

  function closeMenu() {
    if (!drawer) return;
    toggle?.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openMenu() {
    if (!drawer) return;
    toggle?.setAttribute('aria-expanded', 'true');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) closeMenu();
      else openMenu();
    });

    $$('[data-close-mobile-nav]', drawer).forEach(el => {
      el.addEventListener('click', closeMenu);
    });

    $$('.mobile-nav-link', drawer).forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  // Active section scrollspy for desktop header nav
  const navLinks = $$('.site-header .nav-link');
  if (navLinks.length > 0 && 'IntersectionObserver' in window) {
    const sectionIds = ['story', 'rooms', 'gallery', 'experiences', 'sights', 'journal'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('is-active');
            } else {
              link.classList.remove('is-active');
            }
          });
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }
})();

/* ── Hero Slider ── */
(function initHeroSlider() {
  const slides = $$('.hero-slide');
  const dotsContainer = $('#hero-dots');
  if (!slides.length || !dotsContainer) return;

  let current = 0;
  let timer;

  // Build dots
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = `hero-dot${i === 0 ? ' is-active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-label', `Slide ${i + 1}`);
    btn.setAttribute('aria-selected', String(i === 0));
    btn.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(btn);
  });

  const dots = $$('.hero-dot', dotsContainer);

  function goTo(idx) {
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    dots[current].setAttribute('aria-selected', 'false');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
    dots[current].setAttribute('aria-selected', 'true');
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  $('#site-header')?.closest('body')?.querySelector('.hero-nav-prev')?.addEventListener('click', () => goTo(current - 1));
  $('#site-header')?.closest('body')?.querySelector('.hero-nav-next')?.addEventListener('click', () => goTo(current + 1));
  $('.hero-nav-prev')?.addEventListener('click', () => goTo(current - 1));
  $('.hero-nav-next')?.addEventListener('click', () => goTo(current + 1));

  timer = setInterval(() => goTo(current + 1), 6000);
})();

/* ── Scroll reveal (IntersectionObserver) ── */
(function initReveal() {
  const revealEls = $$('.reveal');
  if (!revealEls.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.02, rootMargin: '0px 0px 80px 0px' });
  revealEls.forEach(el => obs.observe(el));
})();

/* ── Counters ── */
(function initCounters() {
  const counterRow = $('#counter-row');
  if (!counterRow) return;
  const counters = $$('.counter', counterRow);
  let done = false;
  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting || done) return;
    done = true;
    counters.forEach(counter => {
      const target = Number(counter.dataset.target);
      const el = counter.querySelector('[data-count]');
      const suffix = counter.dataset.suffix ?? '';
      let start = 0;
      const step = Math.ceil(target / 60);
      const tick = () => {
        start = Math.min(start + step, target);
        el.textContent = start + suffix;
        if (start < target) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    obs.disconnect();
  }, { threshold: 0.5 });
  obs.observe(counterRow);
})();

/* ── Our Story: collapsible long text ── */
(function initStoryToggle() {
  const more = $('#story-more');
  const btn = $('#story-toggle');
  if (!more || !btn) return;
  const label = btn.querySelector('.story-toggle-label');
  more.classList.add('is-collapsible');
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    more.classList.toggle('is-open', open);
    more.style.maxHeight = open ? more.scrollHeight + 'px' : '';
    label.textContent = open ? 'Show less' : 'Read the full story';
    if (!open) $('#story').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  window.addEventListener('resize', () => {
    if (more.classList.contains('is-open')) more.style.maxHeight = more.scrollHeight + 'px';
  });
})();

/* ── Tab Switcher (Rooms / Experiences) ── */
(function initTabs() {
  const switcher = $('.tab-switcher');
  if (!switcher) return;
  const ink = $('.tab-ink', switcher);
  const tabs = $$('.tab-btn', switcher);

  function positionInk(btn) {
    if (!ink) return;
    ink.style.left = btn.offsetLeft + 'px';
    ink.style.width = btn.offsetWidth + 'px';
  }

  // Position on load
  const active = tabs.find(t => t.classList.contains('is-active'));
  if (active) positionInk(active);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      positionInk(tab);
      const panelId = 'panel-' + tab.dataset.tab;
      $$('.tab-panel').forEach(panel => {
        const active = panel.id === panelId;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    });
  });
})();

/* ── Carousel scroll buttons ── */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-carousel]');
  if (!btn) return;
  const carouselId = btn.dataset.carousel;
  const dir = btn.dataset.direction;
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;
  const card = carousel.querySelector('.sight-card, .review-card');
  const scrollAmt = card ? card.offsetWidth + 24 : 300;
  carousel.scrollBy({ left: dir === 'next' ? scrollAmt : -scrollAmt, behavior: 'smooth' });
});

/* ── Booking Widget stepper ── */
(function initStepper() {
  $$('[data-stepper]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.stepper;
      const input = btn.closest('.stepper').querySelector('input[type="number"]');
      if (!input) return;
      const val = parseInt(input.value, 10);
      const min = parseInt(input.min, 10) || 1;
      const max = parseInt(input.max, 10) || 99;
      input.value = Math.max(min, Math.min(max, dir === 'up' ? val + 1 : val - 1));
      input.dispatchEvent(new Event('change'));
    });
  });
})();

/* ── API fetch helpers ── */
async function apiFetch(path, opts = {}) {
  const r = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await r.json().catch(() => null);
  if (!r.ok) throw new Error(json?.error?.message || 'Request failed');
  return json?.data ?? json;
}

/* ── Load rooms ── */
let allRooms = [];
async function loadRooms() {
  const grid = $('#room-grid');
  const skeleton = $('#room-skeleton');
  if (!grid) return;
  try {
    const data = await apiFetch('/api/rooms');
    allRooms = data.rooms ?? data;
    if (skeleton) {
      skeleton.hidden = true;
      skeleton.remove();
    }
    grid.innerHTML = allRooms.map(roomCard).join('');
    // Inject room options into booking forms
    populateRoomSelects(allRooms);
  } catch (err) {
    if (skeleton) {
      skeleton.hidden = true;
      skeleton.remove();
    }
    grid.innerHTML = `<p style="color:var(--c-text-muted);grid-column:1/-1">Could not load rooms — ${escape(err.message)}</p>`;
  }
}

function roomCard(r) {
  const amenities = Array.isArray(r.amenities) ? r.amenities : JSON.parse(r.amenities || '[]');
  const desc = r.description || (Number(r.capacity) === 2
    ? 'Ideal for couples & families, this heritage suite features authentic lime-plastered arches from 1742, a canopied king bed, and an artisanal ensuite bath.'
    : 'Our spacious Deluxe Triple Room features three queen sized beds, with ample floor space and serene courtyard views framed by scalloped arches.');
  return `
  <article class="room-card reveal" data-room-id="${r.id}">
    <div class="room-card-img">
      <img src="${escape(r.imageUrl || r.image_url || '')}" alt="${escape(r.name)}" loading="lazy" decoding="async">
      <div class="room-card-badges">
        <span class="badge badge-guests">👥 Up to ${r.capacity} Guests</span>
      </div>
    </div>
    <div class="room-card-body">
      <h3 class="room-card-name">${escape(r.name)}</h3>
      <p class="room-card-desc">${escape(desc)}</p>
      <div class="room-card-amenities">
        ${amenities.slice(0, 4).map(a => `<span class="amenity-pill">${escape(a)}</span>`).join('')}
      </div>
      <div class="room-card-footer">
        <div class="room-price">
          <span class="room-price-label">From / night + tax</span>
          <span class="room-price-val">${fmtINR(r.basePrice ?? r.base_price)}</span>
        </div>
        <div class="room-card-actions">
          <a class="btn btn-whatsapp-card" href="https://wa.me/919660041516?text=${encodeURIComponent(`Hello Ancestral Abode, I am interested in inquiring about ${r.name} (${fmtINR(r.basePrice ?? r.base_price)}/night). Please share availability & details.`)}" target="_blank" rel="noopener noreferrer" title="Inquire on WhatsApp">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1-1.3-.6-2.2-1.1-3.1-2.6-.2-.3.1-.5.2-.7l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.8 3.4.7.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3Z"/></svg>
            <span>WhatsApp</span>
          </a>
          <button class="btn btn-ghost btn-sm" data-view-room="${r.id}">Details</button>
          <button class="btn btn-primary btn-sm" data-reserve-room="${r.id}">Reserve</button>
        </div>
      </div>
    </div>
  </article>`;
}

/* ── Load experiences ── */
async function loadExperiences() {
  const grid = $('#experience-grid');
  if (!grid) return;
  try {
    const data = await apiFetch('/api/experiences');
    const exps = data.experiences ?? data;
    grid.innerHTML = exps.map(expCard).join('');
  } catch(err) {
    grid.innerHTML = `<p style="color:var(--c-text-muted);grid-column:1/-1">Could not load experiences.</p>`;
  }
}

function expCard(e) {
  return `
  <article class="exp-card reveal">
    <div class="exp-card-img">
      <img src="${escape(e.imageUrl || '')}" alt="${escape(e.name)}" loading="lazy" decoding="async">
    </div>
    <div class="exp-card-body">
      <h3 class="exp-card-name">${escape(e.name)}</h3>
      <p class="exp-card-desc">${escape(e.description || '')}</p>
      <div class="exp-card-meta">
        <span class="exp-duration">⏱ ${e.durationMinutes} min · Up to ${e.maxGuests} guests</span>
        <span class="exp-price">${fmtINR(e.price)}</span>
      </div>
    </div>
  </article>`;
}

/* ── Load sights ── */
async function loadSights() {
  const carousel = $('#sights-carousel');
  if (!carousel) return;
  try {
    const data = await apiFetch('/api/sights');
    const sights = data.sights ?? data;
    carousel.innerHTML = sights.map(sightCard).join('');
  } catch(err) {
    carousel.innerHTML = `<p style="color:var(--c-text-muted)">Could not load sights.</p>`;
  }
}

function sightCard(s) {
  return `
  <div class="sight-card">
    <img src="${escape(s.imageUrl || '')}" alt="${escape(s.name)}" loading="lazy" decoding="async">
    <div class="sight-card-overlay"></div>
    <div class="sight-card-body">
      <span class="sight-distance">${escape(s.distanceLabel)}</span>
      <h3 class="sight-name">${escape(s.name)}</h3>
      <p class="sight-summary">${escape(s.summary || '')}</p>
      <button class="sight-concierge" data-concierge data-destination="${escape(s.name)}">Request Private Car</button>
    </div>
  </div>`;
}

/* ── Load reviews ── */
// Only real guest reviews are shown; with none, the section and its footer link stay hidden.
function hideReviews() {
  $('#reviews')?.setAttribute('hidden', '');
  $('[data-reviews-link]')?.setAttribute('hidden', '');
}
async function loadReviews() {
  const masonry = $('#reviews-masonry');
  if (!masonry) return;
  try {
    const data = await apiFetch('/api/reviews');
    const reviews = data.reviews ?? data;
    if (!Array.isArray(reviews) || reviews.length === 0) return hideReviews();
    masonry.innerHTML = reviews.map(reviewCard).join('');
  } catch(err) {
    hideReviews();
  }
}

const STARS = rating => '★'.repeat(rating) + '☆'.repeat(5 - rating);
const SOURCE_LABELS = { direct: 'Direct', tripadvisor: 'TripAdvisor', airbnb: 'Airbnb' };

function reviewCard(r) {
  return `
  <div class="review-card">
    <div class="review-stars">${STARS(r.rating)}</div>
    <p class="review-quote">"${escape(r.quote)}"</p>
    <div class="review-footer">
      <div class="review-guest">
        <span class="review-name">${escape(r.guestName)}</span>
        <span class="review-origin">${escape(r.guestOrigin || '')}</span>
      </div>
      <span class="review-source review-source-${escape(r.source)}">${escape(SOURCE_LABELS[r.source] || r.source)}</span>
    </div>
    <div class="review-signature">
      <svg viewBox="0 0 120 44" fill="none" aria-hidden="true">
        <path d="M6 34c14-22 30-24 40-12s6 20-4 20-14-8-10-16 14-10 26 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M62 32c10-16 22-20 30-12 5 5 2 12-4 11-5-1-6-8-1-12 8-6 20-3 25 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>`;
}

/* ── Load journal ── */
async function loadJournal() {
  const grid = $('#journal-grid');
  if (!grid) return;
  try {
    const data = await apiFetch('/api/journal');
    const posts = data.posts ?? data;
    grid.innerHTML = posts.map(journalCard).join('');
  } catch(err) {
    grid.innerHTML = `<p style="color:var(--c-text-muted);grid-column:1/-1">Could not load journal.</p>`;
  }
}

function journalCard(p) {
  return `
  <article class="journal-card reveal">
    <div class="journal-card-img">
      <img src="${escape(p.imageUrl || '')}" alt="${escape(p.title)}" loading="lazy" decoding="async">
    </div>
    <div class="journal-card-body">
      <span class="journal-cat">${escape(p.category)}</span>
      <h3 class="journal-title">${escape(p.title)}</h3>
      <p class="journal-excerpt">${escape(p.excerpt || '')}</p>
      <div class="journal-meta">
        <span class="journal-date">${fmtDate(p.publishedAt)}</span>
        <span class="journal-read">${p.readMinutes} min read →</span>
      </div>
    </div>
  </article>`;
}

/* ── Room Modal ── */
const roomModal     = $('#room-modal');
const bookingModal  = $('#booking-modal');
const conciergeModal = $('#concierge-modal');

function openModal(modal) {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  modal.focus?.();
  // Trap focus
  modal.addEventListener('keydown', trapFocus);
}
function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = '';
  modal.removeEventListener('keydown', trapFocus);
}
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusable = [...e.currentTarget.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')];
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

// Close on backdrop click / Escape
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) closeModal(e.target);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    [roomModal, bookingModal, conciergeModal].forEach(m => { if (!m.hidden) closeModal(m); });
  }
});

// Close buttons
$$('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-backdrop');
    if (modal) closeModal(modal);
  });
});

// Open room modal
document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-view-room]');
  if (!btn) return;
  const roomId = btn.dataset.viewRoom;
  try {
    const data = await apiFetch(`/api/rooms/${roomId}`);
    const room = data.room ?? data;
    const amenities = Array.isArray(room.amenities) ? room.amenities : JSON.parse(room.amenities || '[]');
    const galleryList = Array.isArray(room.gallery) && room.gallery.length
      ? room.gallery
      : [{ imageUrl: room.imageUrl || room.image_url || '', caption: room.name }];
    const mainImgUrl = galleryList[0].imageUrl;

    $('#room-modal-gallery').innerHTML = `
      <img id="room-modal-main-img" src="${escape(mainImgUrl)}" alt="${escape(room.name)}">
      ${galleryList.length > 1 ? `
        <div class="modal-gallery-thumbs" role="tablist" aria-label="Room photos">
          ${galleryList.map((g, idx) => `
            <button type="button" class="modal-gallery-thumb ${idx === 0 ? 'is-active' : ''}" data-thumb-src="${escape(g.imageUrl)}" aria-label="${escape(g.caption || 'View photo')}">
              <img src="${escape(g.imageUrl.replace('.jpg', '-thumb.jpg'))}" alt="" loading="lazy">
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;
    $('#room-modal-kicker').textContent = 'Heritage Suite';
    $('#room-modal-title').textContent = room.name;
    $('#room-modal-text').textContent = room.description || '';
    $('#room-modal-price').textContent = fmtINR(room.basePrice ?? room.base_price);
    $('#room-modal-meta').innerHTML = `
      <span>👥 Up to ${room.capacity} guests</span>
      <span>📅 From ${fmtINR(room.basePrice ?? room.base_price)} + tax / night</span>`;
    $('#room-modal-amenities').innerHTML = amenities.map(a => `<li>${escape(a)}</li>`).join('');
    $('#modal-reserve').dataset.reserveRoom = room.id;
    const modalWa = $('#modal-whatsapp');
    if (modalWa) {
      modalWa.href = `https://wa.me/919660041516?text=${encodeURIComponent(`Hello Ancestral Abode, I am inquiring about ${room.name} (${fmtINR(room.basePrice ?? room.base_price)}/night). Please share details & availability.`)}`;
    }
    openModal(roomModal);
  } catch(err) {
    toast('Could not load room details.', 'error');
  }
});

// Click room modal gallery thumbnail to switch main image
document.addEventListener('click', e => {
  const thumb = e.target.closest('.modal-gallery-thumb');
  if (!thumb) return;
  const mainImg = $('#room-modal-main-img');
  if (mainImg && thumb.dataset.thumbSrc) {
    mainImg.src = thumb.dataset.thumbSrc;
    $$('.modal-gallery-thumb').forEach(t => t.classList.remove('is-active'));
    thumb.classList.add('is-active');
  }
});

// Reserve from room modal
$('#modal-reserve')?.addEventListener('click', function() {
  closeModal(roomModal);
  openBookingModal({ roomId: this.dataset.reserveRoom });
});

// Open booking modal from direct buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-reserve-room]');
  if (!btn) return;
  openBookingModal({ roomId: btn.dataset.reserveRoom });
});

// Open booking modal from [data-open-booking]
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-open-booking]');
  if (!btn) return;
  openBookingModal({});
});

function openBookingModal({ roomId } = {}) {
  const form = $('#booking-form');
  if (!form) return;
  // Pre-fill dates from widget
  const ci = $('#check-in')?.value;
  const co = $('#check-out')?.value;
  if (ci) $('#b-check-in').value = ci;
  if (co) $('#b-check-out').value = co;

  // Default dates if none set (tomorrow + 2 nights)
  if (!$('#b-check-in')?.value) {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 1);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 3);
    if ($('#b-check-in')) $('#b-check-in').value = d1.toISOString().split('T')[0];
    if ($('#b-check-out')) $('#b-check-out').value = d2.toISOString().split('T')[0];
  }

  // Pre-select room
  const targetRoomId = roomId || $('#b-room')?.value || (allRooms && allRooms[0]?.id ? String(allRooms[0].id) : '');
  if (targetRoomId) {
    const roomSelect = $('#b-room');
    if (roomSelect && (!roomSelect.value || roomId)) roomSelect.value = targetRoomId;
    const room = allRooms.find(r => String(r.id) === String(targetRoomId));
    if (room) {
      if ($('#booking-summary-title')) $('#booking-summary-title').textContent = room.name;
      if ($('#booking-summary-img')) $('#booking-summary-img').src = room.imageUrl || room.image_url || '';
    }
  }
  updateBookingSummary();
  openModal(bookingModal);
}

function populateRoomSelects(rooms) {
  ['#room-type', '#b-room'].forEach(sel => {
    const select = $(sel);
    if (!select) return;
    const existing = [...select.options].filter(o => !o.value);
    select.innerHTML = '';
    existing.forEach(o => select.appendChild(o));
    rooms.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.name} — ${fmtINR(r.basePrice ?? r.base_price)}/night`;
      select.appendChild(opt);
    });
  });
}

// Booking summary updater
function updateBookingSummary() {
  const roomId = $('#b-room')?.value;
  const ci = $('#b-check-in')?.value;
  const co = $('#b-check-out')?.value;
  const room = allRooms.find(r => String(r.id) === String(roomId));
  const nights = ci && co ? Math.max(0, diffDays(ci, co)) : 0;
  const subtotal = room ? (room.basePrice ?? room.base_price) * nights : 0;
  const tax = nights * 500;
  const total = subtotal + tax;

  if (room) {
    $('#booking-summary-title').textContent = room.name;
    $('#booking-summary-img').src = room.imageUrl || room.image_url || '/assets/images/hero-1.jpg';
  }

  const list = $('#booking-summary-list');
  if (list) {
    list.innerHTML = nights > 0 ? `
      <li><span>Nightly rate</span><span>${fmtINR(room?.basePrice ?? room?.base_price ?? 0)}</span></li>
      <li><span>${nights} night${nights !== 1 ? 's' : ''}</span><span>${fmtINR(subtotal)}</span></li>
      <li><span>Taxes & fees</span><span>${fmtINR(tax)}</span></li>` : '';
  }

  const totalEl = $('#booking-summary-total');
  if (totalEl) totalEl.textContent = total > 0 ? fmtINR(total) : '₹—';
}

['#b-room','#b-check-in','#b-check-out'].forEach(sel => {
  $(sel)?.addEventListener('change', updateBookingSummary);
});

/* ── Booking form submit ── */
$('#booking-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = $('#booking-submit');
  const errEl = $('#booking-error');
  errEl.hidden = true;
  btn.classList.add('is-loading');
  btn.disabled = true;

  const fd = new FormData(this);
  const body = {
    roomId: Number(fd.get('roomId')),
    checkIn: fd.get('checkIn'),
    checkOut: fd.get('checkOut'),
    guests: Number(fd.get('guests')),
    guestName: fd.get('guestName'),
    guestEmail: fd.get('guestEmail'),
    guestPhone: fd.get('guestPhone'),
    specialRequests: fd.get('specialRequests') || undefined,
  };

  try {
    const data = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    closeModal(bookingModal);
    toast(`🎉 Booking confirmed! Reference: ${data.booking?.bookingReference || data.bookingReference}`, 'success', 8000);
    this.reset();
  } catch(err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});

/* ── Concierge modal ── */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-concierge]');
  if (!btn) return;
  const dest = btn.dataset.destination || '';
  const destInput = $('#c-destination');
  if (destInput && dest) destInput.value = dest;
  openModal(conciergeModal);
});

$('#concierge-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = $('#concierge-submit');
  const errEl = $('#concierge-error');
  errEl.hidden = true;
  btn.classList.add('is-loading');
  btn.disabled = true;

  const fd = new FormData(this);
  try {
    await apiFetch('/api/concierge', {
      method: 'POST',
      body: JSON.stringify({
        guestName: fd.get('guestName'),
        guestPhone: fd.get('guestPhone'),
        guestEmail: fd.get('guestEmail') || undefined,
        destination: fd.get('destination') || undefined,
        requestedDate: fd.get('requestedDate') || undefined,
        notes: fd.get('notes') || undefined,
      }),
    });
    closeModal(conciergeModal);
    toast('Car request sent! We\'ll call within the hour.', 'success');
    this.reset();
  } catch(err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});

/* ── Hero booking bar submit ── */
$('#booking-bar')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const note = $('#booking-note');
  const fd = new FormData(this);
  const ci = fd.get('checkIn');
  const co = fd.get('checkOut');
  const guests = fd.get('guests');
  if (!ci || !co) { note.textContent = 'Please pick check-in and check-out dates.'; return; }
  const nights = diffDays(ci, co);
  if (nights <= 0) { note.textContent = 'Check-out must be after check-in.'; return; }
  note.textContent = 'Checking availability…';
  try {
    const data = await apiFetch(`/api/availability?checkIn=${ci}&checkOut=${co}&guests=${guests}`);
    const avail = (data.rooms ?? []).filter(r => r.isAvailable);
    note.textContent = avail.length
      ? `✓ ${avail.length} room${avail.length !== 1 ? 's' : ''} available for ${nights} night${nights !== 1 ? 's' : ''}.`
      : 'No rooms available for those dates.';
    // Scroll to rooms
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(err) {
    note.textContent = 'Could not check availability. Try again.';
  }
});

/* ── Newsletter ── */
$('#newsletter-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const status = $('#newsletter-status');
  const email = this.email.value.trim();
  if (!email) return;
  try {
    await apiFetch('/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    status.textContent = '✓ You\'re on the list. Six letters a year, no more.';
    this.reset();
  } catch(err) {
    status.textContent = err.message;
  }
});

/* ── Footer year ── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ── Custom Luxury Cursor ── */
function initCursor() {
  const dot = $('#cursor-dot');
  const ring = $('#cursor-follower');
  if (!dot || !ring || window.matchMedia('(pointer: coarse)').matches) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  }, { passive: true });

  function renderRing() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(renderRing);
  }
  requestAnimationFrame(renderRing);

  const interactiveSelector = 'a, button, input, select, textarea, .room-card, .exp-card, .sight-card, .facility-card, .review-card, .journal-card, .hero-dot, .stepper-btn, .concierge-pill';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.remove('cursor-hover');
    }
  });
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });
}

/* ── Golden Diya Particles in Hero ── */
function initHeroParticles() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const count = 38;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * (width || window.innerWidth);
      this.y = initial ? Math.random() * (height || window.innerHeight) : (height || window.innerHeight) + 10;
      this.radius = 1 + Math.random() * 2;
      this.speedY = 0.25 + Math.random() * 0.55;
      this.speedX = (Math.random() - 0.5) * 0.35;
      this.alpha = 0.15 + Math.random() * 0.6;
      this.targetAlpha = 0.2 + Math.random() * 0.7;
      this.phase = Math.random() * Math.PI * 2;
    }
    update() {
      this.phase += 0.02;
      this.y -= this.speedY;
      this.x += Math.sin(this.phase) * 0.4 + this.speedX;
      this.alpha += (this.targetAlpha - this.alpha) * 0.04;
      if (Math.random() < 0.012) {
        this.targetAlpha = 0.1 + Math.random() * 0.8;
      }
      if (this.y < -15 || this.x < -15 || this.x > width + 15) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3.5);
      grad.addColorStop(0, `rgba(245, 230, 196, ${this.alpha})`);
      grad.addColorStop(0.4, `rgba(200, 155, 60, ${this.alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(180, 83, 42, 0)');
      ctx.fillStyle = grad;
      ctx.arc(this.x, this.y, this.radius * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* ── 3D Card Hover Tilt ── */
function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.addEventListener('mousemove', e => {
    const card = e.target.closest('.facility-card, .room-card, .exp-card, .sight-card, .review-card, .journal-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4.5;
    const rotateY = ((x - centerX) / centerX) * 4.5;

    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px)`;
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest('.facility-card, .room-card, .exp-card, .sight-card, .review-card, .journal-card');
    if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
      card.style.transform = '';
    }
  });
}

/* ── Royal Audio Ambience (Web Audio API Tanpura & Bamboo Flute Harmonics) ── */
function initRoyalAmbience() {
  const btn = $('#ambient-toggle');
  if (!btn) return;

  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let oscillators = [];

  function startAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2.0); // Gentle background volume
    masterGain.connect(audioCtx.destination);

    // Warm Lowpass Filter (like palace acoustics)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.0;
    filter.connect(masterGain);

    // Traditional Indian Tanpura chords (C# tonic: Sa 138.6Hz, Pa 207.65Hz, Sa' 277.18Hz, Ga 174.6Hz)
    const freqs = [138.59, 174.61, 207.65, 277.18];
    oscillators = freqs.map((f, i) => {
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, audioCtx.currentTime);
      osc.detune.setValueAtTime((i - 1.5) * 4, audioCtx.currentTime);

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 0.12 + (i * 0.06);
      lfoGain.gain.value = 0.012;
      lfo.connect(oscGain.gain);
      lfo.start();

      oscGain.gain.setValueAtTime(0.035 / (i + 1), audioCtx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      return { osc, lfo };
    });

    isPlaying = true;
    btn.setAttribute('aria-pressed', 'true');
    toast('Royal Haveli Ambience playing ♫', 'info', 3000);
  }

  function stopAudio() {
    if (!audioCtx || !isPlaying) return;
    masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    setTimeout(() => {
      oscillators.forEach(o => {
        try { o.osc.stop(); o.lfo.stop(); } catch(e) {}
      });
      oscillators = [];
      isPlaying = false;
      btn.setAttribute('aria-pressed', 'false');
    }, 1250);
  }

  btn.addEventListener('click', () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  });
}

/* ── The Haveli Property Gallery & Lightbox ── */
const GALLERY_ITEMS = [
  {
    id: 1,
    title: 'The Grand Cusped Colonnade',
    sub: 'Scalloped arches & open courtyard pavilion',
    category: 'courtyard',
    badge: 'Courtyard',
    featured: true,
    img: '/assets/property/courtyard-colonnade-grand.jpg',
    thumb: '/assets/property/courtyard-colonnade-grand-thumb.jpg'
  },
  {
    id: 2,
    title: 'The Royal Vaulted Suite',
    sub: 'Heritage soaring arch & canopied king bed',
    category: 'suites',
    badge: 'Royal Suite',
    featured: true,
    img: '/assets/property/suite-royal-vault-king.jpg',
    thumb: '/assets/property/suite-royal-vault-king-thumb.jpg'
  },
  {
    id: 3,
    title: 'Sunlit Haveli Facade',
    sub: 'Amber sandstone facade & arched windows',
    category: 'courtyard',
    badge: 'Architecture',
    featured: false,
    img: '/assets/property/haveli-facade-sunlit.jpg',
    thumb: '/assets/property/haveli-facade-sunlit-thumb.jpg'
  },
  {
    id: 5,
    title: 'The Haveli Dining Hall',
    sub: 'Restored dining hall with authentic stone flooring',
    category: 'lounges',
    badge: 'Dining',
    featured: false,
    img: '/assets/property/haveli-dining-hall.jpg',
    thumb: '/assets/property/haveli-dining-hall-thumb.jpg'
  },
  {
    id: 6,
    title: 'Maharani Chamber — Checkered Floor',
    sub: 'Classic black-and-white marble & warm bedside glow',
    category: 'suites',
    badge: 'Suites',
    featured: false,
    img: '/assets/property/suite-maharani-king-checkered.jpg',
    thumb: '/assets/property/suite-maharani-king-checkered-thumb.jpg'
  },
  {
    id: 7,
    title: 'Alabaster Suite — Hand-carved Fretwork',
    sub: 'Twin teak beds with ornamental jharokha headboards',
    category: 'suites',
    badge: 'Suites',
    featured: false,
    img: '/assets/property/suite-alabaster-twin-fretwork.jpg',
    thumb: '/assets/property/suite-alabaster-twin-fretwork-thumb.jpg'
  },
  {
    id: 8,
    title: 'The Royal Arched Entryway',
    sub: 'Historic passage with red ceremonial runner',
    category: 'courtyard',
    badge: 'Entrance',
    featured: false,
    img: '/assets/property/haveli-royal-entryway.jpg',
    thumb: '/assets/property/haveli-royal-entryway-thumb.jpg'
  },
  {
    id: 9,
    title: 'Homestyle Kitchenette & Table',
    sub: 'Warm family dining and culinary preparation area',
    category: 'lounges',
    badge: 'Dining',
    featured: false,
    img: '/assets/property/dining-kitchenette-lounge.jpg',
    thumb: '/assets/property/dining-kitchenette-lounge-thumb.jpg'
  },
  {
    id: 10,
    title: 'The Royal Suite — Miniature Art Lounge',
    sub: 'Seating salon with framed historical artworks',
    category: 'suites',
    badge: 'Royal Suite',
    featured: false,
    img: '/assets/property/suite-royal-vault-art-chairs.jpg',
    thumb: '/assets/property/suite-royal-vault-art-chairs-thumb.jpg'
  },
  {
    id: 11,
    title: 'Sunny Sandstone Terrace Walkway',
    sub: 'Courtyard garden promenade and open skies',
    category: 'courtyard',
    badge: 'Terrace',
    featured: false,
    img: '/assets/property/courtyard-terrace-walkway.jpg',
    thumb: '/assets/property/courtyard-terrace-walkway-thumb.jpg'
  },
  {
    id: 12,
    title: 'Morning Chai Credenza & Pantry',
    sub: 'Brass samovar and fresh heritage tea station',
    category: 'lounges',
    badge: 'Chai Lounge',
    featured: false,
    img: '/assets/property/morning-chai-credenza-pantry.jpg',
    thumb: '/assets/property/morning-chai-credenza-pantry-thumb.jpg'
  },
  {
    id: 13,
    title: 'Haveli Garden Twin Chamber',
    sub: 'Traditional block-printed textiles & twin beds',
    category: 'suites',
    badge: 'Suites',
    featured: false,
    img: '/assets/property/suite-haveli-garden-twin.jpg',
    thumb: '/assets/property/suite-haveli-garden-twin-thumb.jpg'
  },
  {
    id: 14,
    title: 'The Heirloom Master Suite',
    sub: 'Master king bed with antique heirloom furnishings',
    category: 'suites',
    badge: 'Master Suite',
    featured: false,
    img: '/assets/property/suite-heirloom-master-king.jpg',
    thumb: '/assets/property/suite-heirloom-master-king-thumb.jpg'
  },
  {
    id: 15,
    title: 'Breakfast Nook with Courtyard View',
    sub: 'Intimate morning breakfast nook with heritage art',
    category: 'lounges',
    badge: 'Dining',
    featured: false,
    img: '/assets/property/breakfast-dining-nook.jpg',
    thumb: '/assets/property/breakfast-dining-nook-thumb.jpg'
  },
  {
    id: 16,
    title: 'Central Marble Staircase Lobby',
    sub: 'Potted palms, arched doorways and marble steps',
    category: 'lounges',
    badge: 'Lobby',
    featured: false,
    img: '/assets/property/grand-staircase-marble-lobby.jpg',
    thumb: '/assets/property/grand-staircase-marble-lobby-thumb.jpg'
  },
  {
    id: 17,
    title: 'Heritage Gallery Corridor',
    sub: 'Handcrafted wooden doors and warm lantern lighting',
    category: 'lounges',
    badge: 'Corridor',
    featured: false,
    img: '/assets/property/heritage-gallery-corridor.jpg',
    thumb: '/assets/property/heritage-gallery-corridor-thumb.jpg'
  },
  {
    id: 18,
    title: 'Heritage Sandstone Arch Ensuite',
    sub: 'Ensuite washroom accessed through a traditional arch',
    category: 'details',
    badge: 'Details',
    featured: false,
    img: '/assets/property/bath-suite-arched-entry.jpg',
    thumb: '/assets/property/bath-suite-arched-entry-thumb.jpg'
  },
  {
    id: 19,
    title: 'Artisan Vanity & Backlit Mirror',
    sub: 'Contemporary comforts meeting heritage sandstone',
    category: 'details',
    badge: 'Details',
    featured: false,
    img: '/assets/property/bath-suite-vanity-mirror.jpg',
    thumb: '/assets/property/bath-suite-vanity-mirror-thumb.jpg'
  },
  {
    id: 20,
    title: 'Stone-finish Rain Shower Ensuite',
    sub: 'Spacious modern ensuite with premium fixtures',
    category: 'details',
    badge: 'Details',
    featured: false,
    img: '/assets/property/bath-suite-modern-shower.jpg',
    thumb: '/assets/property/bath-suite-modern-shower-thumb.jpg'
  },
  {
    id: 21,
    title: 'Alabaster Suite — Arched Alcoves',
    sub: 'Restored Rajasthani niches and reading lamps',
    category: 'suites',
    badge: 'Suites',
    featured: false,
    img: '/assets/property/suite-alabaster-twin-niches.jpg',
    thumb: '/assets/property/suite-alabaster-twin-niches-thumb.jpg'
  },
  {
    id: 22,
    title: 'Maharani Chamber — Wall Niches',
    sub: 'Illuminated alcoves and intricate plasterwork',
    category: 'suites',
    badge: 'Suites',
    featured: false,
    img: '/assets/property/suite-maharani-king-niches.jpg',
    thumb: '/assets/property/suite-maharani-king-niches-thumb.jpg'
  }
];

function initGallery() {
  const mosaic = $('#gallery-mosaic');
  const tabs = $$('.gallery-tab');
  const lightboxModal = $('#lightbox-modal');
  const lightboxImg = $('#lightbox-img');
  const lightboxCounter = $('#lightbox-counter');
  const lightboxTitle = $('#lightbox-title');
  const lightboxCaption = $('#lightbox-caption');
  const prevBtn = $('#lightbox-prev');
  const nextBtn = $('#lightbox-next');

  if (!mosaic) return;

  let currentCategory = 'all';
  let activeList = [...GALLERY_ITEMS];
  let currentIndex = 0;

  function renderMosaic() {
    activeList = currentCategory === 'all'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter(item => item.category === currentCategory);

    mosaic.innerHTML = activeList.map((item, idx) => `
      <article class="gallery-card ${item.featured ? 'is-featured' : ''}" data-gallery-idx="${idx}" tabindex="0" role="button" aria-label="View ${escape(item.title)}">
        <img src="${item.thumb}" alt="${escape(item.title)}" loading="lazy" decoding="async">
        <div class="gallery-card-scrim"></div>
        <span class="gallery-card-badge">${escape(item.badge)}</span>
        <div class="gallery-card-content">
          <div>
            <h3 class="gallery-card-title">${escape(item.title)}</h3>
            <p class="gallery-card-sub">${escape(item.sub)}</p>
          </div>
          <div class="gallery-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </div>
        </div>
      </article>
    `).join('');
  }

  // Filter tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      currentCategory = tab.dataset.filter || 'all';
      renderMosaic();
    });
  });

  // Lightbox updater
  function showLightboxIndex(idx) {
    if (idx < 0) idx = activeList.length - 1;
    if (idx >= activeList.length) idx = 0;
    currentIndex = idx;
    const item = activeList[currentIndex];
    if (!item) return;

    if (lightboxImg) lightboxImg.src = item.img;
    if (lightboxCounter) lightboxCounter.textContent = `${currentIndex + 1} / ${activeList.length} · ${item.badge}`;
    if (lightboxTitle) lightboxTitle.textContent = item.title;
    if (lightboxCaption) lightboxCaption.textContent = item.sub;
  }

  // Open lightbox on card click
  mosaic.addEventListener('click', e => {
    const card = e.target.closest('[data-gallery-idx]');
    if (!card) return;
    const idx = parseInt(card.dataset.galleryIdx, 10);
    showLightboxIndex(idx);
    if (lightboxModal) openModal(lightboxModal);
  });

  // Keyboard accessibility on cards
  mosaic.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-gallery-idx]');
      if (card) {
        e.preventDefault();
        const idx = parseInt(card.dataset.galleryIdx, 10);
        showLightboxIndex(idx);
        if (lightboxModal) openModal(lightboxModal);
      }
    }
  });

  // Nav arrows
  prevBtn?.addEventListener('click', () => showLightboxIndex(currentIndex - 1));
  nextBtn?.addEventListener('click', () => showLightboxIndex(currentIndex + 1));

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', e => {
    if (!lightboxModal || lightboxModal.hidden) return;
    if (e.key === 'ArrowLeft') showLightboxIndex(currentIndex - 1);
    if (e.key === 'ArrowRight') showLightboxIndex(currentIndex + 1);
  });

  renderMosaic();
}

/* ── Init ── */
(async function init() {
  initCursor();
  initHeroParticles();
  initCardTilt();
  initRoyalAmbience();
  initGallery();

  await Promise.allSettled([loadRooms(), loadExperiences(), loadSights(), loadReviews(), loadJournal()]);
  // Re-run reveal for dynamically added items
  $$('.reveal:not(.is-visible)').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.02, rootMargin: '0px 0px 80px 0px' });
    obs.observe(el);
  });
})();
