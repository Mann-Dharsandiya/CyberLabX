/**
 * ============================================================
 *  CYBERLABX — routes/terminal.js
 *
 *  POST /api/terminal/exec
 *  Executes safe, whitelisted terminal commands only.
 *  WARNING: Never run arbitrary shell commands from user input.
 * ============================================================
 */

const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { v4: uuidv4 } = require('uuid');

// ── Whitelist of allowed commands ────────────────────────────
// Extend this list as needed. Never use exec() on raw user input.
const COMMAND_HANDLERS = {
  help:     () => 'Available: status, tools, sessions, clear, whoami, date, uptime',
  whoami:   (req) => `${req.user.username} :: ${req.user.role.toUpperCase()} :: cyberlabx`,
  date:     () => new Date().toString(),
  uptime:   () => `Server uptime: ${Math.floor(process.uptime())}s`,

  status: (req) => {
    const tools = db.prepare('SELECT tool_name, status, port FROM tool_status').all();
    return tools.map(t =>
      `◈ ${t.tool_name.padEnd(12)} — ${t.status.toUpperCase()}${t.port ? ` (port ${t.port})` : ''}`
    ).join('\n');
  },

  tools: () => 'Loaded: BurpSuite, Wireshark, Nmap, Metasploit',

  sessions: (req) => {
    const sessions = db.prepare(`
      SELECT COUNT(*) as total FROM operator_sessions
      WHERE user_id = ? AND status = 'active'
    `).get(req.user.id);
    return `Active sessions: ${sessions.total}`;
  },

  clear: () => '__CLEAR__',  // Frontend handles this signal
};

// ============================================================
//  POST /api/terminal/exec
// ============================================================
router.post('/exec', (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command is required' });
  }

  const cmd = command.trim().toLowerCase().split(' ')[0];

  // Log the command
  db.prepare(`
    INSERT INTO activity_log (id, user_id, severity, message, tool)
    VALUES (?, ?, 'info', ?, 'Terminal')
  `).run(uuidv4(), req.user.id, `Terminal: ${command}`);

  if (COMMAND_HANDLERS[cmd]) {
    const output = COMMAND_HANDLERS[cmd](req, command);
    return res.json({ success: true, output });
  }

  return res.json({
    success: false,
    output: `bash: ${command}: command not found. Type 'help' for available commands.`,
  });
});

module.exports = router;
