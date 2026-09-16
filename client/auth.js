/* ============================================================
   Helper4U — auth.js
   Handles the login + register forms and talks to the MongoDB
   backend (server/src/server.js).

   Loaded AFTER app.js, which exposes window.Helper4U.
   ============================================================ */

(function () {
  'use strict';

  const API_BASE =
    (window.Helper4U && window.Helper4U.API) ||
    (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

  /* ---------------- tiny helpers ---------------- */

  const byId = (id) => document.getElementById(id);

  function showNotice(box, type, text) {
    if (!box) return;
    box.className = 'notice show ' + type;
    box.innerHTML = `<i>${type === 'ok' ? '✓' : type === 'error' ? '!' : 'i'}</i><span>${text}</span>`;
  }

  function clearNotice(box) {
    if (!box) return;
    box.className = 'notice';
    box.textContent = '';
  }

  function setFieldError(input, message) {
    const block = input.closest('.field-block');
    if (!block) return;
    block.classList.add('has-error');
    const hint = block.querySelector('.hint');
    if (hint) {
      if (hint.dataset.default === undefined) hint.dataset.default = hint.textContent;
      hint.textContent = message;
    }
    input.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(input) {
    const block = input.closest('.field-block');
    if (!block) return;
    block.classList.remove('has-error');
    const hint = block.querySelector('.hint');
    if (hint && hint.dataset.default !== undefined) hint.textContent = hint.dataset.default;
    input.removeAttribute('aria-invalid');
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.field-block.has-error input').forEach(clearFieldError);
  }

  function busy(button, isBusy, busyLabel) {
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.querySelector('.label').textContent;
      button.querySelector('.label').textContent = busyLabel || 'Please wait…';
      button.classList.add('is-busy');
      button.disabled = true;
    } else {
      if (button.dataset.label) button.querySelector('.label').textContent = button.dataset.label;
      button.classList.remove('is-busy');
      button.disabled = false;
    }
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const PHONE_RE = /^[0-9]{10}$/;

  /** Saves the session and sends the user to the right dashboard. */
  function completeSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user.role === 'admin'
      ? 'admin-dashboard.html'
      : data.user.role === 'helper'
        ? 'helper-dashboard.html'
        : 'bookings.html';
  }

  /** POST JSON and always return a usable { ok, status, body }. */
  async function post(path, payload) {
    let response;
    try {
      response = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(
        'Could not connect to the server. Check whether <b>npm run server</b> is running in the terminal.'
      );
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Request failed. Please try again.');
    return body;
  }

  /* ============================================================
     LOGIN
     ============================================================ */

  function initLogin(form) {
    const notice = byId('formNotice');
    const submit = byId('loginSubmit');
    const email = byId('loginEmail');
    const password = byId('loginPassword');

    [email, password].forEach((el) =>
      el.addEventListener('input', () => {
        clearFieldError(el);
        clearNotice(notice);
      })
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAllErrors(form);
      clearNotice(notice);

      let valid = true;
      if (!EMAIL_RE.test(email.value.trim())) {
        setFieldError(email, 'Enter a valid email address.');
        valid = false;
      }
      if (!password.value) {
        setFieldError(password, 'Enter your password.');
        valid = false;
      }
      if (!valid) {
        (form.querySelector('[aria-invalid]') || email).focus();
        return;
      }

      busy(submit, true, 'Signing in…');
      try {
        const data = await post('/auth/login', {
          email: email.value.trim().toLowerCase(),
          password: password.value
        });
        const next = completeSession(data);
        showNotice(notice, 'ok', `Welcome back, ${data.user.name}. Opening your dashboard…`);
        setTimeout(() => { location.href = next; }, 650);
      } catch (err) {
        busy(submit, false);
        showNotice(notice, 'error', err.message);
        password.value = '';
        password.focus();
      }
    });

    // "Use demo admin" shortcut
    const demo = byId('useDemo');
    if (demo) {
      demo.addEventListener('click', () => {
        email.value = 'admin@helper4u.com';
        password.value = 'Admin@123';
        clearAllErrors(form);
        showNotice(notice, 'info', 'Demo admin credentials filled in. Now press Sign in.');
      });
    }
  }

  /* ============================================================
     REGISTER (2 steps)
     ============================================================ */

  function scorePassword(value) {
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }

  function initRegister(form) {
    const notice = byId('formNotice');
    const stepLine = byId('stepLine');
    const stepNodes = Array.from(document.querySelectorAll('.step'));
    const panels = Array.from(form.querySelectorAll('.panel'));

    const fullName = byId('regName');
    const city = byId('regCity');
    const phone = byId('regPhone');
    const email = byId('regEmail');
    const password = byId('regPassword');
    const confirm = byId('regConfirm');
    const terms = byId('regTerms');
    const meter = byId('strength');
    const submit = byId('registerSubmit');

    let step = 0;

    function render(direction) {
      panels.forEach((panel, index) => {
        panel.classList.toggle('is-current', index === step);
        panel.classList.toggle('is-back', index === step && direction === 'back');
      });
      stepNodes.forEach((node, index) => {
        node.classList.toggle('is-active', index === step);
        node.classList.toggle('is-done', index < step);
      });
      stepLine.style.width = step === 0 ? '0%' : '100%';
      const heading = panels[step].querySelector('h2');
      if (heading) heading.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // live validation feedback
    [fullName, city, phone, email, password, confirm].forEach((el) =>
      el.addEventListener('input', () => {
        clearFieldError(el);
        clearNotice(notice);
      })
    );

    password.addEventListener('input', () => {
      meter.dataset.score = password.value ? String(scorePassword(password.value)) : '0';
    });

    function validateStepOne() {
      let valid = true;
      if (fullName.value.trim().length < 3) {
        setFieldError(fullName, 'Full name should be at least 3 characters.');
        valid = false;
      }
      if (!city.value.trim()) {
        setFieldError(city, 'Enter your city.');
        valid = false;
      }
      if (phone.value.trim() && !PHONE_RE.test(phone.value.trim())) {
        setFieldError(phone, 'Enter a 10 digit mobile number.');
        valid = false;
      }
      return valid;
    }

    function validateStepTwo() {
      let valid = true;
      if (!EMAIL_RE.test(email.value.trim())) {
        setFieldError(email, 'Enter a valid email address.');
        valid = false;
      }
      if (password.value.length < 6) {
        setFieldError(password, 'Password should be at least 6 characters.');
        valid = false;
      }
      if (confirm.value !== password.value) {
        setFieldError(confirm, 'Both passwords do not match.');
        valid = false;
      }
      if (!terms.checked) {
        showNotice(notice, 'error', 'You need to accept the terms to continue.');
        valid = false;
      }
      return valid;
    }

    byId('toStepTwo').addEventListener('click', () => {
      clearAllErrors(form);
      clearNotice(notice);
      if (!validateStepOne()) {
        (form.querySelector('[aria-invalid]') || fullName).focus();
        return;
      }
      step = 1;
      render('forward');
    });

    byId('backToStepOne').addEventListener('click', () => {
      step = 0;
      render('back');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAllErrors(form);
      clearNotice(notice);
      if (!validateStepTwo()) {
        const firstBad = form.querySelector('[aria-invalid]');
        if (firstBad) firstBad.focus();
        return;
      }

      const selectedRole = form.querySelector('input[name="role"]:checked');

      const payload = {
        name: fullName.value.trim(),
        city: city.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim().toLowerCase(),
        password: password.value,
        role: selectedRole ? selectedRole.value : 'household'
      };

      busy(submit, true, 'Creating account…');
      try {
        const data = await post('/auth/register', payload);
        const next = completeSession(data);
        showNotice(
          notice,
          'ok',
          `Account created, ${data.user.name}. Your data has been saved to MongoDB.`
        );
        setTimeout(() => { location.href = next; }, 900);
      } catch (err) {
        busy(submit, false);
        showNotice(notice, 'error', err.message);
        if (/already registered/i.test(err.message)) setFieldError(email, 'This email is already registered.');
      }
    });

    // keep the role cards highlighted even on browsers without :has() support
    const roleInputs = Array.from(form.querySelectorAll('input[name="role"]'));
    const paintRoles = () =>
      roleInputs.forEach((input) => input.closest('.role-card').classList.toggle('is-picked', input.checked));
    roleInputs.forEach((input) => input.addEventListener('change', paintRoles));

    // pre-select role from ?role=helper
    const wanted = new URLSearchParams(location.search).get('role');
    if (wanted) {
      const radio = form.querySelector(`input[name="role"][value="${wanted}"]`);
      if (radio) radio.checked = true;
    }
    paintRoles();

    render('forward');
  }

  /* ============================================================
     password visibility toggles (both pages)
     ============================================================ */

  function initPeekButtons() {
    document.querySelectorAll('.peek').forEach((button) => {
      button.addEventListener('click', () => {
        const input = byId(button.dataset.target);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.textContent = showing ? 'Show' : 'Hide';
        button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        input.focus();
      });
    });
  }

  /* ---------------- boot ---------------- */

  window.addEventListener('DOMContentLoaded', () => {
    initPeekButtons();

    // Already logged in? Don't show the forms again.
    const existing = localStorage.getItem('token');
    if (existing) {
      const notice = byId('formNotice');
      let user = null;
      try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch { user = null; }
      if (user) {
        showNotice(
          notice,
          'info',
          `You're already logged in as <b>${user.name}</b>. <a href="#" id="signOutNow">Sign out</a> to switch to a different account.`
        );
        const link = byId('signOutNow');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            location.reload();
          });
        }
      }
    }

    const loginForm = byId('loginForm');
    if (loginForm) initLogin(loginForm);

    const registerForm = byId('registerForm');
    if (registerForm) initRegister(registerForm);
  });
})();
