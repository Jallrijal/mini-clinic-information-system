const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { authorize }    = require('../middleware/roleMiddleware');
const patientController = require('../controllers/patientController');

/**
 * Patient Routes
 * -----------------------------------------------------------------------
 * GET    /api/patients            → daftar semua pasien (dengan search & pagination)
 * GET    /api/patients/:id        → detail satu pasien
 * POST   /api/patients            → tambah pasien baru
 * PUT    /api/patients/:id        → ubah data pasien
 * DELETE /api/patients/:id        → hapus pasien
 *
 * Role yang diizinkan:
 *   - ADMIN              → full access (CRUD)
 *   - REGISTRATION_OFFICER → bisa baca + tambah + ubah (tidak bisa hapus)
 *   - DOCTOR             → read-only (untuk keperluan lihat data saat pemeriksaan)
 * -----------------------------------------------------------------------
 */

// READ – semua role boleh melihat daftar & detail pasien
router.get('/', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), patientController.getAll);
router.get('/:id', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER', 'DOCTOR'), patientController.getById);

// CREATE – admin & petugas pendaftaran
router.post('/', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'), patientController.create);

// UPDATE – admin & petugas pendaftaran
router.put('/:id', authenticate, authorize('ADMIN', 'REGISTRATION_OFFICER'), patientController.update);

// DELETE – hanya admin
router.delete('/:id', authenticate, authorize('ADMIN'), patientController.remove);

module.exports = router;