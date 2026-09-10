const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

/**
 * Authentication Middleware (JWT Verify)
 * ----------------------------------------
 * Memverifikasi token JWT yang dikirim lewat header:
 *   Authorization: Bearer <token>
 *
 * Jika valid, menyimpan payload decoded ke `req.user` agar bisa
 * diakses oleh controller berikutnya.
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'Akses ditolak. Token tidak disertakan.', null, 401);
        }

        const token = authHeader.split(' ')[1];

        // jwt.verify akan melempar error jika token invalid/expired
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Simpan payload ke req.user agar controller bisa pakai
        req.user = decoded;

        next();
    } catch (err) {
        // Teruskan ke global error middleware
        next(err);
    }
};

module.exports = { authenticate };
