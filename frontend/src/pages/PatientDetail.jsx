import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Save, Trash2, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Patients.css';

const PatientDetail = () => {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const canManage = ['ADMIN', 'REGISTRATION_OFFICER'].includes(user?.role); const canDelete = user?.role === 'ADMIN';
  const [patient, setPatient] = useState(null); const [form, setForm] = useState(null); const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  useEffect(() => { (async () => { try { const response = await api.get(`/patients/${id}`); setPatient(response.data.data); setForm(response.data.data); } catch (err) { setError(err.response?.data?.message || 'Gagal mengambil detail pasien.'); } finally { setLoading(false); } })(); }, [id]);
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const response = await api.put(`/patients/${id}`, form); setPatient(response.data.data); setForm(response.data.data); setEditing(false); } catch (err) { setError(err.response?.data?.message || 'Gagal memperbarui data pasien.'); } finally { setSaving(false); } };
  const remove = async () => { if (!window.confirm('Hapus data pasien ini?')) return; try { await api.delete(`/patients/${id}`); navigate('/patients'); } catch (err) { setError(err.response?.data?.message || 'Pasien tidak dapat dihapus.'); } };

  if (loading) return <div className="patient-page"><div className="patient-state">Memuat detail pasien...</div></div>;
  if (!patient) return <div className="patient-page"><div className="patient-alert" role="alert">{error || 'Pasien tidak ditemukan.'}</div><Link className="back-link" to="/patients"><ArrowLeft size={16} /> Kembali ke Data Pasien</Link></div>;
  const fields = [['NIK', patient.nik], ['Jenis Kelamin', patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'], ['Tanggal Lahir', new Date(patient.birth_date).toLocaleDateString('id-ID')], ['Nomor Telepon', patient.phone || '-'], ['Alamat', patient.address || '-']];
  return <div className="patient-page patient-form-page"><Link className="back-link" to="/patients"><ArrowLeft size={16} /> Kembali ke Data Pasien</Link><div className="patient-header"><div><div className="eyebrow"><UserRound size={15} /> PROFIL PASIEN</div><h1>{patient.name}</h1><p className="medical-number">{patient.medical_record_number}</p></div><div className="detail-actions">{canManage && <button className="patient-secondary-btn" onClick={() => setEditing((current) => !current)}><Edit3 size={16} /> {editing ? 'Batal Edit' : 'Edit Data'}</button>}{canDelete && <button className="delete-btn" onClick={remove}><Trash2 size={16} /> Hapus</button>}</div></div>
    {error && <div className="patient-alert" role="alert">{error}</div>}
    {editing ? <form className="patient-form" onSubmit={save}><div className="form-section"><h2>Edit Data Pasien</h2><div className="form-grid"><label>NIK <span>*</span><input name="nik" value={form.nik} onChange={updateField} maxLength="16" required /></label><label>Nama Lengkap <span>*</span><input name="name" value={form.name} onChange={updateField} required /></label><label>Jenis Kelamin <span>*</span><select name="gender" value={form.gender} onChange={updateField} required><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label><label>Tanggal Lahir <span>*</span><input type="date" name="birth_date" value={String(form.birth_date).slice(0, 10)} onChange={updateField} required /></label><label>Nomor Telepon<input name="phone" value={form.phone || ''} onChange={updateField} /></label><label className="form-full">Alamat<textarea name="address" value={form.address || ''} onChange={updateField} rows="3" /></label></div></div><div className="form-actions"><button className="patient-primary-btn" disabled={saving}><Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div></form> : <div className="detail-panel"><div className="detail-hero"><span className="detail-avatar"><UserRound size={28} /></span><div><span className="detail-label">Nomor Rekam Medis</span><strong>{patient.medical_record_number}</strong></div></div><div className="detail-grid">{fields.map(([label, value]) => <div key={label} className="detail-item"><span>{label}</span><strong>{value}</strong></div>)}</div></div>}
  </div>;
};

export default PatientDetail;
