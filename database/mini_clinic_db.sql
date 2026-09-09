-- =====================================================================
-- Mini Clinic Information System - Database Schema (MySQL)
-- =====================================================================
-- Sesuai dengan database_plan.md dan Technical Assignment Programmer Nexa
-- Storage Engine: InnoDB (untuk mendukung Foreign Key & Transaction)
-- Charset: utf8mb4
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS mini_clinic
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mini_clinic;

-- =====================================================================
-- Step 3.2 - Tabel users
-- =====================================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)    NOT NULL,
    email       VARCHAR(150)    NOT NULL,
    password    VARCHAR(255)    NOT NULL,               -- password hash (bcrypt)
    role        ENUM('ADMIN', 'DOCTOR', 'REGISTRATION_OFFICER') NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.3 - Tabel patients
-- =====================================================================
DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medical_record_number   VARCHAR(20)     NOT NULL,   -- auto generate, cth: MR000001
    nik                     VARCHAR(16)     NOT NULL,
    name                    VARCHAR(150)    NOT NULL,
    gender                  ENUM('MALE', 'FEMALE')  NOT NULL,
    birth_date              DATE            NOT NULL,
    phone                   VARCHAR(20)     NULL,
    address                 TEXT            NULL,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_patients_nik UNIQUE (nik),
    CONSTRAINT uq_patients_mrn UNIQUE (medical_record_number)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.4 - Tabel polyclinics (Poli)
-- =====================================================================
DROP TABLE IF EXISTS polyclinics;
CREATE TABLE polyclinics (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL,               -- Poli Umum, Poli Gigi, Poli Anak
    description VARCHAR(255)    NULL,

    CONSTRAINT uq_polyclinics_name UNIQUE (name)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.5 - Tabel doctors
-- =====================================================================
DROP TABLE IF EXISTS doctors;
CREATE TABLE doctors (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED    NOT NULL,
    name            VARCHAR(150)    NOT NULL,
    specialization  VARCHAR(100)    NULL,
    polyclinic_id   INT UNSIGNED    NOT NULL,

    CONSTRAINT fk_doctors_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_doctors_polyclinic
        FOREIGN KEY (polyclinic_id) REFERENCES polyclinics(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_doctors_user_id UNIQUE (user_id)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.6 - Tabel registrations (Pendaftaran)
-- =====================================================================
DROP TABLE IF EXISTS registrations;
CREATE TABLE registrations (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT UNSIGNED    NOT NULL,
    doctor_id           INT UNSIGNED    NOT NULL,
    polyclinic_id       INT UNSIGNED    NOT NULL,
    visit_date          DATE            NOT NULL,
    payment_type        ENUM('CASH', 'INSURANCE', 'BPJS') NOT NULL DEFAULT 'CASH',
    initial_complaint   TEXT            NULL,
    status              ENUM('WAITING', 'CHECKED_IN', 'EXAMINATION', 'COMPLETED')
                                        NOT NULL DEFAULT 'WAITING',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_registrations_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_registrations_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_registrations_polyclinic
        FOREIGN KEY (polyclinic_id) REFERENCES polyclinics(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    INDEX idx_registrations_visit_date (visit_date),
    INDEX idx_registrations_status (status)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.7 - Tabel queues (Antrean)
-- =====================================================================
DROP TABLE IF EXISTS queues;
CREATE TABLE queues (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    registration_id INT UNSIGNED    NOT NULL,
    queue_number    VARCHAR(10)     NOT NULL,           -- cth: A001, A002
    queue_date      DATE            NOT NULL,
    status          ENUM('WAITING', 'CALLED', 'SKIPPED', 'DONE')
                                    NOT NULL DEFAULT 'WAITING',
    called_at       TIMESTAMP       NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_queues_registration
        FOREIGN KEY (registration_id) REFERENCES registrations(id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT uq_queues_number_date UNIQUE (queue_number, queue_date),

    INDEX idx_queues_date_status (queue_date, status)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.8 - Tabel medical_records (SOAP)
-- =====================================================================
DROP TABLE IF EXISTS medical_records;
CREATE TABLE medical_records (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    registration_id     INT UNSIGNED    NOT NULL,
    doctor_id           INT UNSIGNED    NOT NULL,

    -- Subjective
    subjective          TEXT            NULL,           -- keluhan pasien

    -- Objective
    blood_pressure      VARCHAR(20)     NULL,           -- cth: 120/80
    body_temperature    DECIMAL(4,1)    NULL,           -- cth: 36.5
    weight              DECIMAL(5,2)    NULL,           -- kg
    height              DECIMAL(5,2)    NULL,           -- cm

    -- Assessment
    diagnosis           TEXT            NULL,

    -- Plan
    therapy_plan        TEXT            NULL,

    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_medical_records_registration
        FOREIGN KEY (registration_id) REFERENCES registrations(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_medical_records_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_medical_records_registration UNIQUE (registration_id)
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.9 - Tabel medical_actions (Tindakan Medis)
-- =====================================================================
DROP TABLE IF EXISTS medical_actions;
CREATE TABLE medical_actions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medical_record_id   INT UNSIGNED    NOT NULL,
    action_name         VARCHAR(150)    NOT NULL,
    description          TEXT            NULL,

    CONSTRAINT fk_medical_actions_record
        FOREIGN KEY (medical_record_id) REFERENCES medical_records(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.10 - Tabel prescriptions (Resep)
-- =====================================================================
DROP TABLE IF EXISTS prescriptions;
CREATE TABLE prescriptions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medical_record_id   INT UNSIGNED    NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prescriptions_record
        FOREIGN KEY (medical_record_id) REFERENCES medical_records(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

-- =====================================================================
-- Step 3.11 - Tabel prescription_items (Item Resep Obat)
-- =====================================================================
DROP TABLE IF EXISTS prescription_items;
CREATE TABLE prescription_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT UNSIGNED    NOT NULL,
    medicine_name   VARCHAR(150)    NOT NULL,
    dosage          VARCHAR(50)     NULL,               -- cth: 500mg
    frequency       VARCHAR(50)     NULL,               -- cth: 3x sehari
    instruction     VARCHAR(255)    NULL,               -- cth: setelah makan

    CONSTRAINT fk_prescription_items_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SEED DATA (opsional, untuk testing)
-- =====================================================================

-- Default users
-- Password default untuk semua: "password123" (WAJIB di-hash ulang dengan bcrypt di aplikasi,
-- hash di bawah hanya contoh placeholder — GANTI dengan hash asli dari bcrypt saat seeding via aplikasi)
INSERT INTO users (name, email, password, role) VALUES
('Administrator', 'admin@clinic.com', '$2b$10$replace_with_real_bcrypt_hash', 'ADMIN'),
('Dr. Budi Santoso', 'budi.doctor@clinic.com', '$2b$10$replace_with_real_bcrypt_hash', 'DOCTOR'),
('Siti Petugas', 'siti.officer@clinic.com', '$2b$10$replace_with_real_bcrypt_hash', 'REGISTRATION_OFFICER');

-- Default polyclinics
INSERT INTO polyclinics (name, description) VALUES
('Poli Umum', 'Pelayanan kesehatan umum'),
('Poli Gigi', 'Pelayanan kesehatan gigi dan mulut'),
('Poli Anak', 'Pelayanan kesehatan khusus anak');

-- Default doctor (terhubung ke user id 2)
INSERT INTO doctors (user_id, name, specialization, polyclinic_id) VALUES
(2, 'Dr. Budi Santoso', 'Dokter Umum', 1);
