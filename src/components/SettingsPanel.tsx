import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Moon, Sun, Shield, Key, Eye, Palette, LogOut, ChevronRight,
  Loader2, AlertCircle, CheckCircle, Trash2, EyeOff,
} from 'lucide-react';
import { useReaderStore, Theme, EyeFilter } from '../store/readerStore';
import { useAuthStore } from '../store/authStore';
import { changePassword, setUniversalPassword, removeUniversalPassword } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../utils/api';
import toast from 'react-hot-toast';

type Section = 'main' | 'theme' | 'eye' | 'password' | 'universal';

const EYE_FILTERS: { id: EyeFilter; label: string; desc: string; color: string }[] = [
  { id: 'none', label: 'Default', desc: 'No filter applied', color: '#7c3aed' },
  { id: 'night', label: 'Night Mode', desc: 'Dark red-tinted overlay', color: '#991b1b' },
  { id: 'bluelight', label: 'Blue Light Filter', desc: 'Warm amber overlay', color: '#b45309' },
  { id: 'sepia', label: 'Sepia', desc: 'Classic warm sepia tone', color: '#92400e' },
  { id: 'lowcontrast', label: 'Low Contrast', desc: 'Easy on the eyes', color: '#374151' },
];

const THEMES: { id: Theme; label: string; icon: typeof Moon }[] = [
  { id: 'dark', label: 'Dark Mode', icon: Moon },
  { id: 'light', label: 'Light Mode', icon: Sun },
];

const InputField = ({ label, value, onChange, type = 'text', placeholder, show, onToggle, sub, itemBg, border, text }: any) => (
  <div>
    <label className="text-xs mb-1.5 block" style={{ color: sub }}>{label}</label>
    <div className="relative">
      <input
        type={show !== undefined ? (show ? 'text' : 'password') : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: itemBg, border: `1px solid ${border}`, color: text }}
      />
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: sub }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  </div>
);

const SectionBtn = ({ icon: Icon, label, subLabel, onClick, color = '#7c3aed', itemBg, itemHover, text, sub }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all group"
    style={{ background: itemBg }}
    onMouseEnter={(e) => (e.currentTarget.style.background = itemHover)}
    onMouseLeave={(e) => (e.currentTarget.style.background = itemBg)}
  >
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
      <Icon className="w-4.5 h-4.5" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium" style={{ color: text }}>{label}</p>
      {subLabel && <p className="text-xs truncate" style={{ color: sub }}>{subLabel}</p>}
    </div>
    <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: sub }} />
  </button>
);

export default function SettingsPanel() {
  const navigate = useNavigate();
  const { settingsOpen, setSettingsOpen, theme, setTheme, eyeFilter, setEyeFilter } = useReaderStore();
  const { logout } = useAuthStore();
  const isDark = theme === 'dark';

  const [section, setSection] = useState<Section>('main');

  // Password change
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Universal password
  const [univPw, setUnivPw] = useState('');
  const [univLoading, setUnivLoading] = useState(false);
  const [univError, setUnivError] = useState('');
  const [univSuccess, setUnivSuccess] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const bg = isDark ? '#0f0c1e' : '#f8f7ff';
  const cardBg = isDark ? 'rgba(20,18,40,0.95)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.2)';
  const text = isDark ? '#fff' : '#111';
  const sub = isDark ? '#6b7280' : '#9ca3af';
  const itemBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const itemHover = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const close = () => { setSettingsOpen(false); setTimeout(() => setSection('main'), 300); };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (!curPw || !newPw || !confPw) { setPwError('All fields required'); return; }
    if (newPw !== confPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 4) { setPwError('Password must be at least 4 characters'); return; }
    setPwLoading(true);
    try {
      await changePassword(curPw, newPw);
      setPwSuccess(true);
      setCurPw(''); setNewPw(''); setConfPw('');
      toast.success('Password updated successfully');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSetUniversal = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnivError('');
    if (!univPw) { setUnivError('Password required'); return; }
    if (univPw.length < 4) { setUnivError('Must be at least 4 characters'); return; }
    setUnivLoading(true);
    try {
      await setUniversalPassword(univPw);
      setUnivSuccess(true);
      setUnivPw('');
      toast.success('Universal password set successfully');
      setTimeout(() => setUnivSuccess(false), 3000);
    } catch (err: any) {
      setUnivError(err?.response?.data?.message || 'Failed to set universal password');
    } finally {
      setUnivLoading(false);
    }
  };

  const handleRemoveUniversal = async () => {
    setRemoveLoading(true);
    try {
      await removeUniversalPassword();
      toast.success('Universal password removed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove');
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleLogout = async () => {
    close();
    try { await apiLogout(); } catch (_) {}
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const sections: Record<Section, React.ReactNode> = {
    main: (
      <div className="space-y-2">
        <SectionBtn icon={Palette} label="Theme" subLabel={theme === 'dark' ? 'Dark Mode' : 'Light Mode'} onClick={() => setSection('theme')} color="#7c3aed" itemBg={itemBg} itemHover={itemHover} text={text} sub={sub} />
        <SectionBtn icon={Eye} label="Eye Protection" subLabel={EYE_FILTERS.find(f => f.id === eyeFilter)?.label || 'None'} onClick={() => setSection('eye')} color="#059669" itemBg={itemBg} itemHover={itemHover} text={text} sub={sub} />
        <SectionBtn icon={Key} label="Change Password" subLabel="Update your login password" onClick={() => setSection('password')} color="#d97706" itemBg={itemBg} itemHover={itemHover} text={text} sub={sub} />
        <SectionBtn icon={Shield} label="Universal Password" subLabel="Recovery password management" onClick={() => setSection('universal')} color="#0ea5e9" itemBg={itemBg} itemHover={itemHover} text={text} sub={sub} />
        <div className="pt-2 border-t" style={{ borderColor: border }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
            style={{ background: 'rgba(239,68,68,0.06)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-sm font-medium text-red-400">Logout</span>
          </button>
        </div>
      </div>
    ),

    theme: (
      <div className="space-y-2">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
            style={{
              background: theme === id ? 'rgba(124,58,237,0.15)' : itemBg,
              border: `1px solid ${theme === id ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme === id ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.1)' }}>
              <Icon className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-sm font-medium flex-1 text-left" style={{ color: text }}>{label}</span>
            {theme === id && <CheckCircle className="w-4 h-4 text-violet-400" />}
          </button>
        ))}
      </div>
    ),

    eye: (
      <div className="space-y-2">
        {EYE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setEyeFilter(f.id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
            style={{
              background: eyeFilter === f.id ? `${f.color}22` : itemBg,
              border: `1px solid ${eyeFilter === f.id ? `${f.color}44` : 'transparent'}`,
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${f.color}22` }}>
              <Eye className="w-4 h-4" style={{ color: f.color }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: text }}>{f.label}</p>
              <p className="text-xs" style={{ color: sub }}>{f.desc}</p>
            </div>
            {eyeFilter === f.id && <CheckCircle className="w-4 h-4" style={{ color: f.color }} />}
          </button>
        ))}
      </div>
    ),

    password: (
      <form onSubmit={handleChangePassword} className="space-y-4">
        <InputField label="Current Password" value={curPw} onChange={setCurPw} show={showCur} onToggle={() => setShowCur(!showCur)} placeholder="Current password" sub={sub} itemBg={itemBg} border={border} text={text} />
        <InputField label="New Password" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="New password" sub={sub} itemBg={itemBg} border={border} text={text} />
        <InputField label="Confirm New Password" value={confPw} onChange={setConfPw} type="password" placeholder="Confirm new password" sub={sub} itemBg={itemBg} border={border} text={text} />
        <AnimatePresence>
          {pwError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-xs p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertCircle className="w-3.5 h-3.5" />{pwError}
            </motion.div>
          )}
          {pwSuccess && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-green-400 text-xs p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CheckCircle className="w-3.5 h-3.5" />Password updated successfully!
            </motion.div>
          )}
        </AnimatePresence>
        <button type="submit" disabled={pwLoading} className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : 'Update Password'}
        </button>
      </form>
    ),

    universal: (
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>
          <Shield className="w-4 h-4 mb-1.5" />
          <strong>Universal / Recovery Password</strong><br />
          Set a backup password to recover access if you forget your main password. Select "Recovery Login" on the login screen.
        </div>
        <form onSubmit={handleSetUniversal} className="space-y-3">
          <InputField label="New Universal Password" value={univPw} onChange={setUnivPw} type="password" placeholder="Set universal password" sub={sub} itemBg={itemBg} border={border} text={text} />
          <AnimatePresence>
            {univError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <AlertCircle className="w-3.5 h-3.5" />{univError}
              </motion.div>
            )}
            {univSuccess && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-green-400 text-xs p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle className="w-3.5 h-3.5" />Universal password set!
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" disabled={univLoading} className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            {univLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Setting...</> : 'Set Universal Password'}
          </button>
        </form>
        <button
          onClick={handleRemoveUniversal}
          disabled={removeLoading}
          className="w-full py-2.5 rounded-xl text-red-400 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {removeLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Removing...</> : <><Trash2 className="w-4 h-4" />Remove Universal Password</>}
        </button>
      </div>
    ),
  };

  const sectionTitles: Record<Section, string> = {
    main: 'Settings',
    theme: 'Theme',
    eye: 'Eye Protection',
    password: 'Change Password',
    universal: 'Universal Password',
  };

  return (
    <AnimatePresence>
      {settingsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[101] w-full max-w-sm overflow-y-auto"
            style={{ background: cardBg, borderLeft: `1px solid ${border}`, boxShadow: '-20px 0 60px rgba(0,0,0,0.4)' }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
              style={{ background: cardBg, borderBottom: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}
            >
              <div className="flex items-center gap-3">
                {section !== 'main' && (
                  <button
                    onClick={() => setSection('main')}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: itemBg, color: sub }}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <h2 className="font-semibold" style={{ color: text }}>{sectionTitles[section]}</h2>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: itemBg, color: sub }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {sections[section]}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
