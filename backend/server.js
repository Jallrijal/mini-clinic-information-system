require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
    // Pastikan database bisa diakses sebelum server mulai menerima request
    await testConnection();

    app.listen(PORT, () => {
        console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    });
};

start();