import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ArrowLeft, Settings, Maximize2, Minimize2,
  ZoomIn, ZoomOut, BookOpen, Loader2, AlertCircle, Menu,
} from 'lucide-react';
import { useReaderStore } from '../store/readerStore';
import { getBookStream, saveProgress } from '../utils/api';
import SettingsPanel from '../components/SettingsPanel';
import EyeFilterOverlay from '../components/EyeFilterOverlay';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';
import toast from 'react-hot-toast';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type PageFlipDir = 'next' | 'prev' | null;

export default function ReaderPage() {
  const { bookId: rawBookId } = useParams<{ bookId: string }>();
  // React Router decodes URL params, but we need the encoded version to match book.id from the API
  const bookId = rawBookId ? encodeURIComponent(rawBookId) : undefined;
  const navigate = useNavigate();
  const {
    theme, eyeFilter, updateProgress, getProgress, zoom, setZoom,
    fitToWidth, setFitToWidth, isFullscreen, setFullscreen, setSettingsOpen,
  } = useReaderStore();

  const isDark = theme === 'dark';
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [flipDir, setFlipDir] = useState<PageFlipDir>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [showThumbs, setShowThumbs] = useState(false);
  const [inputPage, setInputPage] = useState('');
  const [editingPage, setEditingPage] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load PDF
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    setIsLoading(true);
    setError('');

    const streamUrl = getBookStream(bookId);
    
    // Get auth token from local storage
    const auth = localStorage.getItem('folio-auth');
    let token = '';
    try {
      if (auth) token = JSON.parse(auth)?.state?.token || '';
    } catch(e) {}

    // Pass token as query param since pdf.js doesn't reliably send custom headers
    const authenticatedUrl = token ? `${streamUrl}?token=${encodeURIComponent(token)}` : streamUrl;

    const loadingTask = pdfjsLib.getDocument(authenticatedUrl);

    loadingTask.promise.then((doc) => {
      if (cancelled) {
        doc.destroy();
        return;
      }
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      // Get metadata
      doc.getMetadata().then(({ info }: any) => {
        if (!cancelled) setBookTitle(info?.Title || decodeURIComponent(bookId).replace(/-/g, ' ').replace(/\.pdf$/i, ''));
      }).catch(() => {
        if (!cancelled) setBookTitle(decodeURIComponent(bookId).replace(/-/g, ' ').replace(/\.pdf$/i, ''));
      });

      // Resume from saved progress
      const progress = getProgress(bookId);
      const startPage = progress?.currentPage || 1;
      setCurrentPage(Math.min(startPage, doc.numPages));
      setIsLoading(false);
    }).catch((err: any) => {
      if (cancelled) return;
      setError('Failed to load PDF. Make sure the backend is running and the book exists.');
      setIsLoading(false);
      console.error(err);
    });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Render current page
  const renderPage = useCallback(async (pageNum: number, scale?: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    setPageLoading(true);

    // Cancel previous render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let renderScale = scale || zoom;
      if (fitToWidth && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const viewport = page.getViewport({ scale: 1 });
        renderScale = (containerWidth / viewport.width) * (scale || zoom);
      }

      setCurrentScale(renderScale);
      const viewport = page.getViewport({ scale: renderScale });
      
      // Support high-DPI (Retina) displays and force supersampling for ultra-crisp text
      const pixelRatio = window.devicePixelRatio || 1;
      const renderPixelRatio = Math.max(2, pixelRatio * 2); // Supersample!
      
      // Render at a much higher resolution
      const renderViewport = page.getViewport({ scale: renderScale * renderPixelRatio });
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      
      // But keep the physical CSS size normal
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const renderContext = { canvasContext: ctx, viewport: renderViewport };
      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // Render text layer
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
        const textContent = await page.getTextContent();
        
        const textLayer = new (pdfjsLib as any).TextLayer({
          textContentSource: textContent,
          container: textLayerRef.current,
          viewport: viewport,
        });
        await textLayer.render();
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Render error:', err);
      }
    } finally {
      setPageLoading(false);
    }
  }, [pdfDoc, zoom, fitToWidth]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoom, fitToWidth, renderPage]);

  // Save progress with debounce
  const saveProgressDebounced = useCallback((page: number, total: number, title: string) => {
    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(() => {
      if (bookId) {
        updateProgress(bookId, page, total, title);
        saveProgress(bookId, page, total, title).catch(() => {});
      }
    }, 1000);
  }, [bookId, updateProgress]);

  useEffect(() => {
    if (bookId && totalPages > 0 && bookTitle) {
      saveProgressDebounced(currentPage, totalPages, bookTitle);
    }
  }, [currentPage, totalPages, bookTitle]);

  // Page navigation with flip animation
  const goToPage = useCallback((pageNum: number, dir?: PageFlipDir) => {
    if (isFlipping) return;
    const target = Math.max(1, Math.min(pageNum, totalPages));
    if (target === currentPage) return;

    setFlipDir(dir || (pageNum > currentPage ? 'next' : 'prev'));
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(target);
      setIsFlipping(false);
      setFlipDir(null);
    }, 300);
  }, [currentPage, totalPages, isFlipping]);

  const nextPage = useCallback(() => goToPage(currentPage + 1, 'next'), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1, 'prev'), [currentPage, goToPage]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingPage) return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': e.preventDefault(); nextPage(); break;
        case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); prevPage(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case '+': case '=': setZoom(zoom + 0.1); break;
        case '-': setZoom(zoom - 0.1); break;
        case 'Escape': if (isFullscreen) setFullscreen(false); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextPage, prevPage, zoom, isFullscreen, editingPage]);

  // Touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      dx < 0 ? nextPage() : prevPage();
    }
  };

  // Controls auto-hide
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    showControls();
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Generate thumbnails progressively
  useEffect(() => {
    if (!pdfDoc || !showThumbs) return;
    if (thumbnails.length >= pdfDoc.numPages) return; // Already generated

    let cancelled = false;
    const generateThumbs = async () => {
      const thumbs: string[] = [...thumbnails];
      for (let i = thumbs.length + 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          // Increased scale from 0.15 to 0.3 for sharper thumbnails
          const vp = page.getViewport({ scale: 0.3 }); 
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d')!;
          
          // Use high quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
          // Increased quality from 0.5 to 0.85 for clearer text
          thumbs.push(canvas.toDataURL('image/jpeg', 0.85)); 
          
          // Batch updates to avoid excessive re-renders
          if (i % 10 === 0 || i === pdfDoc.numPages) {
            if (!cancelled) setThumbnails([...thumbs]);
          }
          await new Promise(r => setTimeout(r, 10)); // Yield to keep UI responsive
        } catch (_) {
          thumbs.push('');
        }
      }
    };
    generateThumbs();
    return () => { cancelled = true; };
  }, [pdfDoc, showThumbs]); // purposefully omitting thumbnails to avoid dependency loop

  const bgColor = isDark ? '#1a1a1a' : '#e5e5e5';
  const controlBg = isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)';
  const controlBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? '#fff' : '#111';
  const subColor = isDark ? '#6b7280' : '#9ca3af';

  const ControlBtn = ({ onClick, icon: Icon, label, active }: { onClick: () => void; icon: any; label: string; active?: boolean }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); showControls(); }}
      title={label}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
      style={{
        background: active ? 'rgba(124,58,237,0.3)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        color: active ? '#a78bfa' : textColor,
        border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
      }}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-4" style={{ background: bgColor }}>
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 font-medium text-center">{error}</p>
        <button onClick={() => navigate('/library')} className="px-6 py-2.5 rounded-xl text-white text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: bgColor }}
      onMouseMove={showControls}
      onClick={showControls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      <EyeFilterOverlay filter={eyeFilter} />

      {/* Loading */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
            style={{ background: bgColor }}
          >
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 20px rgba(124,58,237,0.4)', '0 0 40px rgba(124,58,237,0.6)', '0 0 20px rgba(124,58,237,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <BookOpen className="w-8 h-8 text-white" />
            </motion.div>
            <p style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} className="text-sm font-medium">Opening book...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 sm:px-5 h-14"
            style={{ background: controlBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${controlBorder}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors mr-2"
              style={{ color: subColor }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:block">Library</span>
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: textColor }}>{bookTitle}</p>
            </div>

            <div className="flex items-center gap-1">
              <ControlBtn onClick={() => setZoom(zoom - 0.15)} icon={ZoomOut} label="Zoom out" />
              <ControlBtn onClick={() => setZoom(zoom + 0.15)} icon={ZoomIn} label="Zoom in" />
              <ControlBtn onClick={() => setFitToWidth(!fitToWidth)} icon={BookOpen} label="Fit to width" active={fitToWidth} />
              <ControlBtn onClick={toggleFullscreen} icon={isFullscreen ? Minimize2 : Maximize2} label="Fullscreen" />
              <ControlBtn onClick={() => setShowThumbs(!showThumbs)} icon={Menu} label="Pages" active={showThumbs} />
              <ControlBtn onClick={() => setSettingsOpen(true)} icon={Settings} label="Settings" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumbnail sidebar */}
      <AnimatePresence>
        {showThumbs && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute left-0 top-14 bottom-16 z-30 w-48 sm:w-56 overflow-y-auto py-2 px-2"
            style={{ background: controlBg, backdropFilter: 'blur(20px)', borderRight: `1px solid ${controlBorder}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => { goToPage(p); }}
                className="w-full mb-2 rounded-xl overflow-hidden transition-all hover:scale-105 relative"
                style={{ border: p === currentPage ? '2px solid #7c3aed' : '2px solid transparent' }}
              >
                {thumbnails[p - 1] ? (
                  <img src={thumbnails[p - 1]} alt={`Page ${p}`} className="w-full" loading="lazy" />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <p className="text-xs font-medium" style={{ color: subColor }}>Page {p}</p>
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 text-center py-0.5 text-xs"
                  style={{ background: p === currentPage ? '#7c3aed' : 'rgba(0,0,0,0.5)', color: '#fff' }}
                >
                  {p}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main reading area */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-auto"
        style={{ paddingTop: 56, paddingBottom: 64 }}
      >
        {/* Page flip animation container */}
        <motion.div
          className="relative flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d', perspective: '1200px' }}
        >
          <motion.div
              key="page-container"
              animate={{
                opacity: pageLoading ? 0.6 : 1,
                scale: pageLoading ? 0.98 : 1,
              }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Page shadow */}
              <div
                className="absolute inset-0 rounded-sm pointer-events-none"
                style={{
                  boxShadow: isDark
                    ? '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5), 4px 0 20px rgba(0,0,0,0.4)'
                    : '0 8px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1,
                }}
              />
              {/* Page loading overlay */}
              <AnimatePresence>
                {pageLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }}
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative inline-block max-w-full">
                <canvas
                  ref={canvasRef}
                  className="block w-full h-auto"
                  style={{ display: isLoading ? 'none' : 'block' }}
                />
                <div 
                  ref={textLayerRef} 
                  className="textLayer absolute inset-0" 
                  style={{ display: isLoading ? 'none' : 'block' }} 
                />
              </div>
            </motion.div>
        </motion.div>
      </div>

      {/* Tap zones for mobile page turn */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ paddingTop: 56, paddingBottom: 64 }}>
        <div className="h-full flex">
          <button
            className="w-1/4 h-full pointer-events-auto opacity-0"
            onClick={(e) => { e.stopPropagation(); prevPage(); showControls(); }}
            aria-label="Previous page"
          />
          <div className="flex-1 h-full" />
          <button
            className="w-1/4 h-full pointer-events-auto opacity-0"
            onClick={(e) => { e.stopPropagation(); nextPage(); showControls(); }}
            aria-label="Next page"
          />
        </div>
      </div>

      {/* Bottom controls */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-3 sm:px-6 h-16"
            style={{ background: controlBg, backdropFilter: 'blur(20px)', borderTop: `1px solid ${controlBorder}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev button */}
            <button
              onClick={() => { prevPage(); showControls(); }}
              disabled={currentPage <= 1}
              className="flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-xl text-sm font-medium disabled:opacity-30 transition-all hover:scale-105"
              style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:block">Prev</span>
            </button>

            {/* Progress bar + page input */}
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1 relative h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <motion.div
                  className="absolute left-0 top-0 bottom-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                  animate={{ width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                />
                <input
                  type="range"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Page indicator */}
              <div className="flex items-center gap-1 text-sm" style={{ color: subColor }}>
                {editingPage ? (
                  <input
                    type="number"
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    onBlur={() => {
                      const p = parseInt(inputPage);
                      if (p >= 1 && p <= totalPages) goToPage(p);
                      setEditingPage(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const p = parseInt(inputPage);
                        if (p >= 1 && p <= totalPages) goToPage(p);
                        setEditingPage(false);
                      }
                      if (e.key === 'Escape') setEditingPage(false);
                    }}
                    className="w-12 text-center rounded-lg px-1 py-0.5 text-sm outline-none"
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: textColor }}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => { setInputPage(String(currentPage)); setEditingPage(true); }}
                    className="font-medium hover:text-violet-400 transition-colors"
                    style={{ color: textColor }}
                  >
                    {currentPage}
                  </button>
                )}
                <span className="text-xs">/ {totalPages}</span>
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={() => { nextPage(); showControls(); }}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-xl text-sm font-medium disabled:opacity-30 transition-all hover:scale-105"
              style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
            >
              <span className="hidden sm:block">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsPanel />
    </div>
  );
}
