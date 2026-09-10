const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/auth/login
 * ----------------------
 * Body: { email, password }
 * Response: { token, user: { id, name, email, role } }
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // --- Validasi input ---
        if (!email || !password) {
            return sendError(res, 'Email dan password wajib diisi.', null, 400);
        }

        // --- Cari user berdasarkan email ---
        const [rows] = await pool.query(
            'SELECT id, name, email, password, role FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return sendError(res, 'Email atau password salah.', null, 401);
        }

        const user = rows[0];

        // --- Verifikasi password ---
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return sendError(res, 'Email atau password salah.', null, 401);
        }

        // --- Generate JWT ---
        const payload = {
            id:    user.id,
            name:  user.name,
            email: user.email,
            role:  user.role,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d',
        });

        return sendSuccess(res, 'Login berhasil.', {
            token,
            user: payload,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/logout
 * ----------------------
 * JWT bersifat stateless — logout cukup dilakukan di sisi client
 * (hapus token dari localStorage/cookie).
 * Endpoint ini disediakan sebagai konfirmasi server-side.
 */
const logout = (req, res) => {
    return sendSuccess(res, 'Logout berhasil. Silakan hapus token di sisi client.');
};

/**
 * GET /api/auth/me
 * ------------------
 * Mengembalikan data profil user yang sedang login.
 * Memerlukan middleware authenticate.
 */
const getMe = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return sendError(res, 'User tidak ditemukan.', null, 404);
        }

        return sendSuccess(res, 'Data profil berhasil diambil.', rows[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { login, logout, getMe };
