const { sendError } = require('../utils/response');

/**
 * Role-Based Authorization Middleware
 * ----------------------------------------
 * Digunakan SETELAH `authenticate` middleware.
 * Menerima satu atau lebih role yang diizinkan mengakses route.
 *
 * Contoh pemakaian:
 *   router.delete('/patients/:id', authenticate, authorize('ADMIN'), deletePatient);
 *   router.get('/queue',           authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'), getQueues);
 *
 * Role yang tersedia (sesuai database ENUM):
 *   - ADMIN
 *   - DOCTOR
 *   - REGISTRATION_OFFICER
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 'Akses ditolak. Pengguna tidak terautentikasi.', null, 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            return sendError(
                res,
                `Akses ditolak. Hanya role [${allowedRoles.join(', ')}] yang diizinkan.`,
                null,
                403
            );
        }

        next();
    };
};

module.exports = { authorize };
