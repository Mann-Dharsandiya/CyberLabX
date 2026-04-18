/**
 * ============================================================
 *  CYBERLABX — routes/tools.js
 *  All tool control endpoints — protected by JWT middleware
 *
 *  POST  /api/tools/burpsuite/proxy
 *  POST  /api/tools/burpsuite/scan
 *  POST  /api/tools/burpsuite/forward
 *  POST  /api/tools/burpsuite/drop
 *  POST  /api/tools/burpsuite/repeater
 *  POST  /api/tools/wireshark/capture
 *  POST  /api/tools/wireshark/filter
 *  POST  /api/tools/nmap/scan
 *  GET   /api/tools/nmap/results/:scanId
 *  POST  /api/tools/metasploit/exec
 *  GET   /api/tools/:tool/status
 *  GET   /api/tools/status/all
 * ============================================================
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();
const db      = require('../database');

// ── Helper: log activity and broadcast ──────────────────────
function logAndBroadcast(req, severity, message, tool) {
  const id = uuidv4();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  db.prepare(`
    INSERT INTO activity_log (id, user_id, severity, message, ip_address, tool)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, severity, message, ip, tool);

  req.app.locals.broadcast({
    type:      'activity',
    severity,
    message,
    tool,
    ip,
    timestamp: new Date().toISOString(),
  }, 'activity');
}

// ── Helper: update tool status ───────────────────────────────
function updateToolStatus(toolName, status) {
  db.prepare(`
    UPDATE tool_status SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE tool_name = ?
  `).run(status, toolName);
}

// ============================================================
//  BURP SUITE
// ============================================================

// POST /api/tools/burpsuite/proxy
router.post('/burpsuite/proxy', (req, res) => {
  const { enabled } = req.body;
  const status = enabled ? 'running' : 'idle';
  updateToolStatus('burpsuite', status);
  logAndBroadcast(req, 'info', `Burp Suite proxy ${enabled ? 'ENABLED' : 'DISABLED'}`, 'Burp Suite');
  return res.json({ success: true, proxy: enabled, status });
});

// POST /api/tools/burpsuite/scan
router.post('/burpsuite/scan', (req, res) => {
  const { target, type = 'active' } = req.body;

  if (!target) return res.status(400).json({ error: 'Target URL is required' });

  const scanId = uuidv4();
  db.prepare(`
    INSERT INTO scan_results (id, user_id, tool, target, scan_type, status)
    VALUES (?, ?, 'burpsuite', ?, ?, 'running')
  `).run(scanId, req.user.id, target, type);

  logAndBroadcast(req, 'warn', `Burp Suite scan started on ${target}`, 'Burp Suite');

  // In a real implementation, you'd spawn a Burp headless process here
  // and update scan_results when done. For now we mark it done after delay:
  setTimeout(() => {
    db.prepare(`
      UPDATE scan_results
      SET status = 'done', result = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify({ vulnerabilities: [], note: 'Connect real Burp API to populate' }), scanId);

    req.app.locals.broadcast({
      type:   'scan_complete',
      scanId,
      tool:   'burpsuite',
      target,
    });
  }, 5000);

  return res.json({ success: true, scanId, message: `Scan started on ${target}` });
});

// POST /api/tools/burpsuite/forward
router.post('/burpsuite/forward', (req, res) => {
  const { request } = req.body;
  logAndBroadcast(req, 'info', 'Burp Suite: request forwarded', 'Burp Suite');
  return res.json({ success: true, message: 'Request forwarded' });
});

// POST /api/tools/burpsuite/drop
router.post('/burpsuite/drop', (req, res) => {
  logAndBroadcast(req, 'warn', 'Burp Suite: request dropped', 'Burp Suite');
  return res.json({ success: true, message: 'Request dropped' });
});

// POST /api/tools/burpsuite/repeater
router.post('/burpsuite/repeater', (req, res) => {
  const { request } = req.body;
  logAndBroadcast(req, 'info', 'Burp Suite: repeater request sent', 'Burp Suite');
  // Stub response — wire to real Burp REST API to get actual response
  return res.json({
    success: true,
    response: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"intercepted"}',
  });
});


// ============================================================
//  WIRESHARK
// ============================================================

let captureState = { active: false, interface: 'eth0', filter: '' };

// POST /api/tools/wireshark/capture
router.post('/wireshark/capture', (req, res) => {
  const { action } = req.body;  // 'start' or 'stop'
  captureState.active = (action === 'start');
  const status = captureState.active ? 'running' : 'idle';
  updateToolStatus('wireshark', status);
  logAndBroadcast(req, 'info', `Wireshark capture ${action}ed`, 'Wireshark');
  return res.json({ success: true, capturing: captureState.active });
});

// POST /api/tools/wireshark/filter
router.post('/wireshark/filter', (req, res) => {
  const { filter } = req.body;
  captureState.filter = filter || '';
  logAndBroadcast(req, 'info', `Wireshark filter applied: ${filter || 'cleared'}`, 'Wireshark');
  return res.json({ success: true, filter: captureState.filter });
});


// ============================================================
//  NMAP
// ============================================================

// POST /api/tools/nmap/scan
router.post('/nmap/scan', (req, res) => {
  const { target, type = '-sS', timing = 'T3', options = [] } = req.body;

  if (!target) return res.status(400).json({ error: 'Target is required' });

  const command = `nmap ${type} -O -sV -${timing} ${options.join(' ')} ${target}`.trim();
  const scanId  = uuidv4();

  db.prepare(`
    INSERT INTO scan_results (id, user_id, tool, target, scan_type, command, status)
    VALUES (?, ?, 'nmap', ?, ?, ?, 'running')
  `).run(scanId, req.user.id, target, type, command);

  updateToolStatus('nmap', 'running');
  logAndBroadcast(req, 'warn', `Nmap scan started: ${command}`, 'Nmap');

  // Simulate scan completion with stub results
  // Replace this with child_process.exec('nmap ...') for real scans
  setTimeout(() => {
    const stubResult = {
      command,
      hosts: [{
        ip: target,
        hostname: 'target.local',
        status: 'up',
        ports: [
          { port: 22,  state: 'open',   service: 'ssh',   version: 'OpenSSH 8.2' },
          { port: 80,  state: 'open',   service: 'http',  version: 'Apache 2.4.41' },
          { port: 443, state: 'open',   service: 'https', version: 'Apache 2.4.41' },
          { port: 3306,state: 'closed', service: 'mysql', version: '' },
        ],
        os: 'Linux 5.x',
      }],
    };

    db.prepare(`
      UPDATE scan_results
      SET status = 'done', result = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(stubResult), scanId);

    updateToolStatus('nmap', 'idle');

    req.app.locals.broadcast({
      type:    'scan_complete',
      scanId,
      tool:    'nmap',
      target,
      result:  stubResult,
    });
  }, 4000);

  return res.json({ success: true, scanId, command });
});

// GET /api/tools/nmap/results/:scanId
router.get('/nmap/results/:scanId', (req, res) => {
  const scan = db.prepare('SELECT * FROM scan_results WHERE id = ? AND user_id = ?')
    .get(req.params.scanId, req.user.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  return res.json({ ...scan, result: scan.result ? JSON.parse(scan.result) : null });
});


// ============================================================
//  METASPLOIT
// ============================================================

// POST /api/tools/metasploit/exec
// Executes an MSF console command.
// In production: connect to msfrpcd (Metasploit RPC daemon)
router.post('/metasploit/exec', (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });

  logAndBroadcast(req, 'crit', `Metasploit exec: ${command}`, 'Metasploit');

  // Stub response — replace with real msfrpcd API call
  const output = getMsfStubResponse(command);
  return res.json({ success: true, output });
});

function getMsfStubResponse(cmd) {
  const c = cmd.toLowerCase().trim();
  if (c === 'help')     return '[*] Core Commands: use, set, run, sessions, search, exit';
  if (c === 'sessions') return '[*] Active sessions: 1\n   Id  Type       Connection\n   1   meterpreter 192.168.1.104 → 192.168.1.100';
  if (c.startsWith('search')) return '[*] Searching modules... 5 results found';
  if (c.startsWith('use'))    return `[*] Using module: ${cmd.replace(/^use\s*/i, '')}`;
  if (c.startsWith('set'))    return `${cmd.replace(/^set\s+/i,'').split(' ').shift()} => ${cmd.split(' ').pop()}`;
  if (c === 'run' || c === 'exploit') return '[*] Running exploit...\n[+] Session opened!';
  return `[-] Unknown command: ${cmd}. Type 'help'.`;
}


// ============================================================
//  TOOL STATUS
// ============================================================

// GET /api/tools/status/all
router.get('/status/all', (req, res) => {
  const rows = db.prepare('SELECT * FROM tool_status').all();
  const status = {};
  rows.forEach(r => { status[r.tool_name] = r; });
  return res.json(status);
});

// GET /api/tools/:tool/status
router.get('/:tool/status', (req, res) => {
  const row = db.prepare('SELECT * FROM tool_status WHERE tool_name = ?').get(req.params.tool);
  if (!row) return res.status(404).json({ error: 'Tool not found' });
  return res.json(row);
});

module.exports = router;
