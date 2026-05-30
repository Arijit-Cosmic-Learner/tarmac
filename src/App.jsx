import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Account from './pages/Account';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import { trackPageView } from './lib/analytics';

// Admin email — single source of truth
const ADMIN_EMAIL = 'admin.tarmac@gmail.com';

// Helper to check if current user is admin
function useIsAdmin() {
  const { user } = useAuth();
  return !!user?.isAdmin;
}

// Route guard: redirect to /login if not authenticated
// Redirect admin users away from regular app pages to /admin
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const isAdmin = useIsAdmin();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

// Route guard: redirect to /dashboard if already logged in
// Redirect admin users to /admin instead
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const isAdmin = useIsAdmin();
  if (loading) return null;
  if (!isAuthenticated) return children;
  return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
}

// Admin route guard: check for admin credentials
function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: if auth loading takes more than 3 seconds, stop waiting
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );

  const isAdmin = isAuthenticated && !!user?.isAdmin;

  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();

  // Automatic route tracking on location change
  useEffect(() => {
    if (user?.isAdmin) return; // Skip admin tracking entirely
    trackPageView(location.pathname, user?.id);
  }, [location.pathname, user?.id, user?.isAdmin]);

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/admin-login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/track/solutions-engineer" element={<PrivateRoute><Track /></PrivateRoute>} />
        <Route path="/track/solutions-engineer/question/:id" element={<PrivateRoute><QuestionDetail /></PrivateRoute>} />
        <Route path="/mock" element={<PrivateRoute><MockInterview /></PrivateRoute>} />
        <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />
        <Route path="/resources" element={<PrivateRoute><Resources /></PrivateRoute>} />
        <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
