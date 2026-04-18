/**
 * ============================================================
 *  CYBERLABX — server.js
 *  Express REST API + WebSocket Server
 *
 *  PORT: 3000 (change via env PORT=xxxx)
 *
 *  Run:  node server.js
 *  Dev:  npm run dev   (auto-restart with nodemon)
 * ============================================================
 */

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const cors      = require('cors');
const path      = require('path');

// ── Database ──────────────────────────────────────────────
const db = require('./database');

// ── Route files ───────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const toolRoutes     = require('./routes/tools');
const userRoutes     = require('./routes/user');
const terminalRoutes = require('./routes/terminal');

// ── Middleware: JWT auth ───────────────────────────────────
const { verifyToken } = require('./middleware/auth');

// ============================================================
//  EXPRESS APP SETUP
// ============================================================

const app = express();

app.use(cors({
  origin: '*',                        // Restrict to your domain in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve frontend static files ────────────────────────────
// Put your index.html, style.css, app.js in /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
//  API ROUTES
// ============================================================

app.use('/api/auth',     authRoutes);
app.use('/api/tools',    verifyToken, toolRoutes);
app.use('/api/user',     verifyToken, userRoutes);
app.use('/api/terminal', verifyToken, terminalRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Catch-all: serve SPA for any unknown route ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
//  HTTP SERVER
// ============================================================

const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);

// ============================================================
//  WEBSOCKET SERVER
//  Connect from frontend: new WebSocket('ws://localhost:3000')
// ============================================================

const wss = new WebSocket.Server({ server, path: '/events' });

// Track all connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  // Optional: verify token from query string
  // const token = new URLSearchParams(req.url.split('?')[1]).get('token');
  // if (!verifyWsToken(token)) return ws.close(1008, 'Unauthorized');

  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);

  // Send a welcome event
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'CyberLabX WebSocket live',
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleWsMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

/**
 * Handle messages sent FROM the frontend to the server
 */
function handleWsMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      // Client subscribes to a specific feed (e.g. wireshark, activity)
      ws.subscribedFeeds = ws.subscribedFeeds || new Set();
      ws.subscribedFeeds.add(msg.feed);
      ws.send(JSON.stringify({ type: 'subscribed', feed: msg.feed }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${msg.type}` }));
  }
}

/**
 * Broadcast an event to ALL connected WebSocket clients
 * Call this from route handlers to push live updates.
 *
 * @param {object} payload  — the JSON object to broadcast
 * @param {string} [feed]   — optional feed filter (only send to subscribers)
 */
function broadcast(payload, feed = null) {
  const data = JSON.stringify(payload);
  clients.forEach(client => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (feed && client.subscribedFeeds && !client.subscribedFeeds.has(feed)) return;
    client.send(data);
  });
}

// Make broadcast available to routes via app locals
app.locals.broadcast = broadcast;

// ============================================================
//  LIVE ACTIVITY FEED EMITTER
//  Pushes a realistic security event every ~8 seconds
//  Replace/remove this once you have real tool integrations
// ============================================================

const ACTIVITY_EVENTS = [
  { severity: 'crit', message: 'New SQLi vector detected at /api/search',      tool: 'Burp Suite',  ip: '192.168.1.104' },
  { severity: 'warn', message: 'Port scan detected from external host',          tool: 'Nmap',        ip: '45.33.32.156'  },
  { severity: 'info', message: 'TLS handshake anomaly detected',                 tool: 'Wireshark',   ip: '10.0.0.23'     },
  { severity: 'crit', message: 'Privilege escalation attempt detected',          tool: 'Metasploit',  ip: '192.168.1.100' },
  { severity: 'warn', message: 'Suspicious DNS query to blacklisted domain',     tool: 'Wireshark',   ip: '10.0.0.45'     },
  { severity: 'info', message: 'New HTTP request intercepted',                   tool: 'Burp Suite',  ip: '10.0.0.12'     },
  { severity: 'warn', message: 'Brute-force login attempt detected',             tool: 'Metasploit',  ip: '192.168.1.77'  },
];

const PACKET_ROWS = [
  ['192.168.1.104', '8.8.8.8',        'DNS',  '83',  'Standard query'],
  ['10.0.0.23',     '192.168.1.1',    'TCP',  '74',  'SYN Segment'],
  ['192.168.1.100', '93.184.216.34',  'HTTP', '512', 'GET / HTTP/1.1'],
  ['10.0.0.1',      '10.0.0.45',      'ICMP', '98',  'Echo request'],
  ['172.16.0.5',    '172.16.0.1',     'ARP',  '42',  'Who has 172.16.0.1?'],
];

let packetCounter = 4000;

setInterval(() => {
  if (clients.size === 0) return;

  // Activity event
  const evt = ACTIVITY_EVENTS[Math.floor(Math.random() * ACTIVITY_EVENTS.length)];
  broadcast({
    type:      'activity',
    severity:  evt.severity,
    message:   evt.message,
    tool:      evt.tool,
    ip:        evt.ip,
    timestamp: new Date().toISOString(),
  }, 'activity');

}, 8000);

setInterval(() => {
  if (clients.size === 0) return;

  // Wireshark packet
  const row = PACKET_ROWS[Math.floor(Math.random() * PACKET_ROWS.length)];
  broadcast({
    type:      'packet',
    no:        ++packetCounter,
    time:      (Math.random() * 0.05).toFixed(3),
    src:       row[0],
    dst:       row[1],
    protocol:  row[2],
    length:    row[3],
    info:      row[4],
    timestamp: new Date().toISOString(),
  }, 'wireshark');

}, 1500);

// ============================================================
//  START SERVER
// ============================================================

server.listen(PORT, () => {
  console.log(`[SERVER] CyberLabX backend running on http://localhost:${PORT}`);
  console.log(`[WS]     WebSocket listening on ws://localhost:${PORT}/events`);
});

module.exports = { app, broadcast };
