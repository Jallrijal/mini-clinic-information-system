const { pool }       = require('../config/database');
const { sendSuccess } = require('../utils/response');

/**
 * Dashboard Controller
 * -----------------------------------------------------------------------
 * Step 14 – Dashboard API
 *
 * Endpoint:
 *   GET /api/dashboard  →  getSummary
 *
 * Statistik yang dikembalikan (sesuai spesifikasi assignment):
 *   - totalPatients        : total seluruh pasien terdaftar
 *   - totalPatientsToday   : total kunjungan (registrasi) hari ini
 *   - totalQueuesToday     : total antrean hari ini
 *   - totalWaiting         : antrean hari ini berstatus WAITING
 *   - totalDone            : antrean hari ini berstatus DONE
 *
 * Tambahan (ekstra info berguna untuk UI):
 *   - totalCalled          : antrean hari ini berstatus CALLED
 *   - totalExamination     : registrasi hari ini berstatus EXAMINATION
 *   - totalCompleted       : registrasi hari ini berstatus COMPLETED
 *   - today                : tanggal hari ini (YYYY-MM-DD)
 * -----------------------------------------------------------------------
 */

const getSummary = async (req, res, next) => {
    try {
        // ── 1. Total seluruh pasien terdaftar ───────────────────────────────
        const [[{ totalPatients }]] = await pool.query(
            `SELECT COUNT(*) AS totalPatients FROM patients`
        );

        // ── 2. Statistik hari ini (tanggal server) ──────────────────────────
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // Total kunjungan (registrasi) hari ini
        const [[{ totalPatientsToday }]] = await pool.query(
            `SELECT COUNT(*) AS totalPatientsToday
             FROM registrations
             WHERE DATE(visit_date) = ?`,
            [today]
        );

        // Total antrean hari ini (semua status)
        const [[{ totalQueuesToday }]] = await pool.query(
            `SELECT COUNT(*) AS totalQueuesToday
             FROM queues
             WHERE queue_date = ?`,
            [today]
        );

        // Antrean hari ini berstatus WAITING
        const [[{ totalWaiting }]] = await pool.query(
            `SELECT COUNT(*) AS totalWaiting
             FROM queues
             WHERE queue_date = ? AND status = 'WAITING'`,
            [today]
        );

        // Antrean hari ini berstatus DONE (selesai dilayani)
        const [[{ totalDone }]] = await pool.query(
            `SELECT COUNT(*) AS totalDone
             FROM queues
             WHERE queue_date = ? AND status = 'DONE'`,
            [today]
        );

        // ── 3. Data ekstra (bonus untuk tampilan UI yang lebih informatif) ──
        // Antrean hari ini berstatus CALLED (sedang dipanggil)
        const [[{ totalCalled }]] = await pool.query(
            `SELECT COUNT(*) AS totalCalled
             FROM queues
             WHERE queue_date = ? AND status = 'CALLED'`,
            [today]
        );

        // Registrasi hari ini berstatus EXAMINATION
        const [[{ totalExamination }]] = await pool.query(
            `SELECT COUNT(*) AS totalExamination
             FROM registrations
             WHERE DATE(visit_date) = ? AND status = 'EXAMINATION'`,
            [today]
        );

        // Registrasi hari ini berstatus COMPLETED
        const [[{ totalCompleted }]] = await pool.query(
            `SELECT COUNT(*) AS totalCompleted
             FROM registrations
             WHERE DATE(visit_date) = ? AND status = 'COMPLETED'`,
            [today]
        );

        return sendSuccess(res, 'Data dashboard berhasil diambil.', {
            // ── Wajib (sesuai assignment) ──
            totalPatients:      Number(totalPatients),
            totalPatientsToday: Number(totalPatientsToday),
            totalQueuesToday:   Number(totalQueuesToday),
            totalWaiting:       Number(totalWaiting),
            totalDone:          Number(totalDone),

            // ── Ekstra (berguna untuk UI) ──
            totalCalled:      Number(totalCalled),
            totalExamination: Number(totalExamination),
            totalCompleted:   Number(totalCompleted),
            today,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getSummary };
