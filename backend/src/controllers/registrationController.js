const { pool }                   = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Registration Controller
 * -----------------------------------------------------------------------
 * Implementasi penuh untuk Step 11 – Registration API
 *
 * Endpoint:
 *   GET  /api/registrations          → getAll  (filter by date / status + pagination)
 *   GET  /api/registrations/:id      → getById
 *   POST /api/registrations          → create  (buat pendaftaran + generate nomor antrean)
 *   PUT  /api/registrations/:id      → update  (ubah data / status kunjungan)
 *
 * Status kunjungan: WAITING → CHECKED_IN → EXAMINATION → COMPLETED
 * Payment type    : CASH | INSURANCE | BPJS
 * -----------------------------------------------------------------------
 */

/* ─────────────────────────────────────────────────────────────────────────
 *  Helper: generate nomor antrean otomatis untuk tanggal tertentu
 *  Format: A001, A002, …, A999
 * ───────────────────────────────────────────────────────────────────────── */
async function generateQueueNumber(conn, queueDate) {
    // Ambil nomor antrean terakhir untuk tanggal tersebut
    const [rows] = await conn.query(
        `SELECT queue_number
         FROM queues
         WHERE queue_date = ?
         ORDER BY queue_number DESC
         LIMIT 1`,
        [queueDate]
    );

    let nextNum = 1;
    if (rows.length > 0) {
        // Ekstrak angka dari 'A001' → 1, lalu tambah 1
        const lastNum = parseInt(rows[0].queue_number.replace(/\D/g, ''), 10);
        nextNum = lastNum + 1;
    }

    if (nextNum > 999) {
        throw new Error('Nomor antrean untuk hari ini sudah penuh (maksimal 999).');
    }

    // Format: A001, A002, …
    return `A${String(nextNum).padStart(3, '0')}`;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  GET /api/registrations
 *  Query params: ?date=YYYY-MM-DD & status=WAITING & page=1 & limit=10
 * ───────────────────────────────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
    try {
        const { date, status } = req.query;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const conditions = [];
        const params     = [];

        if (date) {
            conditions.push('r.visit_date = ?');
            params.push(date);
        }

        const validStatuses = ['WAITING', 'CHECKED_IN', 'EXAMINATION', 'COMPLETED'];
        if (status && validStatuses.includes(status.toUpperCase())) {
            conditions.push('r.status = ?');
            params.push(status.toUpperCase());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT
                r.id,
                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status,
                r.created_at,
                r.updated_at,

                -- Pasien
                p.id                    AS patient_id,
                p.medical_record_number AS patient_mrn,
                p.name                  AS patient_name,
                p.gender                AS patient_gender,
                p.phone                 AS patient_phone,

                -- Dokter
                d.id                    AS doctor_id,
                d.name                  AS doctor_name,
                d.specialization        AS doctor_specialization,

                -- Poli
                pol.id                  AS polyclinic_id,
                pol.name                AS polyclinic_name,

                -- Nomor antrean (jika sudah ada)
                q.id                    AS queue_id,
                q.queue_number,
                q.status                AS queue_status

             FROM registrations r
             JOIN patients    p   ON p.id   = r.patient_id
             JOIN doctors     d   ON d.id   = r.doctor_id
             JOIN polyclinics pol ON pol.id = r.polyclinic_id
             LEFT JOIN queues q   ON q.registration_id = r.id
             ${whereClause}
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM registrations r
             ${whereClause}`,
            params
        );

        return sendSuccess(res, 'Data pendaftaran berhasil diambil.', {
            registrations: rows,
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

/* ─────────────────────────────────────────────────────────────────────────
 *  GET /api/registrations/:id
 * ───────────────────────────────────────────────────────────────────────── */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT
                r.id,
                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status,
                r.created_at,
                r.updated_at,

                p.id                    AS patient_id,
                p.medical_record_number AS patient_mrn,
                p.name                  AS patient_name,
                p.nik                   AS patient_nik,
                p.gender                AS patient_gender,
                p.birth_date            AS patient_birth_date,
                p.phone                 AS patient_phone,
                p.address               AS patient_address,

                d.id                    AS doctor_id,
                d.name                  AS doctor_name,
                d.specialization        AS doctor_specialization,

                pol.id                  AS polyclinic_id,
                pol.name                AS polyclinic_name,

                q.id                    AS queue_id,
                q.queue_number,
                q.queue_date,
                q.status                AS queue_status,
                q.called_at             AS queue_called_at

             FROM registrations r
             JOIN patients    p   ON p.id   = r.patient_id
             JOIN doctors     d   ON d.id   = r.doctor_id
             JOIN polyclinics pol ON pol.id = r.polyclinic_id
             LEFT JOIN queues q   ON q.registration_id = r.id
             WHERE r.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return sendError(res, 'Data pendaftaran tidak ditemukan.', null, 404);
        }

        return sendSuccess(res, 'Data pendaftaran berhasil diambil.', rows[0]);
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  POST /api/registrations
 *  Body: { patient_id, doctor_id, polyclinic_id, visit_date,
 *          payment_type, initial_complaint }
 *
 *  Alur:
 *    1. Validasi field wajib
 *    2. Validasi keberadaan patient, doctor, polyclinic
 *    3. Cegah pendaftaran ganda (pasien + dokter + tanggal yang sama)
 *    4. Buat record di tabel registrations
 *    5. Auto-generate nomor antrean dan buat record di tabel queues
 *    6. Return data pendaftaran + antrean
 * ───────────────────────────────────────────────────────────────────────── */
const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            patient_id,
            doctor_id,
            polyclinic_id,
            visit_date,
            payment_type    = 'CASH',
            initial_complaint,
        } = req.body;

        // --- Validasi field wajib ---
        const missingFields = [];
        if (!patient_id)    missingFields.push('patient_id');
        if (!doctor_id)     missingFields.push('doctor_id');
        if (!polyclinic_id) missingFields.push('polyclinic_id');
        if (!visit_date)    missingFields.push('visit_date');

        if (missingFields.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                'Field wajib tidak boleh kosong.',
                { required: missingFields },
                422
            );
        }

        // --- Validasi payment_type ---
        const validPaymentTypes = ['CASH', 'INSURANCE', 'BPJS'];
        if (!validPaymentTypes.includes(payment_type.toUpperCase())) {
            await conn.rollback();
            return sendError(
                res,
                'Jenis pembayaran tidak valid. Gunakan CASH, INSURANCE, atau BPJS.',
                { payment_type: 'Harus CASH, INSURANCE, atau BPJS.' },
                422
            );
        }

        // --- Validasi format tanggal ---
        if (!/^\d{4}-\d{2}-\d{2}$/.test(visit_date)) {
            await conn.rollback();
            return sendError(
                res,
                'Format tanggal tidak valid. Gunakan YYYY-MM-DD.',
                { visit_date: 'Format harus YYYY-MM-DD.' },
                422
            );
        }

        // --- Cek keberadaan patient ---
        const [patientRows] = await conn.query(
            'SELECT id, name FROM patients WHERE id = ?',
            [patient_id]
        );
        if (patientRows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Pasien tidak ditemukan.', { patient_id: 'Pasien tidak ada.' }, 404);
        }

        // --- Cek keberadaan doctor ---
        const [doctorRows] = await conn.query(
            'SELECT id, name FROM doctors WHERE id = ?',
            [doctor_id]
        );
        if (doctorRows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Dokter tidak ditemukan.', { doctor_id: 'Dokter tidak ada.' }, 404);
        }

        // --- Cek keberadaan polyclinic ---
        const [poliRows] = await conn.query(
            'SELECT id FROM polyclinics WHERE id = ?',
            [polyclinic_id]
        );
        if (poliRows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Poli tidak ditemukan.', { polyclinic_id: 'Poli tidak ada.' }, 404);
        }

        // --- Cegah pendaftaran ganda (pasien + dokter + tanggal) ---
        const [duplicate] = await conn.query(
            `SELECT id FROM registrations
             WHERE patient_id = ? AND doctor_id = ? AND visit_date = ?
             LIMIT 1`,
            [patient_id, doctor_id, visit_date]
        );
        if (duplicate.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                'Pasien sudah terdaftar pada dokter dan tanggal yang sama.',
                null,
                409
            );
        }

        // --- Buat record pendaftaran ---
        const [regResult] = await conn.query(
            `INSERT INTO registrations
                (patient_id, doctor_id, polyclinic_id, visit_date, payment_type, initial_complaint, status)
             VALUES (?, ?, ?, ?, ?, ?, 'WAITING')`,
            [
                patient_id,
                doctor_id,
                polyclinic_id,
                visit_date,
                payment_type.toUpperCase(),
                initial_complaint || null,
            ]
        );
        const registrationId = regResult.insertId;

        // --- Generate nomor antrean otomatis ---
        const queueNumber = await generateQueueNumber(conn, visit_date);

        const [queueResult] = await conn.query(
            `INSERT INTO queues (registration_id, queue_number, queue_date, status)
             VALUES (?, ?, ?, 'WAITING')`,
            [registrationId, queueNumber, visit_date]
        );
        const queueId = queueResult.insertId;

        await conn.commit();

        // --- Ambil data lengkap untuk response ---
        const [newReg] = await pool.query(
            `SELECT
                r.id,
                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status,
                r.created_at,

                p.id   AS patient_id,
                p.medical_record_number AS patient_mrn,
                p.name AS patient_name,

                d.id   AS doctor_id,
                d.name AS doctor_name,

                pol.id   AS polyclinic_id,
                pol.name AS polyclinic_name,

                q.id           AS queue_id,
                q.queue_number,
                q.status       AS queue_status

             FROM registrations r
             JOIN patients    p   ON p.id   = r.patient_id
             JOIN doctors     d   ON d.id   = r.doctor_id
             JOIN polyclinics pol ON pol.id = r.polyclinic_id
             LEFT JOIN queues q   ON q.registration_id = r.id
             WHERE r.id = ?`,
            [registrationId]
        );

        return sendSuccess(res, 'Pendaftaran berhasil dibuat.', newReg[0], 201);
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  PUT /api/registrations/:id
 *  Body (semua opsional):
 *    { payment_type, initial_complaint, status,
 *      doctor_id, polyclinic_id, visit_date }
 *
 *  Aturan transisi status:
 *    WAITING → CHECKED_IN → EXAMINATION → COMPLETED
 *  (hanya boleh maju, tidak boleh mundur)
 * ───────────────────────────────────────────────────────────────────────── */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            payment_type,
            initial_complaint,
            status,
            doctor_id,
            polyclinic_id,
            visit_date,
        } = req.body;

        // --- Cek pendaftaran ada ---
        const [existing] = await pool.query(
            'SELECT id, status FROM registrations WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return sendError(res, 'Data pendaftaran tidak ditemukan.', null, 404);
        }

        const currentStatus = existing[0].status;

        // --- Validasi transisi status ---
        const statusOrder = ['WAITING', 'CHECKED_IN', 'EXAMINATION', 'COMPLETED'];
        if (status) {
            const newStatus = status.toUpperCase();
            if (!statusOrder.includes(newStatus)) {
                return sendError(
                    res,
                    'Status tidak valid.',
                    { status: 'Gunakan WAITING, CHECKED_IN, EXAMINATION, atau COMPLETED.' },
                    422
                );
            }

            const currentIdx = statusOrder.indexOf(currentStatus);
            const newIdx     = statusOrder.indexOf(newStatus);

            if (newIdx < currentIdx) {
                return sendError(
                    res,
                    `Status tidak dapat dikembalikan dari ${currentStatus} ke ${newStatus}.`,
                    { status: 'Status hanya bisa maju.' },
                    422
                );
            }
        }

        // --- Validasi payment_type jika dikirim ---
        const validPaymentTypes = ['CASH', 'INSURANCE', 'BPJS'];
        if (payment_type && !validPaymentTypes.includes(payment_type.toUpperCase())) {
            return sendError(
                res,
                'Jenis pembayaran tidak valid.',
                { payment_type: 'Harus CASH, INSURANCE, atau BPJS.' },
                422
            );
        }

        // --- Validasi doctor_id jika dikirim ---
        if (doctor_id) {
            const [docCheck] = await pool.query('SELECT id FROM doctors WHERE id = ?', [doctor_id]);
            if (docCheck.length === 0) {
                return sendError(res, 'Dokter tidak ditemukan.', { doctor_id: 'Dokter tidak ada.' }, 404);
            }
        }

        // --- Validasi polyclinic_id jika dikirim ---
        if (polyclinic_id) {
            const [poliCheck] = await pool.query('SELECT id FROM polyclinics WHERE id = ?', [polyclinic_id]);
            if (poliCheck.length === 0) {
                return sendError(res, 'Poli tidak ditemukan.', { polyclinic_id: 'Poli tidak ada.' }, 404);
            }
        }

        await pool.query(
            `UPDATE registrations
             SET
                payment_type      = COALESCE(?, payment_type),
                initial_complaint = COALESCE(?, initial_complaint),
                status            = COALESCE(?, status),
                doctor_id         = COALESCE(?, doctor_id),
                polyclinic_id     = COALESCE(?, polyclinic_id),
                visit_date        = COALESCE(?, visit_date),
                updated_at        = NOW()
             WHERE id = ?`,
            [
                payment_type    ? payment_type.toUpperCase() : null,
                initial_complaint !== undefined ? (initial_complaint || null) : null,
                status          ? status.toUpperCase() : null,
                doctor_id       || null,
                polyclinic_id   || null,
                visit_date      || null,
                id,
            ]
        );

        // --- Ambil data terbaru ---
        const [updated] = await pool.query(
            `SELECT
                r.id,
                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status,
                r.created_at,
                r.updated_at,

                p.id   AS patient_id,
                p.medical_record_number AS patient_mrn,
                p.name AS patient_name,

                d.id   AS doctor_id,
                d.name AS doctor_name,

                pol.id   AS polyclinic_id,
                pol.name AS polyclinic_name,

                q.id           AS queue_id,
                q.queue_number,
                q.status       AS queue_status

             FROM registrations r
             JOIN patients    p   ON p.id   = r.patient_id
             JOIN doctors     d   ON d.id   = r.doctor_id
             JOIN polyclinics pol ON pol.id = r.polyclinic_id
             LEFT JOIN queues q   ON q.registration_id = r.id
             WHERE r.id = ?`,
            [id]
        );

        return sendSuccess(res, 'Data pendaftaran berhasil diperbarui.', updated[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update };
