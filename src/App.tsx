import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useReaderStore } from './store/readerStore';
import LandingPage from './pages/LandingPage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { checkSession } = useAuthStore();
  if (!checkSession()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { checkSession } = useAuthStore();
  const { theme } = useReaderStore();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1a1730' : '#fff',
            color: theme === 'dark' ? '#fff' : '#111',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#7c3aed', secondary: '#fff' },
          },
          duration: 3000,
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/read/:bookId"
          element={
            <ProtectedRoute>
              <ReaderPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
