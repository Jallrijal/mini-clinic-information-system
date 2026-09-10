const { pool }                   = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Queue Controller
 * -----------------------------------------------------------------------
 * Implementasi penuh untuk Step 12 – Queue API
 *
 * Endpoint:
 *   GET  /api/queues              → getAll  (filter by date / status)
 *   POST /api/queues              → create  (generate nomor antrean manual)
 *   PUT  /api/queues/:id/call     → call    (panggil antrean → status CALLED)
 *   PUT  /api/queues/:id/status   → updateStatus (ubah status antrean)
 *
 * Status queue: WAITING → CALLED → DONE | SKIPPED
 * -----------------------------------------------------------------------
 */

/* ─────────────────────────────────────────────────────────────────────────
 *  Helper: generate nomor antrean otomatis untuk tanggal tertentu
 *  Format: A001, A002, …, A999
 * ───────────────────────────────────────────────────────────────────────── */
async function generateQueueNumber(conn, queueDate) {
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
        const lastNum = parseInt(rows[0].queue_number.replace(/\D/g, ''), 10);
        nextNum = lastNum + 1;
    }

    if (nextNum > 999) {
        throw new Error('Nomor antrean untuk hari ini sudah penuh (maksimal 999).');
    }

    return `A${String(nextNum).padStart(3, '0')}`;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Helper: ambil detail lengkap antrean beserta data relasi
 * ───────────────────────────────────────────────────────────────────────── */
async function fetchQueueDetail(db, queueId) {
    const [rows] = await db.query(
        `SELECT
            q.id,
            q.queue_number,
            q.queue_date,
            q.status,
            q.called_at,
            q.created_at,

            r.id                    AS registration_id,
            r.visit_date,
            r.payment_type,
            r.initial_complaint,
            r.status                AS registration_status,

            p.id                    AS patient_id,
            p.medical_record_number AS patient_mrn,
            p.name                  AS patient_name,
            p.gender                AS patient_gender,
            p.phone                 AS patient_phone,

            d.id                    AS doctor_id,
            d.name                  AS doctor_name,
            d.specialization        AS doctor_specialization,

            pol.id                  AS polyclinic_id,
            pol.name                AS polyclinic_name

         FROM queues q
         JOIN registrations r   ON r.id   = q.registration_id
         JOIN patients       p   ON p.id   = r.patient_id
         JOIN doctors        d   ON d.id   = r.doctor_id
         JOIN polyclinics    pol ON pol.id = r.polyclinic_id
         WHERE q.id = ?`,
        [queueId]
    );
    return rows[0] || null;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  GET /api/queues
 *  Query params: ?date=YYYY-MM-DD & status=WAITING & page=1 & limit=10
 *
 *  Menampilkan daftar antrean lengkap dengan join ke registrations,
 *  patients, doctors, polyclinics.
 * ───────────────────────────────────────────────────────────────────────── */
const getAll = async (req, res, next) => {
    try {
        const { date, status } = req.query;
        const page   = Math.max(1, parseInt(req.query.page)  || 1);
        const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const conditions = [];
        const params     = [];

        // Filter by date
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return sendError(res, 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.', { date: 'Format harus YYYY-MM-DD.' }, 422);
            }
            conditions.push('q.queue_date = ?');
            params.push(date);
        }

        // Filter by status
        const validStatuses = ['WAITING', 'CALLED', 'SKIPPED', 'DONE'];
        if (status) {
            const upperStatus = status.toUpperCase();
            if (!validStatuses.includes(upperStatus)) {
                return sendError(
                    res,
                    'Status tidak valid.',
                    { status: 'Gunakan WAITING, CALLED, SKIPPED, atau DONE.' },
                    422
                );
            }
            conditions.push('q.status = ?');
            params.push(upperStatus);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT
                q.id,
                q.queue_number,
                q.queue_date,
                q.status,
                q.called_at,
                q.created_at,

                r.id                    AS registration_id,
                r.visit_date,
                r.payment_type,
                r.initial_complaint,
                r.status                AS registration_status,

                p.id                    AS patient_id,
                p.medical_record_number AS patient_mrn,
                p.name                  AS patient_name,
                p.gender                AS patient_gender,
                p.phone                 AS patient_phone,

                d.id                    AS doctor_id,
                d.name                  AS doctor_name,
                d.specialization        AS doctor_specialization,

                pol.id                  AS polyclinic_id,
                pol.name                AS polyclinic_name

             FROM queues q
             JOIN registrations r   ON r.id   = q.registration_id
             JOIN patients       p   ON p.id   = r.patient_id
             JOIN doctors        d   ON d.id   = r.doctor_id
             JOIN polyclinics    pol ON pol.id = r.polyclinic_id
             ${whereClause}
             ORDER BY q.queue_number ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM queues q
             ${whereClause}`,
            params
        );

        return sendSuccess(res, 'Data antrean berhasil diambil.', {
            queues: rows,
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
 *  POST /api/queues
 *  Body: { registration_id, queue_date? }
 *
 *  Membuat nomor antrean baru secara manual untuk sebuah pendaftaran.
 *  (Normalnya antrean dibuat otomatis saat POST /registrations,
 *   endpoint ini untuk kasus override / tambah manual oleh admin.)
 *
 *  Validasi:
 *   - registration_id wajib ada & valid
 *   - Pendaftaran belum memiliki antrean
 *   - queue_date default ke visit_date pendaftaran
 * ───────────────────────────────────────────────────────────────────────── */
const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { registration_id, queue_date } = req.body;

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

        // --- Cek keberadaan pendaftaran ---
        const [regRows] = await conn.query(
            `SELECT r.id, r.visit_date, r.status
             FROM registrations r
             WHERE r.id = ?`,
            [registration_id]
        );
        if (regRows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Data pendaftaran tidak ditemukan.', { registration_id: 'Pendaftaran tidak ada.' }, 404);
        }

        const registration = regRows[0];

        // Pendaftaran COMPLETED tidak bisa di-queue lagi
        if (registration.status === 'COMPLETED') {
            await conn.rollback();
            return sendError(
                res,
                'Pendaftaran yang sudah selesai tidak dapat ditambahkan antrean.',
                null,
                409
            );
        }

        // --- Cek antrean sudah ada ---
        const [existingQueue] = await conn.query(
            'SELECT id, queue_number FROM queues WHERE registration_id = ? LIMIT 1',
            [registration_id]
        );
        if (existingQueue.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                `Pendaftaran ini sudah memiliki nomor antrean: ${existingQueue[0].queue_number}.`,
                { registration_id: 'Antrean sudah ada.' },
                409
            );
        }

        // --- Tentukan tanggal antrean ---
        const finalQueueDate = queue_date || registration.visit_date;
        if (queue_date && !/^\d{4}-\d{2}-\d{2}$/.test(queue_date)) {
            await conn.rollback();
            return sendError(res, 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.', { queue_date: 'Format harus YYYY-MM-DD.' }, 422);
        }

        // --- Generate nomor antrean ---
        const queueNumber = await generateQueueNumber(conn, finalQueueDate);

        // --- Insert ke tabel queues ---
        const [result] = await conn.query(
            `INSERT INTO queues (registration_id, queue_number, queue_date, status)
             VALUES (?, ?, ?, 'WAITING')`,
            [registration_id, queueNumber, finalQueueDate]
        );
        const newQueueId = result.insertId;

        await conn.commit();

        // --- Ambil data lengkap ---
        const queueDetail = await fetchQueueDetail(pool, newQueueId);

        return sendSuccess(res, 'Nomor antrean berhasil dibuat.', queueDetail, 201);
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  PUT /api/queues/:id/call
 *
 *  Memanggil pasien berdasarkan nomor antrean.
 *  - Status antrean berubah dari WAITING → CALLED
 *  - `called_at` diisi dengan timestamp sekarang
 *  - Hanya antrean berstatus WAITING yang bisa dipanggil
 * ───────────────────────────────────────────────────────────────────────── */
const call = async (req, res, next) => {
    try {
        const { id } = req.params;

        // --- Cek antrean ada ---
        const [rows] = await pool.query(
            'SELECT id, queue_number, status FROM queues WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return sendError(res, 'Data antrean tidak ditemukan.', null, 404);
        }

        const queue = rows[0];

        // --- Validasi status saat ini ---
        if (queue.status !== 'WAITING') {
            return sendError(
                res,
                `Antrean nomor ${queue.queue_number} tidak dapat dipanggil karena status saat ini adalah ${queue.status}.`,
                { status: 'Hanya antrean berstatus WAITING yang dapat dipanggil.' },
                422
            );
        }

        // --- Update status → CALLED + catat called_at ---
        await pool.query(
            `UPDATE queues
             SET status = 'CALLED', called_at = NOW()
             WHERE id = ?`,
            [id]
        );

        // --- Ambil data terbaru ---
        const queueDetail = await fetchQueueDetail(pool, id);

        return sendSuccess(res, `Antrean nomor ${queue.queue_number} berhasil dipanggil.`, queueDetail);
    } catch (err) {
        next(err);
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  PUT /api/queues/:id/status
 *  Body: { status }
 *
 *  Mengubah status antrean secara manual.
 *  Status yang valid: WAITING | CALLED | SKIPPED | DONE
 *
 *  Aturan transisi:
 *   WAITING  → CALLED | SKIPPED
 *   CALLED   → DONE   | SKIPPED
 *   SKIPPED  → WAITING (reaktivasi)
 *   DONE     → tidak bisa diubah (final)
 *
 *  Jika status → DONE, status registrasi terkait otomatis → COMPLETED
 *  Jika status → CALLED, catat called_at
 * ───────────────────────────────────────────────────────────────────────── */
const updateStatus = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { id }     = req.params;
        const { status } = req.body;

        // --- Validasi field status ---
        const validStatuses = ['WAITING', 'CALLED', 'SKIPPED', 'DONE'];
        if (!status) {
            await conn.rollback();
            return sendError(
                res,
                'Field status wajib diisi.',
                { status: 'Status tidak boleh kosong.' },
                422
            );
        }

        const newStatus = status.toUpperCase();
        if (!validStatuses.includes(newStatus)) {
            await conn.rollback();
            return sendError(
                res,
                'Status tidak valid.',
                { status: 'Gunakan WAITING, CALLED, SKIPPED, atau DONE.' },
                422
            );
        }

        // --- Cek antrean ada ---
        const [rows] = await conn.query(
            'SELECT id, queue_number, status, registration_id FROM queues WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return sendError(res, 'Data antrean tidak ditemukan.', null, 404);
        }

        const queue = rows[0];

        // --- Status DONE bersifat final ---
        if (queue.status === 'DONE') {
            await conn.rollback();
            return sendError(
                res,
                `Antrean nomor ${queue.queue_number} sudah selesai dan tidak dapat diubah.`,
                { status: 'Status DONE bersifat final.' },
                422
            );
        }

        // --- Validasi transisi status ---
        const allowedTransitions = {
            WAITING: ['CALLED', 'SKIPPED'],
            CALLED:  ['DONE', 'SKIPPED'],
            SKIPPED: ['WAITING'],
        };

        const allowed = allowedTransitions[queue.status] || [];
        if (!allowed.includes(newStatus)) {
            await conn.rollback();
            return sendError(
                res,
                `Transisi status dari ${queue.status} ke ${newStatus} tidak diizinkan.`,
                { status: `Dari ${queue.status} hanya bisa ke: ${allowed.join(', ')}.` },
                422
            );
        }

        // --- Build update fields ---
        let updateSql = 'UPDATE queues SET status = ?';
        const updateParams = [newStatus];

        // Catat called_at saat status → CALLED
        if (newStatus === 'CALLED') {
            updateSql += ', called_at = NOW()';
        }

        updateSql += ' WHERE id = ?';
        updateParams.push(id);

        await conn.query(updateSql, updateParams);

        // --- Sinkronisasi status registrasi jika diperlukan ---
        if (newStatus === 'DONE') {
            // Queue DONE → Registration COMPLETED
            await conn.query(
                `UPDATE registrations SET status = 'COMPLETED', updated_at = NOW()
                 WHERE id = ?`,
                [queue.registration_id]
            );
        } else if (newStatus === 'CALLED') {
            // Queue CALLED → Registration CHECKED_IN (jika masih WAITING)
            await conn.query(
                `UPDATE registrations SET status = 'CHECKED_IN', updated_at = NOW()
                 WHERE id = ? AND status = 'WAITING'`,
                [queue.registration_id]
            );
        }

        await conn.commit();

        // --- Ambil data terbaru ---
        const queueDetail = await fetchQueueDetail(pool, id);

        return sendSuccess(res, `Status antrean berhasil diperbarui menjadi ${newStatus}.`, queueDetail);
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, create, call, updateStatus };
