const API = (window.HELPER4U_API || 'http://localhost:5000/api').replace(/\/$/, '');
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function currentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function dashboardLinkFor(user) {
  if (!user) return 'bookings.html';
  if (user.role === 'admin') return 'admin-dashboard.html';
  if (user.role === 'helper') return 'helper-dashboard.html';
  return 'bookings.html';
}

function authArea() {
  const user = currentUser();
  if (!user || !token()) {
    return `<a class="btn btn-primary" href="login.html">Login / Register</a>`;
  }
  const initials = (user.name || 'U').trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return `<div class="dropdown profile-menu">
    <a class="profile-pill" href="${dashboardLinkFor(user)}"><span class="profile-avatar">${escapeHtml(initials)}</span><span class="profile-name">${escapeHtml(user.name || 'My Account')}</span></a>
    <div class="dropdown-menu">
      <a href="${dashboardLinkFor(user)}">My Dashboard</a>
      <a href="bookings.html">My Bookings</a>
      <a href="#" onclick="logout();return false;">Logout</a>
    </div>
  </div>`;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.href = 'index.html';
}

function nav() {
  const page = document.body.dataset.page || '';
  return `
  <header class="navbar"><a class="brand" href="index.html"><div class="logo">H4</div><div>Helper<span>4U</span><small>Maid & Nanny Service Platform</small></div></a>
  <nav class="nav"><a class="${page === 'home' ? 'active' : ''}" href="index.html">Home</a><a class="${page === 'helpers' ? 'active' : ''}" href="helpers.html">Find Helpers</a>
  <div class="dropdown"><a class="${page === 'maids' ? 'active' : ''}" href="maids.html">Maids ▾</a><div class="dropdown-menu"><a href="maids.html">All Maids</a><a href="maids.html?plan=hourly">Hourly Maids</a><a href="maids.html?plan=monthly">Monthly Maids</a></div></div>
  <a class="${page === 'babysitters' ? 'active' : ''}" href="babysitters.html">Babysitters</a><a class="${page === 'nannies' ? 'active' : ''}" href="nannies.html">Nannies</a>
  <div class="dropdown"><a href="services.html">Services ▾</a><div class="dropdown-menu"><a href="maids.html">Maid Service</a><a href="babysitters.html">Babysitter Service</a><a href="nannies.html">Nanny Service</a><a href="pricing.html">Pricing Plans</a></div></div>
  <a href="how-it-works.html">How It Works</a><a href="about.html">About Us</a><a href="contact.html">Contact Us</a></nav>
  <div><div class="auth-area">${authArea()}</div><button class="btn btn-outline mobile-btn" onclick="document.querySelector('.nav').classList.toggle('show')">☰</button></div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="footer-grid"><div><h2>Helper4U</h2><p>Trusted maid, babysitter and nanny services with verified profiles, transparent plans and simple booking.</p></div><div><h3>Services</h3><a href="maids.html">Maid Service</a><a href="babysitters.html">Babysitter</a><a href="nannies.html">Nanny</a><a href="pricing.html">Pricing</a></div><div><h3>Company</h3><a href="about.html">About Us</a><a href="how-it-works.html">How It Works</a><a href="contact.html">Contact</a><a href="login.html">Login</a></div><div><h3>For Helpers</h3><a href="register.html?role=helper">Become a Helper</a><a href="helper-dashboard.html">Helper Dashboard</a><a href="admin-dashboard.html">Admin Dashboard</a></div></div><div class="footer-bottom">© 2026 Helper4U. Academic Phase-1 project.</div></footer>`;
}

// Makes every ".dropdown" menu (Maids/Services in the nav, the profile
// menu once logged in) open on click/tap as well as on hover, so it also
// works on touch devices. The menu stays open until the user clicks
// outside it or picks a link inside it.
function initDropdowns(root) {
  const scope = root || document;
  scope.querySelectorAll('.dropdown').forEach((dropdown) => {
    const toggle = dropdown.querySelector(':scope > a');
    if (!toggle) return;
    toggle.addEventListener('click', (event) => {
      const alreadyOpen = dropdown.classList.contains('open');
      // First tap/click just reveals the menu instead of navigating away.
      if (!alreadyOpen) {
        event.preventDefault();
        $$('.dropdown.open').forEach((d) => { if (d !== dropdown) d.classList.remove('open'); });
        dropdown.classList.add('open');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown')) {
      $$('.dropdown.open').forEach((d) => d.classList.remove('open'));
    }
  });
}

function shell() {
  if ($('#navbar')) $('#navbar').innerHTML = nav();
  if ($('#footer')) $('#footer').innerHTML = footer();
  initDropdowns();
}
function token() { return localStorage.getItem('token') || ''; }
function authHeaders(json = false) { return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }

async function api(path, options = {}) {
  try {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (error) { throw error; }
}

async function getHelpers(params = '') { try { return (await api(`/helpers${params}`)).helpers || []; } catch { return []; } }

function helperCard(h) {
  return `<article class="card helper-card"><div class="helper-avatar">${escapeHtml(h.initials || h.name.slice(0, 2).toUpperCase())}</div><div class="helper-meta"><div><h3>${escapeHtml(h.name)}</h3><small>${escapeHtml(h.serviceType)} • ${escapeHtml(h.experience)}</small></div><span class="rating">★ ${h.rating || 'New'}</span></div><p class="muted">${escapeHtml(h.bio || 'Verified domestic helper for your home needs.')}</p><div class="tags">${(h.skills || []).slice(0, 4).map(x => `<span class="tag">${escapeHtml(x)}</span>`).join('')}</div><div class="card-bottom"><b>₹${h.pricing?.monthly || 0}/month</b><a class="btn btn-primary" href="helper.html?id=${h._id}">View Profile</a></div></article>`;
}

async function loadHelperList(container, params) {
  const el = $(container); if (!el) return;
  el.innerHTML = '<div class="card">Loading verified helpers…</div>';
  const helpers = await getHelpers(params);
  el.innerHTML = helpers.length ? helpers.map(helperCard).join('') : '<div class="card"><h3>No helpers found</h3><p>Try another service or city.</p></div>';
}

window.addEventListener('DOMContentLoaded', () => {
  shell();
  const search = $('#heroSearch');
  if (search) search.addEventListener('click', () => { const type = $('#heroType')?.value || ''; location.href = `helpers.html${type ? `?type=${encodeURIComponent(type)}` : ''}`; });
  const list = $('#helperList');
  if (list) { const p = document.body.dataset.type ? `?type=${encodeURIComponent(document.body.dataset.type)}` : ''; loadHelperList('#helperList', p); }
});

window.Helper4U = { API, $, api, token, authHeaders, escapeHtml, loadHelperList, currentUser, logout };
