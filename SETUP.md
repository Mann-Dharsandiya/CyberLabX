# CyberLabX — Backend Setup Guide

## File Structure (new files only)
```
backend/
├── server.js              ← Main Express + WebSocket server
├── database.js            ← SQLite setup, all table creation
├── package.json           ← Dependencies
├── .env.example           ← Copy to .env and fill in values
├── middleware/
│   └── auth.js            ← JWT verify + generate helpers
└── routes/
    ├── auth.js            ← Login, register, verify, logout
    ├── tools.js           ← Burp, Wireshark, Nmap, Metasploit
    ├── user.js            ← Profile, settings, API key, scans
    └── terminal.js        ← Mini terminal command handler
```

---

## Step 1 — Install Node.js
Download from https://nodejs.org (v18 or higher recommended)

---

## Step 2 — Set Up the Project

```bash
# 1. Create your project folder
mkdir cyberlabx && cd cyberlabx

# 2. Copy ALL backend files into it (keeping the folder structure above)

# 3. Create a /public folder and put your frontend files there
mkdir public
# Copy index.html, style.css, app.js → into /public

# 4. Install dependencies
npm install

# 5. Create your .env file
cp .env.example .env
# Then open .env and change JWT_SECRET to a long random string
```

---

## Step 3 — Update app.js (Frontend)

In your `app.js`, update the CONFIG object at the top:

```js
const CONFIG = {
  API_BASE: '/api',              // Keep this as-is (Express serves on same port)
  WS_URL:   'ws://localhost:3000',
  TOKEN_KEY: 'clx_token',
  USER_KEY:  'clx_user',
};
```

Then find every `// TODO: BACKEND` comment and uncomment the real fetch call,
deleting the simulation code below it. The README.md has examples of exactly
what to uncomment.

### WebSocket — replace simulation in app.js

Find `startActivityFeed()` and replace with:

```js
function startActivityFeed() {
  const ws = new WebSocket(`${CONFIG.WS_URL}/events`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'subscribe', feed: 'activity' }));
    ws.send(JSON.stringify({ type: 'subscribe', feed: 'wireshark' }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'activity') {
      prependActivity(data);
    }
    if (data.type === 'packet') {
      appendPacketRow(data);
    }
  };

  ws.onerror = () => console.warn('[WS] Connection failed');
}
```

---

## Step 4 — Run the Server

```bash
# Production
node server.js

# Development (auto-restarts on file changes)
npm run dev
```

Open http://localhost:3000 in your browser.
The frontend (index.html) is served automatically.

---

## API Endpoints Reference

### Auth
| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/api/auth/register` | `{ firstName, lastName, email, username, password }` | `{ message }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET  | `/api/auth/verify` | — (Bearer token) | `{ valid, user }` |
| POST | `/api/auth/logout` | — (Bearer token) | `{ message }` |

### Tools (all require `Authorization: Bearer <token>`)
| Method | Path | Body |
|--------|------|------|
| POST | `/api/tools/burpsuite/proxy` | `{ enabled: true/false }` |
| POST | `/api/tools/burpsuite/scan` | `{ target, type }` |
| POST | `/api/tools/burpsuite/forward` | `{ request }` |
| POST | `/api/tools/burpsuite/drop` | — |
| POST | `/api/tools/burpsuite/repeater` | `{ request }` |
| POST | `/api/tools/wireshark/capture` | `{ action: 'start'/'stop' }` |
| POST | `/api/tools/wireshark/filter` | `{ filter }` |
| POST | `/api/tools/nmap/scan` | `{ target, type, timing, options }` |
| GET  | `/api/tools/nmap/results/:scanId` | — |
| POST | `/api/tools/metasploit/exec` | `{ command }` |
| GET  | `/api/tools/status/all` | — |
| GET  | `/api/tools/:tool/status` | — |

### User (all require Bearer token)
| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/user/me` | Get profile + settings |
| PATCH  | `/api/user/settings` | Update profile/password/theme |
| POST   | `/api/user/api-key/regenerate` | Get new API key |
| GET    | `/api/user/activity` | Recent activity log |
| GET    | `/api/user/sessions` | Operator sessions |
| GET    | `/api/user/scans` | Scan history |

### Terminal
| Method | Path | Body |
|--------|------|------|
| POST | `/api/terminal/exec` | `{ command }` |

---

## Database

SQLite database is automatically created at `./data/cyberlabx.db`
on first run. No setup needed.

Tables created:
- `users` — accounts and API keys
- `operator_sessions` — login session tracking
- `activity_log` — all security events
- `scan_results` — Nmap and Burp scan history
- `reports` — generated reports
- `tool_status` — live status of each tool
- `user_settings` — per-user preferences

---

## WebSocket Events (from server → frontend)

```js
// Activity feed event
{ type: 'activity', severity: 'crit'/'warn'/'info', message, tool, ip, timestamp }

// Wireshark packet
{ type: 'packet', no, time, src, dst, protocol, length, info, timestamp }

// Scan finished
{ type: 'scan_complete', scanId, tool, target, result }
```

---

## Next Steps (optional upgrades)

- **Real Nmap**: Replace stub with `child_process.exec('nmap ...')` in routes/tools.js
- **Real Metasploit**: Connect to `msfrpcd` via its JSON-RPC API
- **OAuth**: Install `passport`, `passport-google-oauth20`, `passport-github2`
- **Production DB**: Swap `better-sqlite3` for PostgreSQL using `pg` or `prisma`
- **HTTPS**: Use `nginx` as a reverse proxy with Let's Encrypt SSL
