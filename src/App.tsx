import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage, DashboardPage, MesasPage, JugadoresPage, FichasPage,
  TurnoPage, PersonalPage, HistorialPage
} from './pages';
import { MainLayout } from './components/layout';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  useEffect(() => { loadUser(); }, [loadUser]);
  if (isLoading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /><p className="text-silver">Cargando...</p></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/turno" element={<ProtectedRoute><TurnoPage /></ProtectedRoute>} />
        <Route path="/mesas" element={<ProtectedRoute><MesasPage /></ProtectedRoute>} />
        <Route path="/jugadores" element={<ProtectedRoute><JugadoresPage /></ProtectedRoute>} />
        <Route path="/fichas" element={<ProtectedRoute><FichasPage /></ProtectedRoute>} />
        <Route path="/historial" element={<ProtectedRoute><HistorialPage /></ProtectedRoute>} />
        <Route path="/personal" element={<ProtectedRoute><PersonalPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;