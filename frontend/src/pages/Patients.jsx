import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Plus, Search, Users } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Patients.css';

const Patients = () => {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'REGISTRATION_OFFICER'].includes(user?.role);
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/patients', {
        params: { search: query, page: pagination.page, limit: 10 },
      });
      setPatients(response.data.data.patients);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil data pasien.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, query]);

  useEffect(() => {
    const loadPatients = async () => { await fetchPatients(); };
    loadPatients();
  }, [fetchPatients]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
    setQuery(search.trim());
  };

  const changePage = (page) => setPagination((current) => ({ ...current, page }));

  return (
    <div className="patient-page">
      <div className="patient-header">
        <div>
          <div className="eyebrow"><Users size={15} /> MASTER DATA</div>
          <h1>Data Pasien</h1>
          <p>Kelola identitas pasien dan nomor rekam medis klinik.</p>
        </div>
        {canManage && <Link className="patient-primary-btn" to="/patients/create"><Plus size={17} /> Tambah Pasien</Link>}
      </div>

      <div className="patient-toolbar">
        <form className="patient-search" onSubmit={submitSearch}>
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, NIK, atau nomor rekam medis" aria-label="Cari pasien" />
          <button type="submit">Cari</button>
        </form>
        <span className="patient-count">{pagination.total} pasien terdaftar</span>
      </div>

      {error && <div className="patient-alert" role="alert">{error}<button onClick={fetchPatients}>Coba lagi</button></div>}
      <div className="patient-table-wrap">
        <table className="patient-table">
          <thead><tr><th>No. Rekam Medis</th><th>Pasien</th><th>NIK</th><th>Jenis Kelamin</th><th>Telepon</th><th>Aksi</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="patient-state">Memuat data pasien...</td></tr>}
            {!loading && patients.length === 0 && <tr><td colSpan="6" className="patient-state">Belum ada pasien yang sesuai.</td></tr>}
            {!loading && patients.map((patient) => (
              <tr key={patient.id}>
                <td><span className="medical-number">{patient.medical_record_number}</span></td>
                <td><Link className="patient-name" to={`/patients/${patient.id}`}>{patient.name}</Link><span className="patient-meta">Lahir {new Date(patient.birth_date).toLocaleDateString('id-ID')}</span></td>
                <td>{patient.nik}</td>
                <td><span className="gender-badge">{patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span></td>
                <td>{patient.phone || '-'}</td>
                <td><Link className="icon-action" to={`/patients/${patient.id}`} title="Lihat detail" aria-label={`Lihat detail ${patient.name}`}><Eye size={17} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="patient-pagination">
        <span>Halaman {pagination.page} dari {pagination.totalPages || 1}</span>
        <div><button className="page-btn" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={17} /></button><button className="page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={17} /></button></div>
      </div>
    </div>
  );
};

export default Patients;
