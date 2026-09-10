import { useCallback, useEffect, useState } from 'react';
import { Activity, ClipboardPlus, FileText, Plus, Save, Trash2, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './MedicalRecords.css';

const initialSoap = { registration_id: '', subjective: '', blood_pressure: '', body_temperature: '', weight: '', height: '', diagnosis: '', therapy_plan: '' };
const emptyMedicine = { medicine_name: '', dosage: '', frequency: '', instruction: '' };

const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const MedicalRecords = () => {
  const { user } = useAuth();
  const canExamine = user?.role === 'DOCTOR';
  const [registrations, setRegistrations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [history, setHistory] = useState(null);
  const [soap, setSoap] = useState(initialSoap);
  const [actions, setActions] = useState([{ action_name: '', description: '' }]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/registrations', { params: { page: 1, limit: 100 } });
      const allRegistrations = response.data.data.registrations;
      setRegistrations(allRegistrations);
      const uniquePatients = [...new Map(allRegistrations.map((item) => [item.patient_id, { id: item.patient_id, name: item.patient_name, mrn: item.patient_mrn }])).values()];
      setPatients(uniquePatients);
    } catch (err) { setError(err.response?.data?.message || 'Gagal mengambil daftar kunjungan.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const load = async () => { await fetchRegistrations(); }; load(); }, [fetchRegistrations]);

  const fetchHistory = async (patientId) => {
    setSelectedPatientId(patientId); setHistory(null); if (!patientId) return;
    setHistoryLoading(true); setError('');
    try { const response = await api.get(`/medical-records/${patientId}`, { params: { page: 1, limit: 20 } }); setHistory(response.data.data); }
    catch (err) { setError(err.response?.data?.message || 'Gagal mengambil riwayat pemeriksaan.'); }
    finally { setHistoryLoading(false); }
  };

  const changeSoap = (event) => setSoap((current) => ({ ...current, [event.target.name]: event.target.value }));
  const selectRegistration = (event) => setSoap((current) => ({ ...current, registration_id: event.target.value }));
  const updateAction = (index, field, value) => setActions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const updateMedicine = (index, field, value) => setMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const removeAction = (index) => setActions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const removeMedicine = (index) => setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const response = await api.post('/medical-records', { ...soap, medical_actions: actions.filter((item) => item.action_name.trim()) });
      const record = response.data.data;
      const validMedicines = medicines.filter((item) => item.medicine_name.trim());
      if (validMedicines.length > 0) await api.post('/prescriptions', { medical_record_id: record.id, items: validMedicines });
      setSuccess('Pemeriksaan dan data SOAP berhasil disimpan.');
      const patientId = registrations.find((item) => String(item.id) === String(soap.registration_id))?.patient_id;
      setSoap(initialSoap); setActions([{ action_name: '', description: '' }]); setMedicines([]); await fetchRegistrations();
      if (patientId) await fetchHistory(patientId);
    } catch (err) { setError(err.response?.data?.message || 'Gagal menyimpan pemeriksaan.'); }
    finally { setSaving(false); }
  };

  const examinableRegistrations = registrations.filter((item) => item.status === 'CHECKED_IN');
  const selectedRegistration = registrations.find((item) => String(item.id) === String(soap.registration_id));

  return <div className="medical-page">
    <div className="medical-header"><div><div className="medical-eyebrow"><Activity size={15} /> LAYANAN DOKTER</div><h1>Pemeriksaan Pasien</h1><p>Catat pemeriksaan SOAP, tindakan medis, resep, dan riwayat pasien.</p></div></div>
    {error && <div className="medical-alert" role="alert">{error}</div>}{success && <div className="medical-success" role="status">{success}</div>}
    {canExamine && <form className="medical-form" onSubmit={submit}><div className="medical-form-title"><div><h2>Form Pemeriksaan SOAP</h2><p>Pilih kunjungan yang sudah dipanggil untuk memulai pemeriksaan.</p></div><ClipboardPlus size={22} /></div>
      <div className="medical-form-grid"><label className="medical-full">Kunjungan Pasien <span>*</span><select name="registration_id" value={soap.registration_id} onChange={selectRegistration} disabled={loading} required><option value="">{loading ? 'Memuat kunjungan...' : 'Pilih pasien dari antrean aktif'}</option>{examinableRegistrations.map((item) => <option key={item.id} value={item.id}>{item.patient_name} · {item.patient_mrn} · {formatDate(item.visit_date)}</option>)}</select></label></div>
      {selectedRegistration && <div className="selected-patient"><UserRound size={17} /><div><strong>{selectedRegistration.patient_name}</strong><span>{selectedRegistration.patient_mrn} · {selectedRegistration.doctor_name} · {selectedRegistration.polyclinic_name}</span></div></div>}
      <div className="soap-section"><h3><span className="soap-letter soap-s">S</span> Subjective</h3><label>Keluhan Pasien<textarea name="subjective" value={soap.subjective} onChange={changeSoap} rows="3" placeholder="Keluhan utama dan informasi subjektif pasien" /></label></div>
      <div className="soap-section"><h3><span className="soap-letter soap-o">O</span> Objective</h3><div className="medical-form-grid"><label>Tekanan Darah<input name="blood_pressure" value={soap.blood_pressure} onChange={changeSoap} placeholder="120/80" /></label><label>Suhu Tubuh<input type="number" step="0.1" name="body_temperature" value={soap.body_temperature} onChange={changeSoap} placeholder="36.5" /></label><label>Berat Badan<input type="number" step="0.01" name="weight" value={soap.weight} onChange={changeSoap} placeholder="kg" /></label><label>Tinggi Badan<input type="number" step="0.01" name="height" value={soap.height} onChange={changeSoap} placeholder="cm" /></label></div></div>
      <div className="soap-section"><h3><span className="soap-letter soap-a">A</span> Assessment</h3><label>Diagnosis<textarea name="diagnosis" value={soap.diagnosis} onChange={changeSoap} rows="3" placeholder="Hasil diagnosis dokter" /></label></div>
      <div className="soap-section"><h3><span className="soap-letter soap-p">P</span> Plan</h3><label>Rencana Terapi<textarea name="therapy_plan" value={soap.therapy_plan} onChange={changeSoap} rows="3" placeholder="Rencana terapi dan tindak lanjut" /></label></div>
      <div className="medical-subsection"><div className="medical-subsection-heading"><div><h3>Tindakan Medis</h3><p>Tambahkan tindakan yang dilakukan selama pemeriksaan.</p></div><button type="button" className="medical-add-btn" onClick={() => setActions((current) => [...current, { action_name: '', description: '' }])}><Plus size={14} /> Tambah</button></div>{actions.map((action, index) => <div className="repeat-row" key={index}><input value={action.action_name} onChange={(event) => updateAction(index, 'action_name', event.target.value)} placeholder="Nama tindakan" /><input value={action.description} onChange={(event) => updateAction(index, 'description', event.target.value)} placeholder="Keterangan (opsional)" />{actions.length > 1 && <button type="button" className="remove-btn" onClick={() => removeAction(index)} aria-label="Hapus tindakan"><Trash2 size={15} /></button>}</div>)}</div>
      <div className="medical-subsection"><div className="medical-subsection-heading"><div><h3>Resep Obat</h3><p>Opsional. Jika diisi, resep dibuat bersama pemeriksaan.</p></div><button type="button" className="medical-add-btn" onClick={() => setMedicines((current) => [...current, { ...emptyMedicine }])}><Plus size={14} /> Tambah Obat</button></div>{medicines.map((medicine, index) => <div className="medicine-row" key={index}><input value={medicine.medicine_name} onChange={(event) => updateMedicine(index, 'medicine_name', event.target.value)} placeholder="Nama obat" /><input value={medicine.dosage} onChange={(event) => updateMedicine(index, 'dosage', event.target.value)} placeholder="Dosis" /><input value={medicine.frequency} onChange={(event) => updateMedicine(index, 'frequency', event.target.value)} placeholder="Frekuensi" /><input value={medicine.instruction} onChange={(event) => updateMedicine(index, 'instruction', event.target.value)} placeholder="Aturan pakai" /><button type="button" className="remove-btn" onClick={() => removeMedicine(index)} aria-label="Hapus obat"><Trash2 size={15} /></button></div>)}</div>
      <div className="medical-form-actions"><button className="medical-save-btn" disabled={saving || !selectedRegistration}><Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pemeriksaan'}</button></div>
    </form>}
    {!canExamine && <div className="medical-readonly-note"><FileText size={17} /> Akun ini memiliki akses baca riwayat pemeriksaan. Form SOAP hanya tersedia untuk role Dokter.</div>}
    <section className="history-panel"><div className="history-heading"><div><h2>Riwayat Pemeriksaan</h2><p>Pilih pasien untuk melihat catatan SOAP, tindakan, dan resep.</p></div><select value={selectedPatientId} onChange={(event) => fetchHistory(event.target.value)} aria-label="Pilih pasien untuk riwayat"><option value="">Pilih pasien</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}</select></div>{historyLoading && <div className="medical-state">Memuat riwayat pemeriksaan...</div>}{!historyLoading && !history && <div className="medical-state">Belum ada pasien yang dipilih.</div>}{!historyLoading && history && <div className="history-content"><div className="history-patient"><UserRound size={17} /><strong>{history.patient.name}</strong><span>{history.patient.medical_record_number}</span></div>{history.medical_records.length === 0 && <div className="medical-state">Belum ada riwayat pemeriksaan.</div>}{history.medical_records.map((record) => <article className="history-record" key={record.id}><div className="history-record-header"><div><strong>{formatDate(record.visit_date)}</strong><span>{record.doctor_name} · {record.polyclinic_name}</span></div><span className="history-status">{record.registration_status}</span></div><div className="history-soap"><div><b>S</b><span>{record.subjective || '-'}</span></div><div><b>O</b><span>TD {record.blood_pressure || '-'} · Suhu {record.body_temperature || '-'} · BB {record.weight || '-'} kg · TB {record.height || '-'} cm</span></div><div><b>A</b><span>{record.diagnosis || '-'}</span></div><div><b>P</b><span>{record.therapy_plan || '-'}</span></div></div>{record.medical_actions?.length > 0 && <div className="history-extra"><strong>Tindakan:</strong> {record.medical_actions.map((action) => action.action_name).join(', ')}</div>}{record.prescription?.items?.length > 0 && <div className="history-extra"><strong>Resep:</strong> {record.prescription.items.map((item) => `${item.medicine_name} ${item.dosage || ''}`).join(', ')}</div>}</article>)}</div>}
    </section>
  </div>;
};

export default MedicalRecords;
