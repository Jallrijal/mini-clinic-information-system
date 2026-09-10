/**
 * generateMedicalRecordNumber
 * -------------------------------------------------
 * Menghasilkan nomor rekam medis berikutnya secara otomatis.
 * Format : RM + 6 digit angka (RM000001, RM000002, dst.)
 *
 * Cara kerja:
 *   1. Query nilai MAX dari kolom medical_record_number di tabel patients.
 *   2. Ambil bagian numeriknya (substr setelah "RM").
 *   3. Tambah 1, lalu pad kiri dengan "0" sampai 6 digit.
 *
 * @param {import('mysql2/promise').Pool} pool - MySQL connection pool
 * @returns {Promise<string>}  cth: "RM000001"
 */
async function generateMedicalRecordNumber(pool) {
    const [[{ maxNo }]] = await pool.query(
        `SELECT MAX(CAST(SUBSTRING(medical_record_number, 3) AS UNSIGNED)) AS maxNo
         FROM patients`
    );

    const nextNo = (maxNo || 0) + 1;
    return `RM${String(nextNo).padStart(6, '0')}`;
}

module.exports = { generateMedicalRecordNumber };
