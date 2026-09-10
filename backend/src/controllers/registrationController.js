const { sendSuccess } = require('../utils/response');

/**
 * Registration Controller (Stub)
 * -----------------------------------------------
 * Akan diimplementasikan penuh di Step 11 (Registration API).
 * Saat ini hanya memastikan routes + role authorization bisa diuji.
 */

const getAll = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Daftar pendaftaran — akan diimplementasikan di Step 11.', []);
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Buat pendaftaran — akan diimplementasikan di Step 11.', null, 201);
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Update pendaftaran — akan diimplementasikan di Step 11.');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, create, update };
