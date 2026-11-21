/**
 * Ancestral Abode — Admin Portal Client Script
 */

const TOKEN_KEY = 'ancestral_admin_token';
const USER_KEY = 'ancestral_admin_user';

let currentToken = localStorage.getItem(TOKEN_KEY);
let activePaymentBooking = null;

// Helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function fmtINR(val) {
  return Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const container = $('#admin-toasts');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(endpoint, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && currentToken) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
  }

  return data;
}

/* ─────────────────────────────────────────────────────────────
 * Authentication Flow
 * ───────────────────────────────────────────────────────────── */
async function checkAuth() {
  if (!currentToken) {
    showLogin();
    return;
  }

  try {
    const data = await api('/api/admin/auth/me');
    showPortal(data.data.user);
    loadDashboard();
  } catch {
    logout();
  }
}

function showLogin() {
  $('#login-screen').hidden = false;
  $('#portal-screen').hidden = true;
}

function showPortal(user) {
  $('#login-screen').hidden = true;
  $('#portal-screen').hidden = false;
  $('#current-user-name').textContent = user?.username || 'admin';
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  currentToken = null;
  showLogin();
  showToast('Logged out successfully.', 'success');
}

// Login form submission
$('#login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = $('#login-alert');
  const btn = $('#login-btn');
  const username = $('#username').value.trim();
  const password = $('#password').value;

  alertBox.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Authenticating...';

  try {
    const res = await api('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    currentToken = res.data.token;
    localStorage.setItem(TOKEN_KEY, currentToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));

    showPortal(res.data.user);
    showToast(`Welcome back, ${res.data.user.username}!`, 'success');
    loadDashboard();
  } catch (err) {
    alertBox.textContent = err.message || 'Authentication failed. Please verify your username and password.';
    alertBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Authenticate & Enter Portal';
  }
});

// Password visibility toggle
$('#toggle-pwd')?.addEventListener('click', () => {
  const pwd = $('#password');
  if (pwd.type === 'password') {
    pwd.type = 'text';
    $('#toggle-pwd').textContent = '🔒';
  } else {
    pwd.type = 'password';
    $('#toggle-pwd').textContent = '👁️';
  }
});

$('#logout-btn')?.addEventListener('click', logout);

/* ─────────────────────────────────────────────────────────────
 * Tab Navigation
 * ───────────────────────────────────────────────────────────── */
$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach((b) => b.classList.remove('is-active'));
    $$('.tab-pane').forEach((p) => {
      p.classList.remove('is-active');
      p.hidden = true;
    });

    btn.classList.add('is-active');
    const targetPane = $(`#pane-${btn.dataset.tab}`);
    if (targetPane) {
      targetPane.hidden = false;
      targetPane.classList.add('is-active');
    }
  });
});

/* ─────────────────────────────────────────────────────────────
 * Load Dashboard & KPI Metrics
 * ───────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const res = await api('/api/admin/dashboard');
    const { stats, rooms, recentEmails } = res.data;

    // Update KPI counters
    $('#stat-revenue').textContent = fmtINR(stats.totalRevenue);
    $('#stat-bookings').textContent = stats.totalBookings;
    $('#stat-pending').textContent = stats.pendingBookings;
    $('#stat-enquiries').textContent = stats.pendingEnquiries;

    // Render rooms
    renderRooms(rooms);

    // Render email logs
    renderEmails(recentEmails);

    // Load bookings & enquiries
    loadBookings();
    loadEnquiries();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────────────────────────────────────────
 * 1. Room Dynamic Price Management
 * ───────────────────────────────────────────────────────────── */
function renderRooms(rooms) {
  const grid = $('#admin-rooms-grid');
  if (!grid) return;

  grid.innerHTML = rooms.map((room) => `
    <article class="room-price-card" data-room-id="${room.id}">
      <img src="${escapeHtml(room.image_url || room.imageUrl || '')}" alt="${escapeHtml(room.name)}" class="room-price-thumb">
      <div class="room-price-body">
        <h3 class="room-price-title">${escapeHtml(room.name)}</h3>
        <div class="room-price-meta">
          <span>👥 Capacity: ${room.capacity} Guests</span>
          <span>🗝️ Total Inventory: ${room.total_inventory} Suite(s)</span>
        </div>
        <div class="price-input-row">
          <div class="price-input-wrap">
            <span class="price-input-prefix">₹</span>
            <input type="number" class="form-input room-price-input" id="price-input-${room.id}" value="${Number(room.base_price || room.basePrice)}" min="0" step="100">
          </div>
          <button type="button" class="btn btn-gold btn-sm save-price-btn" data-room-id="${room.id}">
            <span>Update Price</span>
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // Attach event listeners for price update
  $$('.save-price-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const roomId = btn.dataset.roomId;
      const input = $(`#price-input-${roomId}`);
      const newPrice = Number(input.value);

      if (!newPrice || newPrice < 0) {
        showToast('Please enter a valid positive room rate.', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await api(`/api/admin/rooms/${roomId}/price`, {
          method: 'PATCH',
          body: JSON.stringify({ basePrice: newPrice }),
        });
        showToast(res.message || 'Room price updated successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Price';
      }
    });
  });
}

$('#refresh-rooms-btn')?.addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/rooms');
    renderRooms(res.data.rooms);
    showToast('Room inventory refreshed.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ─────────────────────────────────────────────────────────────
 * 2. Bookings Management
 * ───────────────────────────────────────────────────────────── */
async function loadBookings() {
  const tbody = $('#bookings-table-body');
  const statusFilter = $('#filter-booking-status')?.value || '';
  const search = $('#search-bookings')?.value.trim() || '';

  try {
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (search) query.set('search', search);

    const res = await api(`/api/admin/bookings?${query.toString()}`);
    const bookings = res.data.bookings || [];

    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No reservations found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map((b) => `
      <tr>
        <td><strong><code>${escapeHtml(b.reference)}</code></strong></td>
        <td>${escapeHtml(b.roomName || 'Heritage Suite')}</td>
        <td>
          <div style="font-weight:600;">${escapeHtml(b.guestName)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);"><a href="tel:${b.guestPhone}" style="color:var(--text-muted);">${escapeHtml(b.guestPhone)}</a> &bull; <a href="mailto:${b.guestEmail}" style="color:var(--text-muted);">${escapeHtml(b.guestEmail)}</a></div>
        </td>
        <td>
          <div>${b.checkIn} &rarr; ${b.checkOut}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${b.totalNights} Night(s) &bull; ${b.guests} Guest(s)</div>
        </td>
        <td><strong>${fmtINR(b.totalAmount)}</strong></td>
        <td><span class="badge-status badge-${b.status}">${b.status}</span></td>
        <td>
          <div class="table-actions">
            ${b.status !== 'confirmed' ? `
              <button type="button" class="btn btn-success btn-sm confirm-booking-btn" data-ref="${b.reference}" data-id="${b.id}" title="Confirm reservation and send confirmation email">
                <span>Confirm</span>
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline btn-sm send-payment-btn" data-booking='${JSON.stringify(b).replace(/'/g, "&apos;")}' title="Send payment details &amp; UPI template to guest">
              <span>Send Payment Link</span>
            </button>
            ${b.status !== 'cancelled' ? `
              <button type="button" class="btn btn-outline-danger btn-sm cancel-booking-btn" data-ref="${b.reference}" data-id="${b.id}" title="Cancel reservation">
                <span>Cancel</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');

    attachBookingActions();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--c-danger);">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function attachBookingActions() {
  // Confirm Booking Action
  $$('.confirm-booking-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Confirm this reservation? A confirmation email with arrival details will be automatically dispatched to the guest.')) {
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Confirming...';
      try {
        const res = await api(`/api/admin/bookings/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'confirmed', sendEmailNotification: true }),
        });
        showToast(res.message || 'Booking confirmed and confirmation email sent!', 'success');
        loadBookings();
        loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Confirm';
      }
    });
  });

  // Cancel Booking Action
  $$('.cancel-booking-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Are you sure you want to cancel this reservation?')) return;
      btn.disabled = true;
      try {
        await api(`/api/admin/bookings/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        });
        showToast('Reservation status updated to cancelled.', 'success');
        loadBookings();
        loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });

  // Open Payment Link Modal
  $$('.send-payment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const booking = JSON.parse(btn.dataset.booking);
      activePaymentBooking = booking;

      $('#payment-modal-booking-info').innerHTML = `
        <strong>Reference: ${escapeHtml(booking.reference)}</strong> &bull; Guest: ${escapeHtml(booking.guestName)} (${escapeHtml(booking.guestEmail)})<br>
        Suite: ${escapeHtml(booking.roomName || 'Heritage Suite')} &bull; Amount: <strong>${fmtINR(booking.totalAmount)}</strong>
      `;

      $('#payment-modal').hidden = false;
    });
  });
}

// Payment Link Modal handlers
$('#close-payment-modal')?.addEventListener('click', () => { $('#payment-modal').hidden = true; });
$('#cancel-payment-modal')?.addEventListener('click', () => { $('#payment-modal').hidden = true; });

$('#confirm-send-payment-btn')?.addEventListener('click', async () => {
  if (!activePaymentBooking) return;
  const btn = $('#confirm-send-payment-btn');
  const paymentLink = $('#payment-link-input').value.trim();
  const customNotes = $('#payment-notes-input').value.trim();

  btn.disabled = true;
  btn.textContent = 'Dispatching...';

  try {
    const res = await api(`/api/admin/bookings/${activePaymentBooking.reference}/send-payment-link`, {
      method: 'POST',
      body: JSON.stringify({ paymentLink, customNotes }),
    });

    showToast(res.message || 'Payment instructions dispatched to guest!', 'success');
    $('#payment-modal').hidden = true;
    $('#payment-link-input').value = '';
    $('#payment-notes-input').value = '';
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Dispatch Payment Email';
  }
});

$('#filter-booking-status')?.addEventListener('change', loadBookings);
$('#search-bookings')?.addEventListener('input', () => {
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(loadBookings, 300);
});
$('#refresh-bookings-btn')?.addEventListener('click', loadBookings);

/* ─────────────────────────────────────────────────────────────
 * 3. Enquiries & Concierge Requests
 * ───────────────────────────────────────────────────────────── */
async function loadEnquiries() {
  const tbody = $('#enquiries-table-body');
  try {
    const res = await api('/api/admin/enquiries');
    const enquiries = res.data.enquiries || [];

    if (!enquiries.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No guest queries recorded.</td></tr>';
      return;
    }

    tbody.innerHTML = enquiries.map((item) => `
      <tr>
        <td><span class="badge-status badge-new">${item.type === 'concierge' ? 'Concierge' : 'Website'}</span></td>
        <td><strong>${escapeHtml(item.name || 'Guest')}</strong></td>
        <td>
          <div>${item.email ? `<a href="mailto:${item.email}" style="color:var(--c-gold);">${escapeHtml(item.email)}</a>` : '—'}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${item.phone ? `<a href="tel:${item.phone}" style="color:var(--text-muted);">${escapeHtml(item.phone)}</a>` : '—'}</div>
        </td>
        <td>${escapeHtml(item.subject || 'General Request')}</td>
        <td style="max-width:300px;font-size:0.82rem;color:var(--text-muted);">${escapeHtml(item.message || '—')}</td>
        <td style="font-size:0.78rem;">${new Date(item.created_at).toLocaleDateString()}</td>
        <td><span class="badge-status badge-${item.status || 'new'}">${item.status || 'new'}</span></td>
        <td>
          <div class="table-actions">
            ${item.email ? `
              <button type="button" class="btn btn-outline btn-sm reply-enquiry-btn" data-id="${item.id}" data-email="${escapeHtml(item.email)}" data-subject="${escapeHtml(item.subject || '')}">
                <span>Reply Email</span>
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline btn-sm resolve-enquiry-btn" data-id="${item.id}" data-type="${item.type}">
              <span>✓ Handled</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    attachEnquiryActions();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty" style="color:var(--c-danger);">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function attachEnquiryActions() {
  $$('.resolve-enquiry-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const type = btn.dataset.type;
      try {
        await api(`/api/admin/enquiries/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'responded', type }),
        });
        showToast('Enquiry marked as handled.', 'success');
        loadEnquiries();
        loadDashboard();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  $$('.reply-enquiry-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.email;
      const subject = btn.dataset.subject;
      const enquiryId = btn.dataset.id;

      $('#reply-to').value = email;
      $('#reply-subject').value = `Re: ${subject || 'Your Inquiry with Ancestral Abode'}`;
      $('#reply-modal').dataset.enquiryId = enquiryId;
      $('#reply-modal').hidden = false;
    });
  });
}

// Reply Modal handlers
$('#close-reply-modal')?.addEventListener('click', () => { $('#reply-modal').hidden = true; });
$('#cancel-reply-modal')?.addEventListener('click', () => { $('#reply-modal').hidden = true; });

$('#confirm-send-reply-btn')?.addEventListener('click', async () => {
  const btn = $('#confirm-send-reply-btn');
  const to = $('#reply-to').value;
  const subject = $('#reply-subject').value;
  const message = $('#reply-message').value.trim();
  const enquiryId = $('#reply-modal').dataset.enquiryId;

  if (!message) {
    showToast('Please type a message before sending.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await api('/api/admin/enquiries/reply', {
      method: 'POST',
      body: JSON.stringify({ to, subject, message, enquiryId }),
    });
    showToast(res.message || 'Reply email dispatched!', 'success');
    $('#reply-modal').hidden = true;
    $('#reply-message').value = '';
    loadEnquiries();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Email Reply';
  }
});

$('#refresh-enquiries-btn')?.addEventListener('click', loadEnquiries);

/* ─────────────────────────────────────────────────────────────
 * 4. Emails History
 * ───────────────────────────────────────────────────────────── */
function renderEmails(emails = []) {
  const tbody = $('#emails-table-body');
  if (!tbody) return;

  if (!emails.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No emails dispatched in recent session.</td></tr>';
    return;
  }

  tbody.innerHTML = emails.map((m) => `
    <tr>
      <td><strong>${escapeHtml(m.to)}</strong></td>
      <td>${escapeHtml(m.subject)}</td>
      <td style="max-width:320px;font-size:0.78rem;color:var(--text-muted);">${escapeHtml(m.preview)}...</td>
      <td style="font-size:0.78rem;">${new Date(m.sentAt).toLocaleTimeString()}</td>
      <td><span class="badge-status badge-${m.status === 'failed' ? 'cancelled' : 'confirmed'}">${m.status}</span></td>
    </tr>
  `).join('');
}

$('#refresh-emails-btn')?.addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/dashboard');
    renderEmails(res.data.recentEmails);
    showToast('Email logs refreshed.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Boot check
checkAuth();
