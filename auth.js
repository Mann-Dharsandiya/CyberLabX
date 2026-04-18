/**
 * ============================================================
 *  CYBERLABX — middleware/auth.js
 *  JWT verification middleware for protected routes
 * ============================================================
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberlabx_super_secret_change_in_production';

/**
 * Express middleware — verifies Bearer JWT in Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;   // { id, email, username, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Generate a signed JWT for a user
 * @param {object} payload  — { id, email, username, role }
 * @returns {string}        — signed JWT string
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = { verifyToken, generateToken };
