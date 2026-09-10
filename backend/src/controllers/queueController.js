const { sendSuccess } = require('../utils/response');

/**
 * Queue Controller (Stub)
 * -----------------------------------------------
 * Akan diimplementasikan penuh di Step 12 (Queue API).
 * Saat ini hanya memastikan routes + role authorization bisa diuji.
 */

const getAll = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Daftar antrian — akan diimplementasikan di Step 12.', []);
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Generate antrian — akan diimplementasikan di Step 12.', null, 201);
    } catch (err) {
        next(err);
    }
};

const call = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Panggil antrian — akan diimplementasikan di Step 12.');
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Update status antrian — akan diimplementasikan di Step 12.');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, create, call, updateStatus };
