const { sendSuccess } = require('../utils/response');

/**
 * Medical Record Controller (Stub)
 * -----------------------------------------------
 * Akan diimplementasikan penuh di Step 13 (Medical Record API).
 * Saat ini hanya memastikan routes + role authorization bisa diuji.
 */

const create = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Buat rekam medis — akan diimplementasikan di Step 13.', null, 201);
    } catch (err) {
        next(err);
    }
};

const getByPatient = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Riwayat rekam medis — akan diimplementasikan di Step 13.', []);
    } catch (err) {
        next(err);
    }
};

module.exports = { create, getByPatient };
