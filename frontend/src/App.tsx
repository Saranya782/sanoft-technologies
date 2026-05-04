import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserDashboard } from './pages/UserDashboard';
import { TaskDetail } from './pages/TaskDetail';
import { CreateTask } from './pages/CreateTask';
import { TeamDetail } from './pages/TeamDetail';
import { CreateTeam } from './pages/CreateTeam';

import { Sidebar } from './components/Sidebar';

const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        {children}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { dbUser } = useAuthStore();
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Welcome, {dbUser?.name || 'User'}</h1>
      </div>
      {!dbUser ? (
        <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading your dashboard...</div>
      ) : dbUser.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <UserDashboard />
      )}
    </>
  );
};

function App() {
  const { user, dbUser, setUser, setDbUser, setLoading, isLoading } = useAuthStore();
  const { theme } = useUiStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setUser(firebaseUser, token);
        
        try {
          const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const dbUser = await res.json();
            setDbUser(dbUser);
          }
        } catch (error) {
          console.error("Failed to fetch user from DB", error);
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setDbUser, setLoading]);

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--text-primary)' }}>Loading Sanoft Task...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/task/new" element={user && dbUser?.role === 'admin' ? <AuthenticatedLayout><CreateTask /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/task/:id" element={user ? <AuthenticatedLayout><TaskDetail /></AuthenticatedLayout> : <Navigate to="/login" />} />
          <Route path="/team/new" element={user && dbUser?.role === 'admin' ? <AuthenticatedLayout><CreateTeam /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/team/:id" element={user && dbUser?.role === 'admin' ? <AuthenticatedLayout><TeamDetail /></AuthenticatedLayout> : <Navigate to="/" />} />
          <Route path="/" element={user ? <AuthenticatedLayout><Dashboard /></AuthenticatedLayout> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
