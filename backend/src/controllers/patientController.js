const { pool }        = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generateMedicalRecordNumber } = require('../utils/generateMedicalRecordNumber');

/**
 * Patient Controller
 * -----------------------------------------------------------------------
 * Implementasi penuh untuk Step 10 – Patient API
 *
 * Endpoint:
 *   GET    /api/patients            → getAll  (search + pagination)
 *   GET    /api/patients/:id        → getById
 *   POST   /api/patients            → create  (auto-generate no. RM, validasi NIK duplikat)
 *   PUT    /api/patients/:id        → update
 *   DELETE /api/patients/:id        → remove  (hanya ADMIN)
 *
 * Catatan nama kolom (sesuai schema SQL):
 *   birth_date  (bukan date_of_birth)
 *   phone       (bukan phone_number)
 * -----------------------------------------------------------------------
 */

/**
 * GET /api/patients
 * Query params: ?search=&page=1&limit=10
 */
const getAll = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const searchPattern = `%${search}%`;

        const [rows] = await pool.query(
            `SELECT id, medical_record_number, nik, name, gender,
                    birth_date, phone, address, created_at
             FROM patients
             WHERE name LIKE ? OR nik LIKE ? OR medical_record_number LIKE ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [searchPattern, searchPattern, searchPattern, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM patients
             WHERE name LIKE ? OR nik LIKE ? OR medical_record_number LIKE ?`,
            [searchPattern, searchPattern, searchPattern]
        );

        return sendSuccess(res, 'Data pasien berhasil diambil.', {
            patients: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/patients/:id
 */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT id, medical_record_number, nik, name, gender,
                    birth_date, phone, address, created_at, updated_at
             FROM patients WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return sendError(res, 'Pasien tidak ditemukan.', null, 404);
        }

        return sendSuccess(res, 'Data pasien berhasil diambil.', rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/patients
 * Body: { nik, name, gender, birth_date, phone, address }
 */
const create = async (req, res, next) => {
    try {
        const { nik, name, gender, birth_date, phone, address } = req.body;

        // --- Validasi field wajib ---
        const missingFields = [];
        if (!nik)        missingFields.push('nik');
        if (!name)       missingFields.push('name');
        if (!gender)     missingFields.push('gender');
        if (!birth_date) missingFields.push('birth_date');

        if (missingFields.length > 0) {
            return sendError(
                res,
                'Field wajib tidak boleh kosong.',
                { required: missingFields },
                422
            );
        }

        // --- Validasi format gender ---
        if (!['MALE', 'FEMALE'].includes(gender.toUpperCase())) {
            return sendError(
                res,
                'Nilai gender tidak valid. Gunakan MALE atau FEMALE.',
                { gender: 'Harus MALE atau FEMALE.' },
                422
            );
        }

        // --- Validasi NIK (16 digit angka) ---
        if (!/^\d{16}$/.test(nik)) {
            return sendError(
                res,
                'NIK tidak valid. NIK harus 16 digit angka.',
                { nik: 'NIK harus 16 digit angka.' },
                422
            );
        }

        // --- Cek duplikasi NIK ---
        const [existing] = await pool.query(
            'SELECT id FROM patients WHERE nik = ?',
            [nik]
        );
        if (existing.length > 0) {
            return sendError(
                res,
                'NIK sudah terdaftar.',
                { nik: 'NIK sudah digunakan oleh pasien lain.' },
                422
            );
        }

        // --- Generate nomor rekam medis otomatis ---
        const medical_record_number = await generateMedicalRecordNumber(pool);

        const [result] = await pool.query(
            `INSERT INTO patients
                (medical_record_number, nik, name, gender, birth_date, phone, address)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                medical_record_number,
                nik,
                name.trim(),
                gender.toUpperCase(),
                birth_date,
                phone  || null,
                address || null,
            ]
        );

        const [newPatient] = await pool.query(
            'SELECT * FROM patients WHERE id = ?',
            [result.insertId]
        );

        return sendSuccess(res, 'Pasien berhasil ditambahkan.', newPatient[0], 201);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/patients/:id
 * Body: { nik, name, gender, birth_date, phone, address }
 * Semua field bersifat opsional (partial update).
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nik, name, gender, birth_date, phone, address } = req.body;

        // --- Cek pasien ada ---
        const [existing] = await pool.query(
            'SELECT id FROM patients WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return sendError(res, 'Pasien tidak ditemukan.', null, 404);
        }

        // --- Validasi gender jika dikirim ---
        if (gender && !['MALE', 'FEMALE'].includes(gender.toUpperCase())) {
            return sendError(
                res,
                'Nilai gender tidak valid. Gunakan MALE atau FEMALE.',
                { gender: 'Harus MALE atau FEMALE.' },
                422
            );
        }

        // --- Validasi NIK format jika dikirim ---
        if (nik && !/^\d{16}$/.test(nik)) {
            return sendError(
                res,
                'NIK tidak valid. NIK harus 16 digit angka.',
                { nik: 'NIK harus 16 digit angka.' },
                422
            );
        }

        // --- Cek duplikasi NIK (kecuali milik pasien itu sendiri) ---
        if (nik) {
            const [dupNik] = await pool.query(
                'SELECT id FROM patients WHERE nik = ? AND id != ?',
                [nik, id]
            );
            if (dupNik.length > 0) {
                return sendError(
                    res,
                    'NIK sudah digunakan oleh pasien lain.',
                    { nik: 'NIK duplikat.' },
                    422
                );
            }
        }

        await pool.query(
            `UPDATE patients
             SET nik        = COALESCE(?, nik),
                 name       = COALESCE(?, name),
                 gender     = COALESCE(?, gender),
                 birth_date = COALESCE(?, birth_date),
                 phone      = COALESCE(?, phone),
                 address    = COALESCE(?, address),
                 updated_at = NOW()
             WHERE id = ?`,
            [
                nik    || null,
                name   ? name.trim() : null,
                gender ? gender.toUpperCase() : null,
                birth_date || null,
                phone  !== undefined ? (phone || null) : null,
                address !== undefined ? (address || null) : null,
                id,
            ]
        );

        const [updated] = await pool.query(
            'SELECT * FROM patients WHERE id = ?',
            [id]
        );

        return sendSuccess(res, 'Data pasien berhasil diperbarui.', updated[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/patients/:id
 * Hanya ADMIN yang boleh menghapus (diatur di route).
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query(
            'SELECT id FROM patients WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return sendError(res, 'Pasien tidak ditemukan.', null, 404);
        }

        // Cek apakah pasien masih punya data terkait (registrations)
        const [registrations] = await pool.query(
            'SELECT id FROM registrations WHERE patient_id = ? LIMIT 1',
            [id]
        );
        if (registrations.length > 0) {
            return sendError(
                res,
                'Pasien tidak dapat dihapus karena memiliki riwayat pendaftaran.',
                null,
                409
            );
        }

        await pool.query('DELETE FROM patients WHERE id = ?', [id]);

        return sendSuccess(res, 'Data pasien berhasil dihapus.');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
