const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const dashboardController = require('../controllers/dashboardController');

/**
 * Dashboard Routes
 * -----------------------------------------------------------------------
 * GET /api/dashboard → ringkasan statistik klinik hari ini
 *   - Total Pasien
 *   - Total Pasien Hari Ini
 *   - Total Antrean Hari Ini
 *   - Total Pasien Menunggu
 *   - Total Pasien Selesai Dilayani
 *
 * Role yang diizinkan:
 *   - ADMIN                → pengelola sistem
 *   - REGISTRATION_OFFICER → monitoring harian
 *   - DOCTOR               → monitoring antrian pasien
 * -----------------------------------------------------------------------
 */

router.get('/', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), dashboardController.getSummary);

module.exports = router;
