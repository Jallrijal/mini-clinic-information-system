const { pool }                   = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Prescription Controller
 * -----------------------------------------------------------------------
 * Implementasi penuh untuk Step 13 – Medical Record API (Prescription)
 *
 * Endpoint:
 *   POST /api/prescriptions          → create  (buat resep untuk rekam medis)
 *   GET  /api/prescriptions/:id      → getById (detail resep beserta item obat)
 * -----------------------------------------------------------------------
 */

/* ─────────────────────────────────────────────────────────────────────────
 *  Helper: ambil detail lengkap satu resep beserta item obat & info pasien
 * ───────────────────────────────────────────────────────────────────────── */
async function fetchPrescriptionDetail(db, prescriptionId) {
    const [presRows] = await db.query(
        `SELECT
            pr.id,
            pr.medical_record_id,
            pr.created_at,

            mr.registration_id,
            mr.diagnosis,

            r.visit_date,

            p.id                    AS patient_id,
            p.medical_record_number AS patient_mrn,
            p.name                  AS patient_name,

            d.name                  AS doctor_name,
            d.specialization        AS doctor_specialization

         FROM prescriptions pr
         JOIN medical_records mr ON mr.id = pr.medical_record_id
         JOIN registrations   r  ON r.id  = mr.registration_id
         JOIN patients        p  ON p.id  = r.patient_id
         JOIN doctors         d  ON d.id  = mr.doctor_id
         WHERE pr.id = ?`,
        [prescriptionId]
    );

    if (!presRows[0]) return null;

    const [items] = await db.query(
        `SELECT id, medicine_name, dosage, frequency, instruction
         FROM prescription_items
         WHERE prescription_id = ?
         ORDER BY id ASC`,
        [prescriptionId]
    );

    return { ...presRows[0], items };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  POST /api/prescriptions
 *  Body:
 *  {
 *    medical_record_id : number  (wajib)
 *    items             : [       (wajib, minimal 1 item)
 *      {
 *        medicine_name : string  (wajib)
 *        dosage        : string  (opsional, cth: "500mg")
 *        frequency     : string  (opsional, cth: "3x sehari")
 *        instruction   : string  (opsional, cth: "setelah makan")
 *      }
 *    ]
 *  }
 *
 *  Validasi:
 *   - medical_record_id wajib ada & valid
 *   - Setiap rekam medis hanya boleh memiliki 1 resep (unik)
 *   - items wajib array dan minimal 1 item
 *   - Setiap item wajib memiliki medicine_name
 * ───────────────────────────────────────────────────────────────────────── */
const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { medical_record_id, items } = req.body;

        // --- Validasi field wajib ---
        const missingFields = [];
        if (!medical_record_id) missingFields.push('medical_record_id');
        if (!items || !Array.isArray(items) || items.length === 0) missingFields.push('items (minimal 1 item)');

        if (missingFields.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                'Field wajib tidak boleh kosong.',
                { required: missingFields },
                422
            );
        }

        // --- Validasi setiap item obat ---
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.medicine_name || String(item.medicine_name).trim() === '') {
                await conn.rollback();
                return sendError(
                    res,
                    `Item resep ke-${i + 1}: medicine_name wajib diisi.`,
                    { items: `Item ke-${i + 1} tidak memiliki medicine_name.` },
                    422
                );
            }
        }

        // --- Cek keberadaan rekam medis ---
        const [mrRows] = await conn.query(
            'SELECT id FROM medical_records WHERE id = ?',
            [medical_record_id]
        );
        if (mrRows.length === 0) {
            await conn.rollback();
            return sendError(
                res,
                'Data rekam medis tidak ditemukan.',
                { medical_record_id: 'Rekam medis tidak ada.' },
                404
            );
        }

        // --- Cek resep sudah ada untuk rekam medis ini ---
        const [existingPres] = await conn.query(
            'SELECT id FROM prescriptions WHERE medical_record_id = ? LIMIT 1',
            [medical_record_id]
        );
        if (existingPres.length > 0) {
            await conn.rollback();
            return sendError(
                res,
                'Rekam medis ini sudah memiliki resep. Tidak dapat membuat resep baru.',
                { medical_record_id: 'Resep sudah ada.' },
                409
            );
        }

        // --- Insert header resep ---
        const [presResult] = await conn.query(
            'INSERT INTO prescriptions (medical_record_id) VALUES (?)',
            [medical_record_id]
        );
        const newPrescriptionId = presResult.insertId;

        // --- Insert item-item obat ---
        const itemValues = items.map(item => [
            newPrescriptionId,
            String(item.medicine_name).trim(),
            item.dosage      || null,
            item.frequency   || null,
            item.instruction || null,
        ]);

        await conn.query(
            `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, instruction) VALUES ?`,
            [itemValues]
        );

        await conn.commit();

        // --- Ambil detail resep untuk response ---
        const detail = await fetchPrescriptionDetail(pool, newPrescriptionId);

        return sendSuccess(res, 'Resep berhasil dibuat.', detail, 201);
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/* ─────────────────────────────────────────────────────────────────────────
 *  GET /api/prescriptions/:id
 *
 *  Menampilkan detail resep beserta:
 *   - Daftar item obat (prescription_items)
 *   - Info rekam medis (diagnosis)
 *   - Info pasien & dokter
 * ───────────────────────────────────────────────────────────────────────── */
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const detail = await fetchPrescriptionDetail(pool, id);

        if (!detail) {
            return sendError(res, 'Data resep tidak ditemukan.', null, 404);
        }

        return sendSuccess(res, 'Detail resep berhasil diambil.', detail);
    } catch (err) {
        next(err);
    }
};

module.exports = { create, getById };
