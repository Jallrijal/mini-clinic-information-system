/**
 * Seeder Script - Buat default users dengan password hash bcrypt
 * ---------------------------------------------------------------
 * Jalankan: node src/seeders/userSeeder.js
 *
 * Akan membuat 3 user default:
 *   admin@clinic.com          → password: Admin@123   role: ADMIN
 *   budi.doctor@clinic.com    → password: Doctor@123  role: DOCTOR
 *   siti.officer@clinic.com   → password: Officer@123 role: REGISTRATION_OFFICER
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('../config/database');

const SALT_ROUNDS = 10;

const users = [
    {
        name:     'Administrator',
        email:    'admin@clinic.com',
        password: 'Admin@123',
        role:     'ADMIN',
    },
    {
        name:     'Dr. Budi Santoso',
        email:    'budi.doctor@clinic.com',
        password: 'Doctor@123',
        role:     'DOCTOR',
    },
    {
        name:     'Siti Petugas',
        email:    'siti.officer@clinic.com',
        password: 'Officer@123',
        role:     'REGISTRATION_OFFICER',
    },
];

const seed = async () => {
    await testConnection();

    console.log('\n📦 Memulai seeding users...\n');

    for (const user of users) {
        const hash = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Upsert: jika email sudah ada, update hash-nya
        await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name)`,
            [user.name, user.email, hash, user.role]
        );

        console.log(`✅ User seeded: ${user.email} | role: ${user.role} | password: ${user.password}`);
    }

    // Pastikan doctor record ada untuk Dr. Budi
    const [docUsers] = await pool.query("SELECT id FROM users WHERE email = 'budi.doctor@clinic.com'");
    const [polis]    = await pool.query("SELECT id FROM polyclinics WHERE name = 'Poli Umum'");

    if (docUsers.length > 0 && polis.length > 0) {
        await pool.query(
            `INSERT INTO doctors (user_id, name, specialization, polyclinic_id)
             VALUES (?, 'Dr. Budi Santoso', 'Dokter Umum', ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), specialization = VALUES(specialization)`,
            [docUsers[0].id, polis[0].id]
        );
        console.log('✅ Doctor record seeded: Dr. Budi Santoso');
    }

    console.log('\n🎉 Seeding selesai!\n');
    process.exit(0);
};

seed().catch((err) => {
    console.error('❌ Seeding gagal:', err.message);
    process.exit(1);
});
