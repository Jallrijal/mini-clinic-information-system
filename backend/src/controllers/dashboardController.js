const { sendSuccess } = require('../utils/response');

/**
 * Dashboard Controller (Stub)
 * -----------------------------------------------
 * Akan diimplementasikan penuh di Step 14 (Dashboard API).
 * Saat ini hanya memastikan routes + role authorization bisa diuji.
 */

const getSummary = async (req, res, next) => {
    try {
        return sendSuccess(res, '[STUB] Dashboard summary — akan diimplementasikan di Step 14.', {
            totalPatients: 0,
            totalPatientsToday: 0,
            totalQueuesToday: 0,
            totalWaiting: 0,
            totalDone: 0,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getSummary };
