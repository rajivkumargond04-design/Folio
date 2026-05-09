import { motion } from 'framer-motion';
import { BookOpen, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useReaderStore } from '../store/readerStore';
import { logout as apiLogout } from '../utils/api';
import toast from 'react-hot-toast';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, username } = useAuthStore();
  const { theme, setSettingsOpen } = useReaderStore();
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    try { await apiLogout(); } catch (_) {}
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const isReader = location.pathname.startsWith('/read/');

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-16"
      style={{
        background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(248,247,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.15)'}`,
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-2.5 group"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span
          className="font-bold text-sm tracking-wide hidden sm:block"
          style={{ color: isDark ? '#fff' : '#111', fontFamily: 'Playfair Display, serif' }}
        >
          Folio
        </span>
      </button>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {[
          { label: 'Library', path: '/library' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden sm:block"
            style={{
              background: location.pathname === item.path ? 'rgba(124,58,237,0.15)' : 'transparent',
              color: location.pathname === item.path ? '#a78bfa' : isDark ? '#6b7280' : '#9ca3af',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs hidden sm:block" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
          {username}
        </span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#9ca3af' : '#6b7280',
          }}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#f87171',
          }}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </motion.header>
  );
}
