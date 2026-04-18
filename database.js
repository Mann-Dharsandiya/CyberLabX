/**
 * ============================================================
 *  CYBERLABX — database.js
 *  SQLite database setup using better-sqlite3
 *  Run once on startup to create all tables
 * ============================================================
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file will be created at ./data/cyberlabx.db
const DB_PATH = path.join(__dirname, 'data', 'cyberlabx.db');

// Create /data directory if it doesn't exist
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
//  CREATE TABLES
// ============================================================

db.exec(`

  -- USERS TABLE
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT DEFAULT 'operator',
    api_key       TEXT UNIQUE,
    accent_color  TEXT DEFAULT '#00ff88',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- SESSIONS TABLE (operator sessions, not HTTP sessions)
  CREATE TABLE IF NOT EXISTS operator_sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    ip_address   TEXT,
    user_agent   TEXT,
    tool         TEXT,
    started_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active  DATETIME DEFAULT CURRENT_TIMESTAMP,
    status       TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ACTIVITY LOG TABLE
  CREATE TABLE IF NOT EXISTS activity_log (
    id         TEXT PRIMARY KEY,
    user_id    TEXT,
    severity   TEXT NOT NULL,   -- 'crit', 'warn', 'info'
    message    TEXT NOT NULL,
    ip_address TEXT,
    tool       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- SCAN RESULTS TABLE (Nmap / Burp scans)
  CREATE TABLE IF NOT EXISTS scan_results (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    tool        TEXT NOT NULL,  -- 'nmap', 'burpsuite'
    target      TEXT NOT NULL,
    scan_type   TEXT,
    command     TEXT,
    result      TEXT,           -- JSON string of results
    status      TEXT DEFAULT 'pending',  -- 'pending', 'running', 'done', 'error'
    started_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- REPORTS TABLE
  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    type        TEXT,
    severity    TEXT,
    content     TEXT,           -- JSON or HTML string
    status      TEXT DEFAULT 'draft',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- TOOL STATUS TABLE
  CREATE TABLE IF NOT EXISTS tool_status (
    tool_name   TEXT PRIMARY KEY,
    status      TEXT DEFAULT 'idle',   -- 'running', 'idle', 'error'
    port        INTEGER,
    interface   TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- SETTINGS TABLE (per-user settings overflow)
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id        TEXT PRIMARY KEY,
    notifications  INTEGER DEFAULT 1,
    two_fa         INTEGER DEFAULT 0,
    theme          TEXT DEFAULT 'dark',
    accent_color   TEXT DEFAULT '#00ff88',
    extra          TEXT DEFAULT '{}',  -- JSON for extra settings
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

`);

// ============================================================
//  SEED INITIAL TOOL STATUS ROWS
// ============================================================

const toolNames = ['burpsuite', 'wireshark', 'nmap', 'metasploit'];

const insertTool = db.prepare(`
  INSERT OR IGNORE INTO tool_status (tool_name, status, port, interface)
  VALUES (?, ?, ?, ?)
`);

const toolDefaults = {
  burpsuite:  { status: 'running', port: 8080,  iface: null   },
  wireshark:  { status: 'running', port: null,   iface: 'eth0' },
  nmap:       { status: 'idle',    port: null,   iface: null   },
  metasploit: { status: 'running', port: 4444,   iface: null   },
};

for (const [name, def] of Object.entries(toolDefaults)) {
  insertTool.run(name, def.status, def.port, def.iface);
}

console.log('[DB] Database initialized at', DB_PATH);

module.exports = db;
