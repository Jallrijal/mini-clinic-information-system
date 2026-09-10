import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardPlus, Plus, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Registrations.css';

const statusLabels = { WAITING: 'Menunggu', CHECKED_IN: 'Check In', EXAMINATION: 'Pemeriksaan', COMPLETED: 'Selesai' };
const paymentLabels = { CASH: 'Tunai', INSURANCE: 'Asuransi', BPJS: 'BPJS' };
const statusOrder = ['WAITING', 'CHECKED_IN', 'EXAMINATION', 'COMPLETED'];
const today = new Date().toISOString().slice(0, 10);
const initialForm = { patient_id: '', doctor_id: '', polyclinic_id: '', visit_date: today, payment_type: 'CASH', initial_complaint: '' };

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const Registrations = () => {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'REGISTRATION_OFFICER'].includes(user?.role);
  const [registrations, setRegistrations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [options, setOptions] = useState({ doctors: [], polyclinics: [] });
  const [filters, setFilters] = useState({ date: today, status: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/registrations', { params: { ...filters, page: pagination.page, limit: 10 } });
      setRegistrations(response.data.data.registrations);
      setPagination(response.data.data.pagination);
    } catch (err) { setError(err.response?.data?.message || 'Gagal mengambil data pendaftaran.'); }
    finally { setLoading(false); }
  }, [filters, pagination.page]);

  useEffect(() => { const load = async () => { await fetchRegistrations(); }; load(); }, [fetchRegistrations]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [optionsResponse, patientsResponse] = await Promise.all([
          api.get('/registrations/options'),
          api.get('/patients', { params: { page: 1, limit: 100 } }),
        ]);
        setOptions(optionsResponse.data.data);
        setPatients(patientsResponse.data.data.patients);
      } catch (err) { setError(err.response?.data?.message || 'Gagal mengambil referensi pendaftaran.'); }
    };
    if (canManage) loadOptions();
  }, [canManage]);

  const changeFilter = (event) => { setFilters((current) => ({ ...current, [event.target.name]: event.target.value })); setPagination((current) => ({ ...current, page: 1 })); };
  const changeForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const response = await api.post('/registrations', form);
      setSuccess(`Pendaftaran berhasil dibuat. Nomor antrean ${response.data.data.queue_number}.`);
      setForm({ ...initialForm, visit_date: form.visit_date }); setShowForm(false); await fetchRegistrations();
    } catch (err) { setError(err.response?.data?.message || 'Gagal membuat pendaftaran.'); }
    finally { setSaving(false); }
  };
  const updateStatus = async (registration, status) => {
    if (status === registration.status) return;
    setError(''); setSuccess('');
    try { await api.put(`/registrations/${registration.id}`, { status }); setSuccess('Status pendaftaran berhasil diperbarui.'); await fetchRegistrations(); }
    catch (err) { setError(err.response?.data?.message || 'Gagal memperbarui status.'); }
  };

  return <div className="registration-page">
    <div className="registration-header"><div><div className="registration-eyebrow"><ClipboardPlus size={15} /> LAYANAN PASIEN</div><h1>Pendaftaran Pasien</h1><p>Atur kunjungan, dokter, poli, pembayaran, dan antrean pasien.</p></div>{canManage && <button className="registration-primary-btn" onClick={() => setShowForm((current) => !current)}><Plus size={17} /> {showForm ? 'Tutup Form' : 'Pendaftaran Baru'}</button>}</div>
    {error && <div className="registration-alert" role="alert">{error}<button onClick={() => { setError(''); fetchRegistrations(); }}>Coba lagi</button></div>}
    {success && <div className="registration-success" role="status">{success}</div>}
    {showForm && canManage && <form className="registration-form" onSubmit={submit}><div className="registration-form-heading"><div><h2>Pendaftaran Kunjungan</h2><p>Nomor antrean akan dibuat otomatis sesuai tanggal kunjungan.</p></div><CalendarDays size={22} /></div><div className="registration-form-grid">
      <label>Pasien <span>*</span><select name="patient_id" value={form.patient_id} onChange={changeForm} required><option value="">Pilih pasien</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} - {patient.medical_record_number}</option>)}</select></label>
      <label>Tanggal Kunjungan <span>*</span><input type="date" name="visit_date" value={form.visit_date} onChange={changeForm} required /></label>
      <label>Poli <span>*</span><select name="polyclinic_id" value={form.polyclinic_id} onChange={changeForm} required><option value="">Pilih poli</option>{options.polyclinics.map((polyclinic) => <option key={polyclinic.id} value={polyclinic.id}>{polyclinic.name}</option>)}</select></label>
      <label>Dokter <span>*</span><select name="doctor_id" value={form.doctor_id} onChange={changeForm} required><option value="">Pilih dokter</option>{options.doctors.filter((doctor) => !form.polyclinic_id || String(doctor.polyclinic_id) === String(form.polyclinic_id)).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialization || 'Dokter'}</option>)}</select></label>
      <label>Jenis Pembayaran <span>*</span><select name="payment_type" value={form.payment_type} onChange={changeForm}><option value="CASH">Tunai</option><option value="INSURANCE">Asuransi</option><option value="BPJS">BPJS</option></select></label>
      <label className="registration-full">Keluhan Awal<textarea name="initial_complaint" value={form.initial_complaint} onChange={changeForm} rows="3" placeholder="Keluhan utama pasien (opsional)" /></label>
    </div><div className="registration-form-actions"><button type="button" className="registration-secondary-btn" onClick={() => setShowForm(false)}>Batal</button><button className="registration-primary-btn" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Pendaftaran'}</button></div></form>}
    <div className="registration-toolbar"><div className="registration-filter"><CalendarDays size={16} /><input type="date" name="date" value={filters.date} onChange={changeFilter} aria-label="Filter tanggal kunjungan" /><select name="status" value={filters.status} onChange={changeFilter} aria-label="Filter status"><option value="">Semua status</option>{statusOrder.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div><button className="registration-refresh" onClick={() => fetchRegistrations()} disabled={loading}><RefreshCw size={15} className={loading ? 'registration-spin' : ''} /> Refresh</button></div>
    <div className="registration-table-wrap"><table className="registration-table"><thead><tr><th>Antrean</th><th>Pasien</th><th>Dokter / Poli</th><th>Kunjungan</th><th>Pembayaran</th><th>Status</th></tr></thead><tbody>{loading && <tr><td colSpan="6" className="registration-state">Memuat pendaftaran...</td></tr>}{!loading && registrations.length === 0 && <tr><td colSpan="6" className="registration-state">Belum ada pendaftaran pada filter ini.</td></tr>}{!loading && registrations.map((registration) => <tr key={registration.id}><td><span className="queue-number">{registration.queue_number || '-'}</span></td><td><strong>{registration.patient_name}</strong><small>{registration.patient_mrn}</small></td><td><strong>{registration.doctor_name}</strong><small>{registration.polyclinic_name}</small></td><td>{formatDate(registration.visit_date)}</td><td>{paymentLabels[registration.payment_type]}</td><td>{canManage ? <select className={`status-select status-${registration.status.toLowerCase()}`} value={registration.status} onChange={(event) => updateStatus(registration, event.target.value)}>{statusOrder.map((status) => <option key={status} value={status} disabled={statusOrder.indexOf(status) < statusOrder.indexOf(registration.status)}>{statusLabels[status]}</option>)}</select> : <span className={`status-badge status-${registration.status.toLowerCase()}`}>{statusLabels[registration.status]}</span>}</td></tr>)}</tbody></table></div>
    <div className="registration-pagination"><span>Halaman {pagination.page} dari {pagination.totalPages || 1} · {pagination.total} pendaftaran</span><div><button disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} aria-label="Halaman sebelumnya"><ChevronLeft size={17} /></button><button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} aria-label="Halaman berikutnya"><ChevronRight size={17} /></button></div></div>
  </div>;
};

export default Registrations;
