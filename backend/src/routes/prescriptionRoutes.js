const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const prescriptionController = require('../controllers/prescriptionController');

/**
 * Prescription Routes
 * -----------------------------------------------------------------------
 * POST /api/prescriptions       → buat resep obat untuk rekam medis
 * GET  /api/prescriptions/:id   → detail resep + item obat
 *
 * Role yang diizinkan:
 *   - DOCTOR → bisa buat & baca resep
 *   - ADMIN  → read-only (monitoring)
 * -----------------------------------------------------------------------
 */

router.post('/',    authenticate, authorize('DOCTOR'),          prescriptionController.create);
router.get('/:id',  authenticate, authorize('DOCTOR', 'ADMIN'), prescriptionController.getById);

module.exports = router;
