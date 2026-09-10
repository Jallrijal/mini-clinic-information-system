const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const queueController = require('../controllers/queueController');

/**
 * Queue Routes
 * -----------------------------------------------------------------------
 * GET  /api/queues              → daftar antrian (filter by date/status)
 * POST /api/queues              → generate nomor antrian baru
 * PUT  /api/queues/:id/call     → panggil antrian berikutnya
 * PUT  /api/queues/:id/status   → ubah status antrian (check-in, pemeriksaan, selesai)
 *
 * Role yang diizinkan:
 *   - ADMIN                → full access
 *   - REGISTRATION_OFFICER → bisa generate + panggil + ubah status
 *   - DOCTOR               → bisa lihat + ubah status (pemeriksaan → selesai)
 * -----------------------------------------------------------------------
 */

router.get('/',              authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), queueController.getAll);
router.post('/',             authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'),           queueController.create);
router.put('/:id/call',     authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'),           queueController.call);
router.put('/:id/status',   authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), queueController.updateStatus);

module.exports = router;
