import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import JoinSociety from './pages/JoinSociety';
import AdminDashboard from './pages/AdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';
import PlatformDashboard from './pages/PlatformDashboard';
import AmenityBooking from './pages/AmenityBooking';
import ComplaintPortal from './pages/ComplaintPortal';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';
import HelpCenter from './pages/HelpCenter';
import Members from './pages/Members';
import AIChat from './pages/AIChat';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-md">
        <div className="w-12 h-12 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        <p className="text-body-sm text-on-surface-variant">Loading SocietyPro AI...</p>
      </div>
    </div>
  );
}

/** Requires login. Residents without a tenant get sent to /join-society. */
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  // New residents must join a society before accessing any protected page
  if (user.role === 'resident' && !user.tenantId) {
    return <Navigate to="/join-society" replace />;
  }
  return children;
}

/** Only requires login — no tenant check (used for /join-society). */
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'platform_admin') return <PlatformDashboard />;
  if (user?.role === 'society_admin') return <AdminDashboard />;
  return <ResidentDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Auth-only (no tenant required) */}
          <Route path="/join-society" element={<AuthRoute><JoinSociety /></AuthRoute>} />

          {/* Role-aware dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

          {/* Admin-only */}
          <Route path="/analytics" element={
            <ProtectedRoute roles={['society_admin', 'platform_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/members" element={
            <ProtectedRoute roles={['society_admin', 'platform_admin']}>
              <Members />
            </ProtectedRoute>
          } />

          {/* Shared protected routes — any authenticated user with a tenant */}
          <Route path="/amenities"     element={<ProtectedRoute><AmenityBooking /></ProtectedRoute>} />
          <Route path="/complaints"    element={<ProtectedRoute><ComplaintPortal /></ProtectedRoute>} />
          <Route path="/payments"      element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/chat"          element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/help"          element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
