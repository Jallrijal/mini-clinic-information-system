const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const registrationController = require('../controllers/registrationController');

/**
 * Registration Routes
 * -----------------------------------------------------------------------
 * GET  /api/registrations       → daftar semua pendaftaran
 * POST /api/registrations       → buat pendaftaran baru
 * PUT  /api/registrations/:id   → ubah data pendaftaran / status kunjungan
 *
 * Role yang diizinkan:
 *   - ADMIN                → full access
 *   - REGISTRATION_OFFICER → bisa baca + buat + ubah (sesuai tugasnya)
 *   - DOCTOR               → hanya baca (melihat antrian pasien hari ini)
 * -----------------------------------------------------------------------
 */

router.get('/',    authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), registrationController.getAll);
router.post('/',   authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'),           registrationController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'),           registrationController.update);

module.exports = router;
