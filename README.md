# CyberLabX — Frontend Documentation

## File Structure
```
cyberlabx/
├── index.html   — Full multi-page SPA (Login + Dashboard + 4 tools)
├── style.css    — Complete dark hacker theme
├── app.js       — All frontend logic + backend integration points
└── README.md    — This file
```

## Pages Included
- **Login / Register** — Auth forms with tab switching, OAuth buttons, password strength
- **Overview Dashboard** — Stat cards, live activity feed, mini terminal, vuln chart, tools status
- **Tools Hub** — Card grid for all 4 tools
- **Burp Suite** — Intercept, Scanner, Repeater, HTTP History tabs
- **Wireshark** — Packet list, filter presets, statistics
- **Nmap** — Scan config builder, results table, live command preview
- **Metasploit** — MSF console, module browser, sessions
- **Reports** — Report history table
- **Sessions** — Operator session management
- **Settings** — Profile, security, API key, theme/accent picker

---

## Backend Integration (Node.js + Express)

Every API call in `app.js` is marked with `// TODO: BACKEND` and has the exact endpoint path ready.

### Auth Endpoints Needed
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login → returns `{ token, user }` |
| POST | `/api/auth/register` | Register → returns `{ message }` |
| GET  | `/api/auth/verify` | Validate JWT → returns `{ valid }` |
| GET  | `/api/auth/oauth/google` | OAuth redirect |
| GET  | `/api/auth/oauth/github` | OAuth redirect |

### Tool Endpoints Needed
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/tools/burpsuite/proxy` | Toggle proxy |
| POST | `/api/tools/burpsuite/scan` | Start scan |
| POST | `/api/tools/burpsuite/forward` | Forward intercepted request |
| POST | `/api/tools/wireshark/capture` | Start/stop capture |
| POST | `/api/tools/wireshark/filter` | Apply display filter |
| POST | `/api/tools/nmap/scan` | Run nmap scan |
| POST | `/api/tools/metasploit/exec` | Execute MSF command |
| GET  | `/api/tools/*/status` | Get tool status |

### User/Settings Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/user/settings` | Save settings |
| POST  | `/api/user/api-key/regenerate` | Regen API key |

### WebSocket
Connect to `ws://your-server/events` for:
- Live activity feed events
- Real-time packet data from Wireshark
- Tool status updates

### JWT Flow
1. User logs in → backend returns JWT
2. Frontend stores JWT in `localStorage` under key `clx_token`
3. All subsequent API calls include `Authorization: Bearer <token>` header
4. On page load, frontend calls `/api/auth/verify` to check token validity

---

## How to Activate Backend Calls
Search for `// TODO: BACKEND` in `app.js` — each block has the commented-out fetch call ready. Just uncomment it and delete the simulation code below it.

Example (login):
```js
// UNCOMMENT THIS:
const res  = await fetch(`${CONFIG.API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await res.json();
if (!res.ok) throw new Error(data.message || 'Login failed');
saveToken(data.token);

// DELETE THIS (demo simulation):
await sleep(1200);
saveToken('demo_jwt_token_replace_with_real');
```

## CONFIG Object (top of app.js)
```js
const CONFIG = {
  API_BASE: '/api',              // Change to http://localhost:3000/api in dev
  WS_URL:   'ws://localhost:3000',
  TOKEN_KEY: 'clx_token',
  USER_KEY:  'clx_user',
};
```
