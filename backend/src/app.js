const express = require('express');
const cors    = require('cors');

const authRoutes          = require('./routes/authRoutes');
const patientRoutes       = require('./routes/patientRoutes');
const registrationRoutes  = require('./routes/registrationRoutes');
const queueRoutes         = require('./routes/queueRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const errorMiddleware     = require('./middleware/errorMiddleware');

const app = express();

// ── Global Middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
    });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/patients',       patientRoutes);
app.use('/api/registrations',  registrationRoutes);
app.use('/api/queues',         queueRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/dashboard',      dashboardRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} tidak ditemukan.` });
});

// ── Global Error Handler (HARUS di paling bawah) ──────────────────────────────
app.use(errorMiddleware);

module.exports = app;