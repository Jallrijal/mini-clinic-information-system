const { pool }                   = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Medical Record Controller
 * -----------------------------------------------------------------------
 * Implementasi penuh untuk Step 13 – Medical Record API
 *
 * Endpoint:
 *   POST /api/medical-records             → create  (buat rekam medis SOAP + tindakan medis)
 *   GET  /api/medical-records/:patientId  → getByPatient (riwayat pemeriksaan pasien)
 *
 * Relasi tabel:
 *   medical_records  → registration_id (1:1, unik per kunjungan)
 *   medical_actions  → medical_record_id (1:N, tindakan medis)
 *   prescriptions    → medical_record_id (1:1, resep terkait)
 *   prescription_items → prescription_id (1:N, item obat)
 * -----------------------------------------------------------------------
 */

/* ─────────────────────────────────────────────────────────────────────────
 *  Helper: ambil detail lengkap satu rekam medis beserta relasi
 * ───────────────────────────────────────────────────────────────────────── */
async function fetchMedicalRecordDetail(db, medicalRecordId) {
    // Rekam medis + data pasien, dokter, poli, registrasi
    const [mrRows] = await db.query(
        `SELECT
            mr.id,
            mr.registration_id,
            mr.doctor_id,
            mr.subjective,
            mr.blood_pressure,
            mr.body_temperature,
            mr.weight,
            mr.height,
            mr.diagnosis,
            mr.therapy_plan,
            mr.created_at,
            mr.updated_at,

            r.visit_date,
            r.payment_type,
            r.initial_complaint,
            r.status               AS registration_status,

            p.id                   AS patient_id,
            p.medical_record_number AS patient_mrn,
            p.name                 AS patient_name,
            p.gender               AS patient_gender,
            p.birth_date           AS patient_birth_date,
            p.phone                AS patient_phone,

            d.id                   AS doctor_id,
            d.name                 AS doctor_name,
            d.specialization       AS doctor_specialization,

            pol.id                 AS polyclinic_id,
            pol.name               AS polyclinic_name

         FROM medical_records mr
         JOIN registrations r   ON r.id   = mr.registration_id
         JOIN patients       p   ON p.id   = r.patient_id
         JOIN doctors        d   ON d.id   = mr.doctor_id
         JOIN polyclinics    pol ON pol.id = r.polyclinic_id
         WHERE mr.id = ?`,
        [medicalRecordId]
    );

    if (!mrRows[0]) return null;

    const record = mrRows[0];

    // Tindakan medis terkait
    const [actions] = await db.query(
        `SELECT id, action_name, description
         FROM medical_actions
         WHERE medical_record_id = ?
         ORDER BY id ASC`,
        [medicalRecordId]
    );

    // Resep terkait (jika ada)
    const [presRows] = await db.query(
        `SELECT id, created_at FROM prescriptions WHERE medical_record_id = ? LIMIT 1`,
        [medicalRecordId]
    );

    let prescription = null;
    if (presRows.length > 0) {
        const [items] = await db.query(
            `SELECT id, medicine_name, dosage, frequency, instruction
             FROM prescription_items
             WHERE prescription_id = ?
             ORDER BY id ASC`,
            [presRows[0].id]
        );
        prescription = { ...presRows[0], items };
    }

    return {
        ...record,
        medical_actions: actions,
        prescription,
    };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  POST /api/medical-records
 *  Body:
 *  {
 *    registration_id  : number  (wajib)
 *    subjective       : string  (keluhan pasien)
 *    blood_pressure   : string  (cth: "120/80")
 *    body_temperature : number  (cth: 36.5)
 *    weight           : number  (kg)
 *    height           : number  (cm)
 *    diagnosis        : string
 *    therapy_plan     : string
 *    medical_actions  : [{ action_name, description }]  (opsional)
 *  }
 *
 *  Validasi:
 *   - registration_id wajib ada & valid
 *   - Setiap registration hanya boleh memiliki 1 rekam medis (unik)
 *   - Doctor JWT harus sesuai dengan doctor yang menangani (doctor_id di registrasi)
 *   - Status registrasi diperbarui → EXAMINATION setelah rekam medis dibuat
 * ───────────────────────────────────────────────────────────────────────── */
const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            registration_id,
            subjective,
            blood_pressure,
            body_temperature,
            weight,
            height,
            diagnosis,
            therapy_plan,
            medical_actions,
        } = req.body;

        // --- Validasi field wajib ---
        if (!registration_id) {
            await conn.rollback();
            return sendError(
                res,
                'Field wajib tidak boleh kosong.',
                { required: ['registration_id'] },
                422
            );
        }

        // --- Cek keberadaan registrasi ---
        const [regRows] = await conn.query(
            `SELECT r.id, r.patient_id, r.doctor_id, r.polyclinic_id, r.status
             FROM registrations r
             WHERE r.id = ?`,
            [registration_id]
        );
        if (regRows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Data pendaftaran tidak ditemukan.', { registration_id: 'Pendaftaran tidak ditemukan.' }, 404);
        }

        const registration = regRows[0];

        // --- Cek status registrasi (hanya yang aktif bisa diisi rekam medis) ---
        if (registration.status === 'COMPLETED') {
            await conn.rollback();
            return sendError(
                res,
                'Pendaftaran sudah selesai. Tidak dapat menambahkan rekam medis.',
                { registration_id: 'Status pendaftaran sudah COMPLETED.' },
                409
            );
        }

        // --- Cek rekam medis sudah ada untuk registrasi ini ---
        const [existingMR] = await conn.query(
            'SELECT id FROM medical_records WHERE registration_id = ? LIMIT 1',
            [registration_id]
        );
        if (existingMR.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                'Rekam medis untuk pendaftaran ini sudah ada. Gunakan endpoint update jika perlu mengubah.',
                { registration_id: 'Rekam medis sudah ada.' },
                409
            );
        }

        // --- Tentukan doctor_id: ambil dari JWT user yang login (jika role DOCTOR) ---
        // Jika user adalah DOCTOR, cari doctor_id berdasarkan user_id dari token
        let doctorId = registration.doctor_id; // default: dokter yang terdaftar di pendaftaran

        if (req.user.role === 'DOCTOR') {
            const [docRows] = await conn.query(
                'SELECT id FROM doctors WHERE user_id = ?',
                [req.user.id]
            );
            if (docRows.length > 0) {
                doctorId = docRows[0].id;
            }
        }

        // --- Insert rekam medis ---
        const [mrResult] = await conn.query(
            `INSERT INTO medical_records
                (registration_id, doctor_id, subjective, blood_pressure, body_temperature, weight, height, diagnosis, therapy_plan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                registration_id,
                doctorId,
                subjective       || null,
                blood_pressure   || null,
                body_temperature || null,
                weight           || null,
                height           || null,
                diagnosis        || null,
                therapy_plan     || null,
            ]
        );
        const newMrId = mrResult.insertId;

        // --- Insert tindakan medis (jika ada) ---
        if (Array.isArray(medical_actions) && medical_actions.length > 0) {
            // Validasi setiap tindakan
            for (let i = 0; i < medical_actions.length; i++) {
                const action = medical_actions[i];
                if (!action.action_name || String(action.action_name).trim() === '') {
                    await conn.rollback();
                    return sendError(
                        res,
                        `Tindakan medis ke-${i + 1}: action_name wajib diisi.`,
                        { medical_actions: `Item ke-${i + 1} tidak memiliki action_name.` },
                        422
                    );
                }
            }

            const actionValues = medical_actions.map(a => [
                newMrId,
                String(a.action_name).trim(),
                a.description || null,
            ]);

            await conn.query(
                `INSERT INTO medical_actions (medical_record_id, action_name, description) VALUES ?`,
                [actionValues]
            );
        }

        // --- Update status registrasi → EXAMINATION ---
        await conn.query(
            `UPDATE registrations SET status = 'EXAMINATION', updated_at = NOW() WHERE id = ?`,
            [registration_id]
        );

        await conn.commit();

        // --- Ambil data lengkap untuk response ---
        const detail = await fetchMedicalRecordDetail(pool, newMrId);

        return sendSuccess(res, 'Rekam medis berhasil dibuat.', detail, 201);
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  GET /api/medical-records/:patientId
 *  Query params: ?page=1 & limit=10
 *
 *  Menampilkan seluruh riwayat rekam medis untuk pasien tertentu,
 *  diurutkan dari yang terbaru.
 *  Setiap rekam medis menyertakan:
 *   - data SOAP
 *   - tindakan medis
 *   - resep (jika ada)
 *   - info registrasi, dokter, poli
 * ───────────────────────────────────────────────────────────────────────── */
const getByPatient = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // --- Cek pasien ada ---
        const [patRows] = await pool.query(
            'SELECT id, name, medical_record_number FROM patients WHERE id = ?',
            [patientId]
        );
        if (patRows.length === 0) {
            return sendError(res, 'Data pasien tidak ditemukan.', null, 404);
        }

        // --- Ambil daftar rekam medis pasien ---
        const [mrRows] = await pool.query(
            `SELECT
                mr.id,
                mr.registration_id,
                mr.subjective,
                mr.blood_pressure,
                mr.body_temperature,
                mr.weight,
                mr.height,
                mr.diagnosis,
                mr.therapy_plan,
                mr.created_at,

                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status               AS registration_status,

                d.name                 AS doctor_name,
                d.specialization       AS doctor_specialization,

                pol.name               AS polyclinic_name

             FROM medical_records mr
             JOIN registrations r   ON r.id   = mr.registration_id
             JOIN doctors        d   ON d.id   = mr.doctor_id
             JOIN polyclinics    pol ON pol.id = r.polyclinic_id
             WHERE r.patient_id = ?
             ORDER BY mr.created_at DESC
             LIMIT ? OFFSET ?`,
            [patientId, limit, offset]
        );

        // --- Hitung total ---
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM medical_records mr
             JOIN registrations r ON r.id = mr.registration_id
             WHERE r.patient_id = ?`,
            [patientId]
        );

        // --- Untuk setiap rekam medis, ambil tindakan & resep ---
        const enriched = await Promise.all(
            mrRows.map(async (mr) => {
                const [actions] = await pool.query(
                    `SELECT id, action_name, description
                     FROM medical_actions
                     WHERE medical_record_id = ?
                     ORDER BY id ASC`,
                    [mr.id]
                );

                const [presRows] = await pool.query(
                    `SELECT id, created_at FROM prescriptions WHERE medical_record_id = ? LIMIT 1`,
                    [mr.id]
                );

                let prescription = null;
                if (presRows.length > 0) {
                    const [items] = await pool.query(
                        `SELECT id, medicine_name, dosage, frequency, instruction
                         FROM prescription_items
                         WHERE prescription_id = ?
                         ORDER BY id ASC`,
                        [presRows[0].id]
                    );
                    prescription = { ...presRows[0], items };
                }

                return {
                    ...mr,
                    medical_actions: actions,
                    prescription,
                };
            })
        );

        return sendSuccess(res, 'Riwayat rekam medis berhasil diambil.', {
            patient: patRows[0],
            medical_records: enriched,
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

module.exports = { create, getByPatient };
