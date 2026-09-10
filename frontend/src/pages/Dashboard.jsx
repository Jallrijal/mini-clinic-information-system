import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  ListOrdered,
  Clock,
  CheckCircle2,
  PhoneCall,
  Stethoscope,
  RefreshCw,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import './Dashboard.css';

/* ── Stat card config ── */
const buildCards = (data) => [
  {
    id: 'total-patients',
    label: 'Total Pasien',
    value: data.totalPatients,
    icon: Users,
    color: 'card-indigo',
    desc: 'Seluruh pasien terdaftar',
    trend: null,
  },
  {
    id: 'patients-today',
    label: 'Kunjungan Hari Ini',
    value: data.totalPatientsToday,
    icon: UserCheck,
    color: 'card-emerald',
    desc: 'Registrasi masuk hari ini',
    trend: null,
  },
  {
    id: 'queues-today',
    label: 'Total Antrean',
    value: data.totalQueuesToday,
    icon: ListOrdered,
    color: 'card-violet',
    desc: 'Antrean terbuat hari ini',
    trend: null,
  },
  {
    id: 'waiting',
    label: 'Menunggu',
    value: data.totalWaiting,
    icon: Clock,
    color: 'card-amber',
    desc: 'Pasien belum dipanggil',
    trend: null,
  },
  {
    id: 'done',
    label: 'Selesai Dilayani',
    value: data.totalDone,
    icon: CheckCircle2,
    color: 'card-teal',
    desc: 'Antrean selesai hari ini',
    trend: null,
  },
  {
    id: 'called',
    label: 'Sedang Dipanggil',
    value: data.totalCalled,
    icon: PhoneCall,
    color: 'card-rose',
    desc: 'Antrean status CALLED',
    trend: null,
  },
];

/* ── Queue status progress bar ── */
const QueueProgress = ({ waiting, called, done, total }) => {
  if (total === 0) return null;
  const pct = (v) => ((v / total) * 100).toFixed(1);
  return (
    <div className="queue-progress-wrap">
      <div className="queue-progress-bar">
        <div
          className="qp-segment qp-done"
          style={{ width: `${pct(done)}%` }}
          title={`Selesai: ${done}`}
        />
        <div
          className="qp-segment qp-called"
          style={{ width: `${pct(called)}%` }}
          title={`Dipanggil: ${called}`}
        />
        <div
          className="qp-segment qp-waiting"
          style={{ width: `${pct(waiting)}%` }}
          title={`Menunggu: ${waiting}`}
        />
      </div>
      <div className="queue-legend">
        <span className="ql-item ql-done">
          <span className="ql-dot" />
          Selesai ({done})
        </span>
        <span className="ql-item ql-called">
          <span className="ql-dot" />
          Dipanggil ({called})
        </span>
        <span className="ql-item ql-waiting">
          <span className="ql-dot" />
          Menunggu ({waiting})
        </span>
      </div>
    </div>
  );
};

/* ── Skeleton loader ── */
const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/* ── Main Dashboard ── */
const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard');
      setData(res.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal mengambil data dashboard. Pastikan server berjalan.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatTime = (date) =>
    date
      ? date.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cards = data ? buildCards(data) : [];

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-title-wrap">
            <div className="dash-title-icon">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="dash-title">Dashboard</h1>
              <p className="dash-subtitle">
                Ringkasan aktivitas klinik hari ini
              </p>
            </div>
          </div>
        </div>
        <div className="dash-header-right">
          {lastUpdated && (
            <span className="dash-updated">
              Diperbarui: {formatTime(lastUpdated)}
            </span>
          )}
          <button
            id="btn-refresh-dashboard"
            className={`dash-refresh-btn ${refreshing ? 'dash-refresh-btn--spinning' : ''}`}
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Date banner ── */}
      {data?.today && (
        <div className="dash-date-banner">
          <Calendar size={15} />
          <span>{formatDate(data.today)}</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="dash-error" role="alert">
          <span>{error}</span>
          <button onClick={() => fetchDashboard()}>Coba lagi</button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="dash-cards">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="stat-card stat-card--skeleton">
                <Skeleton className="sk-icon" />
                <Skeleton className="sk-value" />
                <Skeleton className="sk-label" />
                <Skeleton className="sk-desc" />
              </div>
            ))
          : cards.map(({ id, label, value, icon: Icon, color, desc }) => (
              <div key={id} className={`stat-card ${color}`} id={`card-${id}`}>
                <div className="stat-card-icon">
                  <Icon size={22} />
                </div>
                <div className="stat-card-value">{value ?? 0}</div>
                <div className="stat-card-label">{label}</div>
                <div className="stat-card-desc">{desc}</div>
              </div>
            ))}
      </div>

      {/* ── Queue Progress Section ── */}
      {!loading && data && data.totalQueuesToday > 0 && (
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-icon">
              <ListOrdered size={17} />
            </div>
            <h2 className="dash-section-title">Status Antrean Hari Ini</h2>
            <span className="dash-section-badge">{data.totalQueuesToday} total</span>
          </div>
          <QueueProgress
            waiting={data.totalWaiting}
            called={data.totalCalled}
            done={data.totalDone}
            total={data.totalQueuesToday}
          />
        </div>
      )}

      {/* ── Registration Status Section ── */}
      {!loading && data && data.totalPatientsToday > 0 && (
        <div className="dash-section">
          <div className="dash-section-header">
            <div className="dash-section-icon">
              <Stethoscope size={17} />
            </div>
            <h2 className="dash-section-title">Status Kunjungan Hari Ini</h2>
            <span className="dash-section-badge">{data.totalPatientsToday} kunjungan</span>
          </div>
          <div className="reg-status-grid">
            <div className="reg-status-item">
              <div className="rsi-dot rsi-dot--waiting" />
              <div className="rsi-info">
                <span className="rsi-label">Menunggu</span>
                <span className="rsi-value">
                  {data.totalPatientsToday -
                    data.totalExamination -
                    data.totalCompleted}
                </span>
              </div>
            </div>
            <div className="reg-status-item">
              <div className="rsi-dot rsi-dot--examination" />
              <div className="rsi-info">
                <span className="rsi-label">Pemeriksaan</span>
                <span className="rsi-value">{data.totalExamination}</span>
              </div>
            </div>
            <div className="reg-status-item">
              <div className="rsi-dot rsi-dot--done" />
              <div className="rsi-info">
                <span className="rsi-label">Selesai</span>
                <span className="rsi-value">{data.totalCompleted}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && data && data.totalQueuesToday === 0 && data.totalPatientsToday === 0 && (
        <div className="dash-empty">
          <div className="dash-empty-icon">
            <Stethoscope size={36} />
          </div>
          <p className="dash-empty-title">Belum ada aktivitas hari ini</p>
          <p className="dash-empty-sub">
            Data antrean dan kunjungan akan muncul setelah pasien mendaftar.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
