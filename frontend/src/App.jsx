import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientCreate from './pages/PatientCreate';
import PatientDetail from './pages/PatientDetail';
import Registrations from './pages/Registrations';
import Queue from './pages/Queue';
import MedicalRecords from './pages/MedicalRecords';
import NotFound from './pages/NotFound';

/**
 * ProtectedLayout – wraps a page component with ProtectedRoute + MainLayout.
 * Keeps App.jsx concise without repeating the same pattern on every route.
 */
const ProtectedLayout = ({ children }) => (
  <ProtectedRoute>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<Login />} />

          {/* ── Protected (with sidebar layout) ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedLayout>
                <Patients />
              </ProtectedLayout>
            }
          />
          <Route
            path="/patients/create"
            element={
              <ProtectedLayout>
                <PatientCreate />
              </ProtectedLayout>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <ProtectedLayout>
                <PatientDetail />
              </ProtectedLayout>
            }
          />
          <Route
            path="/registrations"
            element={
              <ProtectedLayout>
                <Registrations />
              </ProtectedLayout>
            }
          />
          <Route
            path="/queue"
            element={
              <ProtectedLayout>
                <Queue />
              </ProtectedLayout>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedLayout>
                <MedicalRecords />
              </ProtectedLayout>
            }
          />

          {/* ── Defaults ── */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
