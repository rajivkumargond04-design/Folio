import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, ChevronRight, Search, BookMarked, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReaderStore } from '../store/readerStore';
import { getBooks, getAllProgress } from '../utils/api';
import TopBar from '../components/TopBar';
import SettingsPanel from '../components/SettingsPanel';

export interface Book {
  id: string;
  title: string;
  filename: string;
  size: number;
  addedAt: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const { theme, bookProgress, setCurrentBook, settingsOpen } = useReaderStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isDark = theme === 'dark';

  const fetchBooks = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [booksRes] = await Promise.all([
        getBooks(),
        getAllProgress().catch(() => ({ data: {} })),
      ]);
      setBooks(booksRes.data.books || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load books. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentBooks = Object.values(bookProgress)
    .sort((a, b) => b.lastRead - a.lastRead)
    .slice(0, 3);

  const openBook = (bookId: string) => {
    setCurrentBook(bookId);
    navigate(`/read/${bookId}`);
  };

  const bgColor = isDark ? '#0a0a0f' : '#f8f7ff';
  const cardBg = isDark ? 'rgba(20,18,40,0.8)' : 'rgba(255,255,255,0.9)';
  const textColor = isDark ? '#fff' : '#111';
  const subText = isDark ? '#6b7280' : '#9ca3af';
  const borderColor = isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.2)';

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: bgColor, color: textColor }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        {isDark && (
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at 0% 0%, #1e1b4b, transparent 50%), radial-gradient(ellipse at 100% 100%, #2d1b69, transparent 50%)' }} />
        )}
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? 'rgba(139,92,246,0.04)' : 'rgba(124,58,237,0.04)'} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
      </div>

      <TopBar />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-violet-500 text-sm tracking-widest uppercase font-medium mb-2">Your Collection</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            My Library
          </h1>
          <p style={{ color: subText }} className="text-sm">{books.length} book{books.length !== 1 ? 's' : ''} in your collection</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-8"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: subText }} />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
              backdropFilter: 'blur(20px)',
            }}
          />
        </motion.div>

        {/* Continue Reading */}
        {recentBooks.length > 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-sm" style={{ color: subText }}>Continue Reading</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBooks.map((p) => {
                const book = books.find((b) => b.id === p.bookId);
                if (!book) return null;
                const pct = p.totalPages > 0 ? Math.round((p.currentPage / p.totalPages) * 100) : 0;
                return (
                  <motion.button
                    key={p.bookId}
                    onClick={() => openBook(p.bookId)}
                    className="text-left p-5 rounded-2xl transition-all group relative overflow-hidden"
                    style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-20 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                          boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <BookMarked className="w-7 h-7 text-white/80" />
                        {/* Book spine */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl" style={{ background: 'rgba(0,0,0,0.2)' }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: textColor }}>
                          {p.title}
                        </h3>
                        <p className="text-xs mb-3" style={{ color: subText }}>{formatSize(book.size)}</p>

                        <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                          <motion.div
                            className="h-full rounded-full transition-all"
                            style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', width: `${pct}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 }}
                          />
                        </div>
                        <p className="text-xs" style={{ color: subText }}>
                          {pct > 0 ? `${pct}% · p.${p.currentPage}/${p.totalPages}` : 'Not started'}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.3)' }} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* All Books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-sm" style={{ color: subText }}>
                {searchQuery ? `Search Results (${filteredBooks.length})` : 'All Books'}
              </h2>
            </div>
            <button
              onClick={fetchBooks}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-colors"
              style={{ color: subText, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p style={{ color: subText }}>Loading your library...</p>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-red-400 font-medium">Connection Error</p>
              <p className="text-sm text-center max-w-sm" style={{ color: subText }}>{error}</p>
              <button
                onClick={fetchBooks}
                className="mt-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                Try Again
              </button>
            </motion.div>
          ) : filteredBooks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <BookOpen className="w-12 h-12" style={{ color: subText }} />
              <p className="font-medium" style={{ color: subText }}>
                {searchQuery ? 'No books found' : 'No books yet'}
              </p>
              <p className="text-sm text-center max-w-sm" style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>
                {searchQuery ? 'Try a different search term' : 'Place PDF files in the backend/storage/books/ folder'}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book, i) => {
                const progress = bookProgress[book.id];
                const pct = progress?.totalPages ? Math.round((progress.currentPage / progress.totalPages) * 100) : 0;
                return (
                  <motion.button
                    key={book.id}
                    onClick={() => openBook(book.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="text-left p-5 rounded-2xl transition-all group relative overflow-hidden"
                    style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Book icon */}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-20 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                        style={{
                          background: `linear-gradient(135deg, hsl(${(i * 37 + 250) % 360}, 70%, 40%), hsl(${(i * 37 + 270) % 360}, 70%, 30%))`,
                          boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        <BookOpen className="w-7 h-7 text-white/80" />
                        {/* Book spine */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl" style={{ background: 'rgba(0,0,0,0.2)' }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2" style={{ color: textColor }}>
                          {book.title}
                        </h3>
                        <p className="text-xs mb-3" style={{ color: subText }}>{formatSize(book.size)}</p>

                        {progress && (
                          <>
                            <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs" style={{ color: subText }}>
                              {pct > 0 ? `${pct}% · p.${progress.currentPage}/${progress.totalPages}` : 'Not started'}
                            </p>
                          </>
                        )}

                        {!progress && (
                          <p className="text-xs" style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>Not started</p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" />
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.3)' }} />
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <SettingsPanel />
    </div>
  );
}
