import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import api from '../services/api';
import './Patients.css';

const initialForm = { nik: '', name: '', gender: '', birth_date: '', phone: '', address: '' };

const PatientCreate = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const response = await api.post('/patients', form);
      navigate(`/patients/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan data pasien.');
      setFieldErrors(err.response?.data?.errors || {});
    } finally { setSaving(false); }
  };

  return <div className="patient-page patient-form-page">
    <Link className="back-link" to="/patients"><ArrowLeft size={16} /> Kembali ke Data Pasien</Link>
    <div className="patient-header"><div><div className="eyebrow"><UserPlus size={15} /> DATA PASIEN</div><h1>Tambah Pasien</h1><p>Lengkapi data identitas pasien baru.</p></div></div>
    {error && <div className="patient-alert" role="alert">{error}</div>}
    <form className="patient-form" onSubmit={submit}>
      <div className="form-section"><h2>Identitas Pasien</h2><p>Nomor rekam medis dibuat otomatis setelah data tersimpan.</p><div className="form-grid">
        <label>NIK <span>*</span><input name="nik" value={form.nik} onChange={updateField} inputMode="numeric" maxLength="16" required placeholder="16 digit NIK" />{fieldErrors.nik && <small>{fieldErrors.nik}</small>}</label>
        <label>Nama Lengkap <span>*</span><input name="name" value={form.name} onChange={updateField} required placeholder="Nama sesuai identitas" />{fieldErrors.name && <small>{fieldErrors.name}</small>}</label>
        <label>Jenis Kelamin <span>*</span><select name="gender" value={form.gender} onChange={updateField} required><option value="">Pilih jenis kelamin</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label>
        <label>Tanggal Lahir <span>*</span><input type="date" name="birth_date" value={form.birth_date} onChange={updateField} required /></label>
        <label>Nomor Telepon<input name="phone" value={form.phone} onChange={updateField} inputMode="tel" placeholder="Contoh: 081234567890" /></label>
        <label className="form-full">Alamat<textarea name="address" value={form.address} onChange={updateField} rows="3" placeholder="Alamat tempat tinggal pasien" /></label>
      </div></div>
      <div className="form-actions"><Link className="patient-secondary-btn" to="/patients">Batal</Link><button className="patient-primary-btn" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pasien'}</button></div>
    </form>
  </div>;
};

export default PatientCreate;
