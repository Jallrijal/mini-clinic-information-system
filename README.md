#Author: Rijal Imamul Haq Syamsu Alam

# Mini Clinic Information System

Aplikasi web untuk mendukung administrasi klinik pratama: autentikasi berbasis JWT, data pasien, pendaftaran kunjungan, antrean, pemeriksaan SOAP, resep, dan dashboard.

## Teknologi

- Frontend: React.js, Vite, Axios, React Router
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JSON Web Token (JWT)
- Version control: Git

## Struktur Project

```text
backend/       REST API Express dan koneksi MySQL
frontend/      React SPA
database/      SQL schema dan seed data
docs/          laporan pengujian dan koleksi Postman
ERD.png        Entity Relationship Diagram
```

## Prasyarat

- Node.js 18 atau lebih baru
- MySQL 8 atau kompatibel
- npm

## Instalasi

1. Import schema dan seed data:

```bash
mysql -u root -p < database/mini_clinic_db.sql
```

Atau jalankan isi file `database/mini_clinic_db.sql` melalui MySQL client/phpMyAdmin.

2. Siapkan konfigurasi backend:

```bash
cd backend
copy .env.example .env
npm install
```

Edit `backend/.env` sesuai konfigurasi MySQL dan JWT lokal.

3. Siapkan konfigurasi frontend:

```bash
cd frontend
copy .env.example .env
npm install
```

## Menjalankan Aplikasi

Terminal backend:

```bash
cd backend
npm run dev
```

API tersedia di `http://localhost:5000/api`.

Terminal frontend:

```bash
cd frontend
npm run dev
```

Frontend tersedia di `http://localhost:5173`.

Health check: `GET http://localhost:5000/api/health`.

## Konfigurasi Environment

Backend menggunakan:

- `PORT`: port Express, default `5000`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: koneksi MySQL
- `JWT_SECRET`: secret untuk menandatangani JWT
- `JWT_EXPIRES_IN`: masa berlaku token, default `1d`

Frontend menggunakan `VITE_API_URL`, default `/api`. Saat frontend dan backend berjalan pada port terpisah, gunakan `VITE_API_URL=http://localhost:5000/api`.

Jangan commit file `.env`. Gunakan file `.env.example` sebagai template.

## Akun Demo

Password berikut berasal dari seed SQL:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@clinic.com` | `Admin@123` |
| Dokter | `budi.doctor@clinic.com` | `Doctor@123` |
| Petugas Pendaftaran | `siti.officer@clinic.com` | `Officer@123` |

Segera ganti kredensial demo untuk lingkungan selain development.

## Modul dan Endpoint

Semua endpoint selain login, logout, dan health check menggunakan header:

```text
Authorization: Bearer <JWT_TOKEN>
```

| Modul | Method | Endpoint | Akses utama |
|---|---|---|---|
| Auth | POST | `/api/auth/login` | publik |
| Auth | POST | `/api/auth/logout` | publik |
| Auth | GET | `/api/auth/me` | semua role |
| Patients | GET | `/api/patients` | semua role |
| Patients | GET | `/api/patients/:id` | semua role |
| Patients | POST | `/api/patients` | admin, petugas |
| Patients | PUT | `/api/patients/:id` | admin, petugas |
| Patients | DELETE | `/api/patients/:id` | admin |
| Registrations | GET | `/api/registrations` | semua role |
| Registrations | GET | `/api/registrations/options` | semua role |
| Registrations | GET | `/api/registrations/:id` | semua role |
| Registrations | POST | `/api/registrations` | admin, petugas |
| Registrations | PUT | `/api/registrations/:id` | admin, petugas |
| Queues | GET | `/api/queues` | semua role |
| Queues | POST | `/api/queues` | admin, petugas |
| Queues | PUT | `/api/queues/:id/call` | admin, petugas |
| Queues | PUT | `/api/queues/:id/status` | semua role sesuai transisi |
| Medical records | POST | `/api/medical-records` | dokter |
| Medical records | GET | `/api/medical-records/:patientId` | admin, dokter |
| Prescriptions | POST | `/api/prescriptions` | dokter |
| Prescriptions | GET | `/api/prescriptions/:id` | admin, dokter |
| Dashboard | GET | `/api/dashboard` | semua role |

List endpoint mendukung pagination dengan `page` dan `limit`. Pasien mendukung `search`; pendaftaran mendukung `date`, `status`; antrean mendukung `date`, `status`.

Response API menggunakan format konsisten:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

## Database dan ERD

Schema lengkap, foreign key, unique constraint, enum status, dan seed data tersedia di [database/mini_clinic_db.sql](database/mini_clinic_db.sql). Diagram relasi tersedia di [ERD.png](ERD.png).

Entitas utama: `users`, `patients`, `polyclinics`, `doctors`, `registrations`, `queues`, `medical_records`, `medical_actions`, `prescriptions`, dan `prescription_items`.

## Postman dan Testing

Import [docs/mini-clinic.postman_collection.json](docs/mini-clinic.postman_collection.json) ke Postman. Atur collection variable `baseUrl` bila port API berbeda. Request login menyimpan JWT otomatis ke variable `token`.

Automated API test:

```bash
cd backend
node src/test_api.js
```

Laporan hasil pengujian tersedia di [docs/API_TEST_REPORT.md](docs/API_TEST_REPORT.md). Pengujian terakhir mencatat 78 kasus lulus dengan pass rate 100%.

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Asumsi Proses Bisnis

- Membuat pendaftaran otomatis membuat nomor antrean untuk tanggal kunjungan.
- Nomor antrean memakai format `A001`, `A002`, dan seterusnya per tanggal.
- Status kunjungan hanya maju: `WAITING` -> `CHECKED_IN` -> `EXAMINATION` -> `COMPLETED`.
- Status antrean `DONE` otomatis menyelesaikan pendaftaran terkait.
- Logout JWT bersifat stateless; client menghapus token setelah endpoint logout dipanggil.
