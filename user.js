/**
 * ============================================================
 *  CYBERLABX — routes/user.js
 *  User profile and settings — all protected by JWT
 *
 *  GET   /api/user/me
 *  PATCH /api/user/settings
 *  POST  /api/user/api-key/regenerate
 *  GET   /api/user/activity
 *  GET   /api/user/sessions
 *  GET   /api/user/scans
 * ============================================================
 */

const express = require('express');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router  = express.Router();
const db      = require('../database');

// ============================================================
//  GET /api/user/me
//  Returns current user profile
// ============================================================
router.get('/me', (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.role,
           u.api_key, u.accent_color, u.created_at,
           s.notifications, s.two_fa, s.theme, s.accent_color AS setting_accent
    FROM users u
    LEFT JOIN user_settings s ON s.user_id = u.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id:            user.id,
    firstName:     user.first_name,
    lastName:      user.last_name,
    username:      user.username,
    email:         user.email,
    role:          user.role,
    apiKey:        user.api_key,
    accentColor:   user.setting_accent || user.accent_color,
    createdAt:     user.created_at,
    settings: {
      notifications: !!user.notifications,
      twoFa:         !!user.two_fa,
      theme:         user.theme,
    },
  });
});

// ============================================================
//  PATCH /api/user/settings
//  Update profile / security / theme settings
// ============================================================
router.patch('/settings', async (req, res) => {
  const { firstName, lastName, email, currentPassword, newPassword,
          notifications, twoFa, theme, accentColor } = req.body;

  try {
    // --- Profile fields ---
    if (firstName || lastName || email) {
      const updates = [];
      const params  = [];

      if (firstName) { updates.push('first_name = ?'); params.push(firstName); }
      if (lastName)  { updates.push('last_name = ?');  params.push(lastName);  }
      if (email)     {
        const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
        if (clash) return res.status(409).json({ error: 'Email already in use' });
        updates.push('email = ?');
        params.push(email);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // --- Password change ---
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be 8+ chars' });

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Current password is wrong' });

      const hash = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    }

    // --- Accent color on users table ---
    if (accentColor) {
      db.prepare('UPDATE users SET accent_color = ? WHERE id = ?').run(accentColor, req.user.id);
    }

    // --- User settings table ---
    const settingUpdates = [];
    const settingParams  = [];

    if (notifications !== undefined) { settingUpdates.push('notifications = ?'); settingParams.push(notifications ? 1 : 0); }
    if (twoFa !== undefined)         { settingUpdates.push('two_fa = ?');         settingParams.push(twoFa ? 1 : 0);         }
    if (theme)                       { settingUpdates.push('theme = ?');           settingParams.push(theme);                 }
    if (accentColor)                 { settingUpdates.push('accent_color = ?');    settingParams.push(accentColor);           }

    if (settingUpdates.length > 0) {
      settingParams.push(req.user.id);
      db.prepare(`UPDATE user_settings SET ${settingUpdates.join(', ')} WHERE user_id = ?`).run(...settingParams);
    }

    return res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    console.error('[USER] Settings error:', err);
    return res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================================================
//  POST /api/user/api-key/regenerate
// ============================================================
router.post('/api-key/regenerate', (req, res) => {
  const newKey = 'clx_live_sk_' + crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE users SET api_key = ? WHERE id = ?').run(newKey, req.user.id);
  return res.json({ success: true, apiKey: newKey });
});

// ============================================================
//  GET /api/user/activity
//  Recent activity log for the current user
// ============================================================
router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs  = db.prepare(`
    SELECT * FROM activity_log
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(req.user.id, limit);
  return res.json(logs);
});

// ============================================================
//  GET /api/user/sessions
//  Operator sessions list
// ============================================================
router.get('/sessions', (req, res) => {
  const sessions = db.prepare(`
    SELECT * FROM operator_sessions
    WHERE user_id = ?
    ORDER BY started_at DESC
    LIMIT 50
  `).all(req.user.id);
  return res.json(sessions);
});

// ============================================================
//  GET /api/user/scans
//  All scan results for this user
// ============================================================
router.get('/scans', (req, res) => {
  const scans = db.prepare(`
    SELECT id, tool, target, scan_type, command, status, started_at, finished_at
    FROM scan_results
    WHERE user_id = ?
    ORDER BY started_at DESC
    LIMIT 100
  `).all(req.user.id);
  return res.json(scans);
});

module.exports = router;
