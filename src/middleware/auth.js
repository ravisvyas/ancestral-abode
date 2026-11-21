import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'unauthorized', message: 'Authentication required. Please log in.' },
    });
  }

  try {
    const decoded = jwt.verify(token, config.admin.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'invalid_token', message: 'Session expired or invalid token. Please log in again.' },
    });
  }
}
