/**
 * ============================================================
 *  CYBERLABX — APP.JS
 *  Frontend Logic · Ready for Node.js backend integration
 *
 *  BACKEND INTEGRATION POINTS marked with:
 *  // TODO: BACKEND — replace with API call to /api/...
 * ============================================================
 */

/* ============================================================
   CONFIG — Update these when you add your backend
   ============================================================ */
const CONFIG = {
  API_BASE: '/api',          // Your Node.js Express base URL
  WS_URL:   'ws://localhost:3000', // WebSocket for live feeds
  TOKEN_KEY: 'clx_token',   // localStorage key for JWT
  USER_KEY:  'clx_user',    // localStorage key for user data
};


/* ============================================================
   AUTH UTILITIES
   ============================================================ */

/**
 * Save auth token (JWT from backend)
 * @param {string} token
 */
function saveToken(token) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
}

/**
 * Get stored auth token
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

/**
 * Remove token and user data on logout
 */
function clearAuth() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
}

/**
 * Build Authorization header for API calls
 * @returns {Object}
 */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

/**
 * Check if user is logged in on page load
 * and skip login if token is valid
 */
function checkAuth() {
  const token = getToken();
  if (token) {
    // TODO: BACKEND — validate token with GET /api/auth/verify
    // fetch(`${CONFIG.API_BASE}/auth/verify`, { headers: authHeaders() })
    //   .then(r => r.json())
    //   .then(data => { if (data.valid) showPage('dashboard'); else clearAuth(); });

    // For now: if token exists, go straight to dashboard
    showPage('dashboard');
  }
}


/* ============================================================
   PAGE NAVIGATION
   ============================================================ */

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
}

const pageNames = {
  overview: 'OVERVIEW', tools: 'TOOLS', burpsuite: 'BURP SUITE',
  wireshark: 'WIRESHARK', nmap: 'NMAP', metasploit: 'METASPLOIT',
  reports: 'REPORTS', sessions: 'SESSIONS', settings: 'SETTINGS',
};

function navigate(page, el) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    const match = document.querySelector(`[data-page="${page}"]`);
    if (match) match.classList.add('active');
  }

  // Update breadcrumb
  document.getElementById('bc-current').textContent = pageNames[page] || page.toUpperCase();

  // Show correct section
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(`section-${page}`);
  if (section) section.classList.add('active');

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}


/* ============================================================
   AUTH FORMS
   ============================================================ */

// Tab switching (Login / Register)
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => {
      if (f.dataset.tabContent === target) f.classList.remove('hidden');
      else f.classList.add('hidden');
    });
  });
});

// Login form submit
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  errEl.textContent = '';
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');

  try {
    // TODO: BACKEND — replace with real API call
    // const res  = await fetch(`${CONFIG.API_BASE}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password })
    // });
    // const data = await res.json();
    // if (!res.ok) throw new Error(data.message || 'Login failed');
    // saveToken(data.token);
    // localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));

    // Demo: simulate login
    await sleep(1200);
    if (!email || !password) throw new Error('ENTER CREDENTIALS');
    saveToken('demo_jwt_token_replace_with_real');
    showPage('dashboard');
    initDashboard();
    toast('ACCESS GRANTED — WELCOME OPERATOR', 'success');
  } catch (err) {
    errEl.textContent = `ERROR: ${err.message}`;
    shake(btn);
  } finally {
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }
});

// Register form submit
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';

  try {
    // TODO: BACKEND — replace with real API call
    // const res  = await fetch(`${CONFIG.API_BASE}/auth/register`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ firstName, lastName, email, username, password })
    // });
    // const data = await res.json();
    // if (!res.ok) throw new Error(data.message || 'Registration failed');

    await sleep(800);
    toast('ACCOUNT CREATED — PLEASE LOGIN', 'success');

    // Switch to login tab
    document.querySelector('[data-tab="login"]').click();
  } catch (err) {
    errEl.textContent = `ERROR: ${err.message}`;
  }
});

// Password strength meter
const regPass = document.getElementById('reg-password');
if (regPass) {
  regPass.addEventListener('input', () => {
    const val = regPass.value;
    const strength = calcStrength(val);
    const fill  = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    const colors = ['#ff3b57', '#ff6b35', '#ffb547', '#00bfff', '#00ff88'];
    const labels = ['STRENGTH: WEAK', 'STRENGTH: FAIR', 'STRENGTH: OK', 'STRENGTH: GOOD', 'STRENGTH: STRONG'];
    fill.style.width   = `${(strength + 1) * 20}%`;
    fill.style.background = colors[strength];
    label.textContent  = labels[strength];
  });
}

function calcStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd))   score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

// OAuth
function oauthLogin(provider) {
  // TODO: BACKEND — redirect to /api/auth/oauth/google or /github
  // window.location.href = `${CONFIG.API_BASE}/auth/oauth/${provider}`;
  toast(`OAUTH: ${provider.toUpperCase()} — connect backend to enable`, 'info');
}

// Toggle password visibility
function togglePass(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'HIDE';
  } else {
    input.type = 'password';
    btn.textContent = 'SHOW';
  }
}

// Logout
function logout() {
  clearAuth();
  showPage('login');
  toast('SESSION TERMINATED', 'info');
}


/* ============================================================
   DASHBOARD INIT
   ============================================================ */

function initDashboard() {
  animateCounters();
  startActivityFeed();
  initTerminal();
  initMsfConsole();
}

// Animate stat counter numbers
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const step = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

// Live activity feed simulation
function startActivityFeed() {
  const fakeEvents = [
    { sev: 'crit', msg: 'New SQLi vector detected at /api/search', ip: '192.168.1.104', tool: 'Burp Suite' },
    { sev: 'warn', msg: 'Port scan detected from external host', ip: '45.33.32.156', tool: 'Nmap' },
    { sev: 'info', msg: 'TLS handshake anomaly detected', ip: '10.0.0.23', tool: 'Wireshark' },
    { sev: 'crit', msg: 'Privilege escalation attempt detected', ip: '192.168.1.100', tool: 'Metasploit' },
    { sev: 'warn', msg: 'Suspicious DNS query to blacklisted domain', ip: '10.0.0.45', tool: 'Wireshark' },
  ];

  // TODO: BACKEND — replace simulation with WebSocket
  // const ws = new WebSocket(`${CONFIG.WS_URL}/events`);
  // ws.onmessage = (event) => {
  //   const data = JSON.parse(event.data);
  //   prependActivity(data);
  // };

  setInterval(() => {
    const evt  = fakeEvents[Math.floor(Math.random() * fakeEvents.length)];
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const now  = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const labels = { crit: 'CRITICAL', warn: 'WARNING', info: 'INFO' };

    const div = document.createElement('div');
    div.className = `activity-item ${evt.sev === 'crit' ? 'critical' : evt.sev === 'warn' ? 'warning' : 'info'}`;
    div.innerHTML = `
      <span class="act-time">${time}</span>
      <span class="act-severity ${evt.sev}">${labels[evt.sev]}</span>
      <span class="act-msg">${evt.msg} — ${evt.tool}</span>
      <span class="act-ip">${evt.ip}</span>
    `;

    feed.insertBefore(div, feed.firstChild);
    if (feed.children.length > 20) feed.removeChild(feed.lastChild);
  }, 5000);
}


/* ============================================================
   MINI TERMINAL
   ============================================================ */

function initTerminal() {
  const input  = document.getElementById('term-input');
  const output = document.getElementById('term-output');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';

    // TODO: BACKEND — send commands to /api/terminal/exec
    // fetch(`${CONFIG.API_BASE}/terminal/exec`, {
    //   method: 'POST', headers: authHeaders(),
    //   body: JSON.stringify({ command: cmd })
    // }).then(r => r.json()).then(data => appendTerm(data.output));

    appendTerm(`root@cyberlabx:~# ${cmd}`, 'line');
    const response = getTermResponse(cmd);
    response.forEach(line => appendTerm(line, 'result'));
  });
}

function appendTerm(text, type = 'line') {
  const output = document.getElementById('term-output');
  const div    = document.createElement('div');
  div.className = `term-line ${type === 'result' ? 'result' : ''}`;
  div.innerHTML = type === 'result'
    ? text
    : `<span class="term-prompt">root@cyberlabx:~#</span> ${escHtml(text.replace('root@cyberlabx:~# ', ''))}`;
  const cursor = output.querySelector('.term-cursor');
  if (cursor) cursor.parentElement.remove();
  output.appendChild(div);
  const newPrompt = document.createElement('div');
  newPrompt.className = 'term-line';
  newPrompt.innerHTML = `<span class="term-prompt">root@cyberlabx:~#</span> <span class="term-cursor">█</span>`;
  output.appendChild(newPrompt);
  output.scrollTop = output.scrollHeight;
}

function getTermResponse(cmd) {
  const c = cmd.toLowerCase();
  if (c === 'help') return ['Available: status, tools, sessions, clear, whoami, date'];
  if (c === 'whoami') return ['gh0st_op3r :: RED TEAM ANALYST :: cyberlabx'];
  if (c === 'status') return ['◈ Burp Suite   — RUNNING (port 8080)', '◈ Wireshark    — RUNNING (eth0)', '◈ Nmap         — IDLE', '◈ Metasploit   — RUNNING'];
  if (c === 'tools')  return ['Loaded: BurpSuite, Wireshark, Nmap, Metasploit'];
  if (c === 'sessions') return ['Active sessions: 7 | Suspicious: 1'];
  if (c === 'date')   return [new Date().toString()];
  if (c === 'clear')  { document.getElementById('term-output').innerHTML = ''; return []; }
  return [`bash: ${cmd}: command not found. Type 'help' for commands.`];
}


/* ============================================================
   MSF CONSOLE
   ============================================================ */

function initMsfConsole() {
  const input  = document.getElementById('msf-input');
  const output = document.getElementById('msf-output');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';

    // TODO: BACKEND — pipe to Metasploit RPC via /api/tools/metasploit/exec
    const div = document.createElement('div');
    div.innerHTML = `<span class="msf-prompt">msf6 &gt;</span> ${escHtml(cmd)}`;
    output.appendChild(div);

    const res = document.createElement('div');
    res.className = 'msf-result';
    res.textContent = getMsfResponse(cmd);
    output.appendChild(res);
    output.scrollTop = output.scrollHeight;
  });
}

function getMsfResponse(cmd) {
  const c = cmd.toLowerCase().trim();
  if (c === 'help')   return '[*] Core Commands: use, set, run, sessions, search, exit';
  if (c === 'sessions') return '[*] Active sessions: 1\n   Id  Type       Connection\n   1   meterpreter 192.168.1.104 → 192.168.1.100';
  if (c.startsWith('search')) return '[*] Searching modules... 5 results found';
  if (c.startsWith('use')) return `[*] Using module: ${cmd.replace(/^use\s*/i, '')}`;
  if (c.startsWith('set')) return `${cmd.replace(/^set\s+/i,'').split(' ').shift()} => ${cmd.split(' ').pop()}`;
  if (c === 'run' || c === 'exploit') return '[*] Running exploit...\n[+] Session opened!';
  if (c === 'exit') { logout(); return ''; }
  return `[-] Unknown command: ${cmd}. Type 'help' for commands.`;
}

function openMsfConsole() {
  navigate('metasploit', null);
}


/* ============================================================
   BURP SUITE CONTROLS
   ============================================================ */

let proxyOn = true;

function toggleProxy() {
  proxyOn = !proxyOn;
  const btn = document.getElementById('burp-proxy-toggle');
  btn.textContent = proxyOn ? 'PROXY: ON' : 'PROXY: OFF';
  btn.style.color = proxyOn ? 'var(--accent)' : 'var(--red)';

  // TODO: BACKEND — POST /api/tools/burpsuite/proxy { enabled: proxyOn }
  toast(`PROXY ${proxyOn ? 'ENABLED' : 'DISABLED'}`, proxyOn ? 'success' : 'info');
}

function burpForward() {
  // TODO: BACKEND — POST /api/tools/burpsuite/forward { request: ... }
  toast('REQUEST FORWARDED', 'success');
}

function burpDrop() {
  // TODO: BACKEND — POST /api/tools/burpsuite/drop
  toast('REQUEST DROPPED', 'info');
}

function startBurpScan() {
  const url = document.getElementById('burp-scan-url')?.value;
  // TODO: BACKEND — POST /api/tools/burpsuite/scan { target: url, type: ... }
  toast(`SCAN STARTED: ${url}`, 'success');
}

function sendRepeater() {
  const resp = document.getElementById('repeater-response');
  resp.innerHTML = `<span style="color:var(--accent)">HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"intercepted"}</span>`;
  // TODO: BACKEND — POST /api/tools/burpsuite/repeater { request: ... }
  toast('REPEATER REQUEST SENT', 'success');
}


/* ============================================================
   WIRESHARK CONTROLS
   ============================================================ */

let capturing = true;
let wirePacketTimer = null;

function toggleCapture() {
  capturing = !capturing;
  const btn = document.getElementById('wire-capture-btn');
  btn.textContent = capturing ? '⏹ STOP CAPTURE' : '▶ START CAPTURE';

  // TODO: BACKEND — POST /api/tools/wireshark/capture { action: capturing ? 'start' : 'stop' }
  toast(`CAPTURE ${capturing ? 'STARTED' : 'STOPPED'}`, capturing ? 'success' : 'info');

  if (capturing) simulatePackets();
  else clearInterval(wirePacketTimer);
}

function applyWireFilter() {
  const f = document.getElementById('wire-filter')?.value;
  // TODO: BACKEND — POST /api/tools/wireshark/filter { filter: f }
  toast(`FILTER APPLIED: ${f}`, 'success');
}

function clearWireFilter() {
  document.getElementById('wire-filter').value = '';
  // TODO: BACKEND — POST /api/tools/wireshark/filter { filter: '' }
  toast('FILTER CLEARED', 'info');
}

function applyPresetFilter(filter) {
  document.getElementById('wire-filter').value = filter;
  applyWireFilter();
}

function simulatePackets() {
  const protos = ['HTTP', 'TCP', 'DNS', 'TLS', 'ARP', 'ICMP'];
  const rows   = [
    ['192.168.1.104', '8.8.8.8', 'DNS', '83', 'Standard query'],
    ['10.0.0.23', '192.168.1.1', 'TCP', '74', 'SYN Segment'],
    ['192.168.1.100', '93.184.216.34', 'HTTP', '512', 'GET / HTTP/1.1'],
    ['10.0.0.1', '10.0.0.45', 'ICMP', '98', 'Echo request'],
  ];

  let counter = 4219;
  wirePacketTimer = setInterval(() => {
    const row  = rows[Math.floor(Math.random() * rows.length)];
    const list = document.getElementById('packet-list');
    if (!list) return;

    const tr = document.createElement('tr');
    tr.className = 'pkt-row';
    tr.dataset.proto = row[2];
    tr.innerHTML = `
      <td class="muted">${counter++}</td>
      <td>${(Math.random() * 0.05).toFixed(3)}</td>
      <td>${row[0]}</td><td>${row[1]}</td>
      <td><span class="proto ${row[2].toLowerCase()}">${row[2]}</span></td>
      <td>${row[3]}</td><td>${row[4]}</td>
    `;
    list.insertBefore(tr, list.firstChild);
    if (list.children.length > 30) list.removeChild(list.lastChild);
  }, 1500);
}


/* ============================================================
   NMAP CONTROLS
   ============================================================ */

function startNmapScan() {
  const target = document.getElementById('nmap-target')?.value;
  const type   = document.getElementById('nmap-type')?.value;
  // TODO: BACKEND — POST /api/tools/nmap/scan { target, type, options: [] }
  toast(`NMAP SCAN STARTED: ${target}`, 'success');
  updateNmapCmd();
}

function updateNmapCmd() {
  const target = document.getElementById('nmap-target')?.value || '';
  const type   = document.getElementById('nmap-type')?.value || '-sS';
  const timing = document.getElementById('nmap-timing')?.value?.split(' ')[0] || 'T3';
  document.getElementById('nmap-cmd').textContent = `nmap ${type} -O -sV -${timing} ${target}`;
}

// Update nmap command preview on input changes
['nmap-target', 'nmap-type', 'nmap-timing'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', updateNmapCmd);
});


/* ============================================================
   TOOL TAB SWITCHER
   ============================================================ */

function switchToolTab(tool, tab, el) {
  // Deactivate all tabs and panels for this tool
  const prefix = { burp: 'burp', wire: 'wire', meta: 'meta' }[tool] || tool;
  document.querySelectorAll(`#section-${toolPageName(tool)} .tool-tab`).forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`#section-${toolPageName(tool)} .tool-panel`).forEach(p => p.classList.remove('active'));

  el.classList.add('active');
  document.getElementById(`${prefix}-${tab}`)?.classList.add('active');
}

function toolPageName(tool) {
  return { burp: 'burpsuite', wire: 'wireshark', meta: 'metasploit', nmap: 'nmap' }[tool] || tool;
}


/* ============================================================
   SETTINGS ACTIONS
   ============================================================ */

function saveSettings() {
  // TODO: BACKEND — PATCH /api/user/settings { ... }
  toast('SETTINGS SAVED', 'success');
}

function regenerateKey() {
  // TODO: BACKEND — POST /api/user/api-key/regenerate
  toast('API KEY REGENERATED', 'success');
  document.getElementById('api-key-val').value = 'clx_live_sk_' + Math.random().toString(36).slice(2, 34);
}

function setAccent(color, el) {
  document.documentElement.style.setProperty('--accent', color);
  // Recalculate derived accent variables
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.12));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.4));
  document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}


/* ============================================================
   UTILITIES
   ============================================================ */

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pad(n)    { return String(n).padStart(2, '0'); }
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.3s ease';
}

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}`;
document.head.appendChild(shakeStyle);


/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

document.addEventListener('keydown', (e) => {
  // ⌘K / Ctrl+K — focus search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.querySelector('.search-input')?.focus();
  }

  // Escape — close mobile sidebar
  if (e.key === 'Escape') {
    document.getElementById('sidebar')?.classList.remove('open');
  }
});


/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  startActivityFeed();
});
