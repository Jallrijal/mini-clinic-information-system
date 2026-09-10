/**
 * Global Error Handling Middleware
 * ----------------------------------
 * Express memanggil middleware ini secara otomatis ketika ada `next(err)` dipanggil
 * dari route/controller manapun.
 * Middleware error WAJIB memiliki 4 parameter: (err, req, res, next).
 */
const { sendError } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

    // JWT errors dari jsonwebtoken
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Token tidak valid', null, 401);
    }
    if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token sudah kedaluwarsa, silakan login kembali', null, 401);
    }

    // Validasi / business logic error yang sengaja dilempar dengan status code
    const status = err.statusCode || err.status || 500;
    const message = err.message || 'Terjadi kesalahan pada server';
    const errors = err.errors || null;

    return sendError(res, message, errors, status);
};

module.exports = errorMiddleware;
