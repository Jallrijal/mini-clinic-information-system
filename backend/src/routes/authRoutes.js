const express = require('express');
const router = express.Router();

const { login, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * Auth Routes
 * -----------
 * POST /api/auth/login   → login, dapatkan JWT token
 * POST /api/auth/logout  → logout (konfirmasi server)
 * GET  /api/auth/me      → ambil profil user yang sedang login (protected)
 */
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;
