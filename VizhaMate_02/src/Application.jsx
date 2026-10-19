import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext.jsx';
import useAppData from './hooks/useAppData.js';
import AppLayout from './components/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Entry from './pages/Entry.jsx';
import Functions from './pages/Functions.jsx';
import Guests from './pages/Guests.jsx';
import ProfileSelect from './pages/ProfileSelect.jsx';
import Reviews from './pages/Reviews.jsx';
import Settings from './pages/Settings.jsx';
import Transactions from './pages/Transactions.jsx';
import Transfer from './pages/Transfer.jsx';
import './styles.css';

function ProfileRequired() {
  const { activeUser, loading } = useAppData();
  if (loading) return <div className="startup-screen">Opening local records...</div>;
  return activeUser ? <Outlet /> : <Navigate to="/profile" replace />;
}

function AdminRequired() {
  const { activeUser } = useAppData();
  return activeUser?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}

function ProfileRoute() {
  const { activeUser, loading } = useAppData();
  if (loading) return <div className="startup-screen">Opening local records...</div>;
  return activeUser ? <Navigate to="/" replace /> : <ProfileSelect />;
}

function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/profile" element={<ProfileRoute />} />
      <Route element={<ProfileRequired />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="entry" element={<Entry />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="guests" element={<Guests />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<AdminRequired />}>
            <Route path="functions" element={<Functions />} />
            <Route path="reviews" element={<Reviews />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function Application() {
  return <AppDataProvider><BrowserRouter><ApplicationRoutes /></BrowserRouter></AppDataProvider>;
}