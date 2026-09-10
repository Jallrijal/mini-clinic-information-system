import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, ListOrdered, Megaphone, PhoneCall, RefreshCw, SkipForward } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Queue.css';

const statusLabels = { WAITING: 'Menunggu', CALLED: 'Dipanggil', SKIPPED: 'Dilewati', DONE: 'Selesai' };
const statusOrder = ['WAITING', 'CALLED', 'SKIPPED', 'DONE'];
const today = new Date().toISOString().slice(0, 10);
const allowedTransitions = { WAITING: ['CALLED', 'SKIPPED'], CALLED: ['DONE', 'SKIPPED'], SKIPPED: ['WAITING'], DONE: [] };

const Queue = () => {
  const { user } = useAuth();
  const canCall = ['ADMIN', 'REGISTRATION_OFFICER'].includes(user?.role);
  const [queues, setQueues] = useState([]);
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchQueues = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/queues', { params: { date, status, page: pagination.page, limit: 100 } });
      setQueues(response.data.data.queues);
      setPagination(response.data.data.pagination);
    } catch (err) { setError(err.response?.data?.message || 'Gagal mengambil data antrean.'); }
    finally { setLoading(false); }
  }, [date, pagination.page, status]);

  useEffect(() => { const load = async () => { await fetchQueues(); }; load(); }, [fetchQueues]);

  const changeFilter = (event) => {
    const { name, value } = event.target;
    if (name === 'date') setDate(value); else setStatus(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const updateQueue = async (queue, nextStatus) => {
    setWorkingId(queue.id); setError(''); setSuccess('');
    try {
      const response = await api.put(`/queues/${queue.id}/status`, { status: nextStatus });
      setSuccess(response.data.message || 'Status antrean berhasil diperbarui.');
      await fetchQueues();
    } catch (err) { setError(err.response?.data?.message || 'Gagal memperbarui status antrean.'); }
    finally { setWorkingId(null); }
  };

  const callNext = async () => {
    const nextQueue = queues.find((queue) => queue.status === 'WAITING');
    if (!nextQueue) { setError('Tidak ada pasien yang menunggu untuk dipanggil.'); return; }
    setWorkingId(nextQueue.id); setError(''); setSuccess('');
    try {
      const response = await api.put(`/queues/${nextQueue.id}/call`);
      setSuccess(response.data.message || `Antrean ${nextQueue.queue_number} berhasil dipanggil.`);
      await fetchQueues();
    } catch (err) { setError(err.response?.data?.message || 'Gagal memanggil antrean berikutnya.'); }
    finally { setWorkingId(null); }
  };

  const counts = queues.reduce((summary, queue) => ({ ...summary, [queue.status]: summary[queue.status] + 1 }), { WAITING: 0, CALLED: 0, SKIPPED: 0, DONE: 0 });
  const currentQueue = queues.find((queue) => queue.status === 'CALLED');

  return <div className="queue-page">
    <div className="queue-header"><div><div className="queue-eyebrow"><ListOrdered size={15} /> OPERASIONAL KLINIK</div><h1>Antrean Pasien</h1><p>Pantau dan kelola antrean kunjungan berdasarkan tanggal.</p></div><div className="queue-header-actions"><button className="queue-refresh-btn" onClick={() => fetchQueues()} disabled={loading}><RefreshCw size={15} className={loading ? 'queue-spin' : ''} /> Refresh</button>{canCall && <button className="queue-call-btn" onClick={callNext} disabled={loading || workingId !== null || counts.WAITING === 0}><Megaphone size={17} /> Panggil Berikutnya</button>}</div></div>
    {error && <div className="queue-alert" role="alert">{error}<button onClick={() => { setError(''); fetchQueues(); }}>Coba lagi</button></div>}{success && <div className="queue-success" role="status">{success}</div>}
    <div className="queue-toolbar"><label><span>Tanggal antrean</span><input type="date" name="date" value={date} onChange={changeFilter} /></label><label><span>Status</span><select name="status" value={status} onChange={changeFilter}><option value="">Semua status</option>{statusOrder.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label></div>
    <div className="queue-overview"><div className="queue-current"><div className="queue-card-label"><PhoneCall size={15} /> SEDANG DIPANGGIL</div>{currentQueue ? <><strong>{currentQueue.queue_number}</strong><span>{currentQueue.patient_name}</span><small>{currentQueue.doctor_name} · {currentQueue.polyclinic_name}</small></> : <div className="queue-empty-current">Belum ada antrean dipanggil</div>}</div><div className="queue-stat queue-stat-waiting"><Clock3 size={19} /><strong>{counts.WAITING}</strong><span>Menunggu</span></div><div className="queue-stat queue-stat-called"><PhoneCall size={19} /><strong>{counts.CALLED}</strong><span>Dipanggil</span></div><div className="queue-stat queue-stat-done"><CheckCircle2 size={19} /><strong>{counts.DONE}</strong><span>Selesai</span></div></div>
    <div className="queue-table-wrap"><table className="queue-table"><thead><tr><th>No. Antrean</th><th>Pasien</th><th>Dokter / Poli</th><th>Jam Dipanggil</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{loading && <tr><td colSpan="6" className="queue-state">Memuat antrean...</td></tr>}{!loading && queues.length === 0 && <tr><td colSpan="6" className="queue-state">Belum ada antrean pada tanggal atau filter ini.</td></tr>}{!loading && queues.map((queue) => <tr key={queue.id}><td><span className="queue-number">{queue.queue_number}</span></td><td><strong>{queue.patient_name}</strong><small>{queue.patient_mrn}</small></td><td><strong>{queue.doctor_name}</strong><small>{queue.polyclinic_name}</small></td><td>{queue.called_at ? new Date(queue.called_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td><td><span className={`queue-status queue-status-${queue.status.toLowerCase()}`}>{statusLabels[queue.status]}</span></td><td><div className="queue-actions">{canCall && queue.status === 'WAITING' && <button className="queue-action queue-action-call" onClick={() => updateQueue(queue, 'CALLED')} disabled={workingId === queue.id}><PhoneCall size={14} /> Panggil</button>}{allowedTransitions[queue.status].filter((nextStatus) => !(nextStatus === 'CALLED' && canCall)).map((nextStatus) => <button key={nextStatus} className="queue-action" onClick={() => updateQueue(queue, nextStatus)} disabled={workingId === queue.id}>{nextStatus === 'DONE' ? <CheckCircle2 size={14} /> : <SkipForward size={14} />} {statusLabels[nextStatus]}</button>)}</div></td></tr>)}</tbody></table></div>
    <div className="queue-pagination"><span>Menampilkan {queues.length} dari {pagination.total} antrean</span><div><button disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} aria-label="Halaman sebelumnya"><ChevronLeft size={17} /></button><button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} aria-label="Halaman berikutnya"><ChevronRight size={17} /></button></div></div>
  </div>;
};

export default Queue;
