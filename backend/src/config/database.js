const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Database Connection Pool
 * -------------------------------------------------
 * Menggunakan connection pool (bukan single connection) agar
 * Express bisa menangani banyak request secara bersamaan
 * tanpa membuka/menutup koneksi baru setiap kali query.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mini_clinic',

  waitForConnections: true,   // tunggu di queue jika semua koneksi pool sedang dipakai
  connectionLimit: 10,        // maksimal 10 koneksi aktif secara bersamaan
  queueLimit: 0,               // 0 = tidak ada limit antrian request yang menunggu koneksi

  // Format tanggal dari MySQL langsung jadi string 'YYYY-MM-DD' (bukan Date object)
  // supaya lebih mudah dikonsumsi frontend
  dateStrings: true,
});

/**
 * Fungsi untuk mengetes koneksi ke database.
 * Dipanggil sekali saat aplikasi start (di server.js),
 * supaya kalau koneksi gagal, kita tahu dari awal sebelum server jalan.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release(); // kembalikan koneksi ke pool, jangan ditutup permanen
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1); // hentikan aplikasi jika database tidak bisa diakses
  }
}

module.exports = {
  pool,
  testConnection,
};