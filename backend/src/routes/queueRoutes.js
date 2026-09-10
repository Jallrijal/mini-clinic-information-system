const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const queueController  = require('../controllers/queueController');

/**
 * Queue Routes
 * -----------------------------------------------------------------------
 * GET  /api/queues              → daftar antrean (filter by date/status + pagination)
 * POST /api/queues              → generate nomor antrean manual (untuk admin)
 * PUT  /api/queues/:id/call     → panggil antrean (WAITING → CALLED)
 * PUT  /api/queues/:id/status   → ubah status antrean
 *
 * Role yang diizinkan:
 *   - ADMIN                → full access
 *   - REGISTRATION_OFFICER → bisa generate + panggil + ubah status
 *   - DOCTOR               → bisa lihat + ubah status (CALLED → DONE)
 * -----------------------------------------------------------------------
 */

// GET  /api/queues          — lihat daftar antrean
router.get(
    '/',
    authenticate,
    authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'),
    queueController.getAll
);

// POST /api/queues          — buat nomor antrean manual
router.post(
    '/',
    authenticate,
    authorize('ADMIN', 'REGISTRATION_OFFICER'),
    queueController.create
);

// PUT  /api/queues/:id/call — panggil antrean berikutnya
router.put(
    '/:id/call',
    authenticate,
    authorize('ADMIN', 'REGISTRATION_OFFICER'),
    queueController.call
);

// PUT  /api/queues/:id/status — ubah status antrean
router.put(
    '/:id/status',
    authenticate,
    authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'),
    queueController.updateStatus
);

module.exports = router;
