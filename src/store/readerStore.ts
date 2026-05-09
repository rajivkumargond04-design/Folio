import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type EyeFilter = 'none' | 'night' | 'bluelight' | 'sepia' | 'lowcontrast';

export interface BookProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  lastRead: number;
  title: string;
  coverPage?: number;
}

export interface ReaderState {
  theme: Theme;
  eyeFilter: EyeFilter;
  currentBookId: string | null;
  bookProgress: Record<string, BookProgress>;
  zoom: number;
  fitToWidth: boolean;
  isFullscreen: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  
  setTheme: (theme: Theme) => void;
  setEyeFilter: (filter: EyeFilter) => void;
  setCurrentBook: (bookId: string | null) => void;
  updateProgress: (bookId: string, page: number, total: number, title: string) => void;
  getProgress: (bookId: string) => BookProgress | undefined;
  setZoom: (zoom: number) => void;
  setFitToWidth: (fit: boolean) => void;
  setFullscreen: (fs: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      eyeFilter: 'none',
      currentBookId: null,
      bookProgress: {},
      zoom: 1,
      fitToWidth: true,
      isFullscreen: false,
      sidebarOpen: false,
      settingsOpen: false,

      setTheme: (theme) => set({ theme }),
      setEyeFilter: (eyeFilter) => set({ eyeFilter }),
      setCurrentBook: (currentBookId) => set({ currentBookId }),

      updateProgress: (bookId, page, total, title) => {
        const current = get().bookProgress[bookId];
        set({
          bookProgress: {
            ...get().bookProgress,
            [bookId]: {
              bookId,
              currentPage: page,
              totalPages: total,
              lastRead: Date.now(),
              title,
              coverPage: current?.coverPage ?? 1,
            },
          },
        });
      },

      getProgress: (bookId) => get().bookProgress[bookId],

      setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.5), 3) }),
      setFitToWidth: (fitToWidth) => set({ fitToWidth }),
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: 'folio-reader',
      partialize: (state) => ({
        theme: state.theme,
        eyeFilter: state.eyeFilter,
        currentBookId: state.currentBookId,
        bookProgress: state.bookProgress,
        zoom: state.zoom,
        fitToWidth: state.fitToWidth,
      }),
    }
  )
);
