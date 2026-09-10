const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const medicalRecordController = require('../controllers/medicalRecordController');

/**
 * Medical Record Routes
 * -----------------------------------------------------------------------
 * POST /api/medical-records              → buat rekam medis SOAP + tindakan medis
 * GET  /api/medical-records/:patientId   → riwayat pemeriksaan pasien
 *
 * Role yang diizinkan:
 *   - DOCTOR → bisa buat & baca rekam medis (tugas utama dokter)
 *   - ADMIN  → read-only (monitoring)
 * -----------------------------------------------------------------------
 */

router.post('/',            authenticate, authorize('DOCTOR'),          medicalRecordController.create);
router.get('/:patientId',   authenticate, authorize('DOCTOR', 'ADMIN'), medicalRecordController.getByPatient);

module.exports = router;
