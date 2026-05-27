import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Track from './pages/Track';
import QuestionDetail from './pages/QuestionDetail';
import MockInterview from './pages/MockInterview';
import Companies from './pages/Companies';
import Resources from './pages/Resources';
import Pricing from './pages/Pricing';

// Route guard: redirect to /login if not authenticated
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Route guard: redirect to /dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/track/solutions-engineer" element={<PrivateRoute><Track /></PrivateRoute>} />
        <Route path="/track/solutions-engineer/question/:id" element={<PrivateRoute><QuestionDetail /></PrivateRoute>} />
        <Route path="/mock" element={<PrivateRoute><MockInterview /></PrivateRoute>} />
        <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />
        <Route path="/resources" element={<PrivateRoute><Resources /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
