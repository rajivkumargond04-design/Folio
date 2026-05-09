import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { login as apiLogin } from '../utils/api';
import toast from 'react-hot-toast';

const FloatingParticle = ({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-violet-500/10 blur-sm"
    style={{ left: x, top: y, width: size, height: size }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.7, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
  />
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, checkSession } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useUniversal, setUseUniversal] = useState(false);

  useEffect(() => {
    if (checkSession()) {
      navigate('/library');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await apiLogin(password);
      login(res.data.username, res.data.token);
      toast.success(`Welcome back, ${res.data.username}!`);
      navigate('/library');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const particles = [
    { delay: 0, x: '10%', y: '20%', size: 60 },
    { delay: 1, x: '80%', y: '10%', size: 40 },
    { delay: 2, x: '60%', y: '70%', size: 80 },
    { delay: 0.5, x: '30%', y: '80%', size: 50 },
    { delay: 1.5, x: '90%', y: '50%', size: 35 },
    { delay: 3, x: '5%', y: '60%', size: 45 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] flex items-center justify-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 20% 50%, #1e1b4b 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #2d1b69 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, #0f172a 0%, transparent 60%)',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.06) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Floating particles */}
      {particles.map((p, i) => <FloatingParticle key={i} {...p} />)}

      {/* Glowing orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', left: '-10%', top: '-10%' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #6d28d9, transparent)', right: '-5%', bottom: '-5%' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              {/* Logo */}
              <motion.div
                className="flex items-center justify-center mb-8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    animate={{ boxShadow: ['0 0 30px rgba(124,58,237,0.3)', '0 0 60px rgba(124,58,237,0.6)', '0 0 30px rgba(124,58,237,0.3)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BookOpen className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.div
                    className="absolute -inset-2 rounded-3xl opacity-30"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', filter: 'blur(15px)' }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* App name */}
              <motion.p
                className="text-violet-400 text-sm tracking-[0.3em] uppercase font-medium mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Folio
              </motion.p>

              {/* Greeting texts */}
              <motion.h1
                className="text-5xl md:text-6xl font-bold text-white mb-3 leading-tight"
                style={{ fontFamily: 'Playfair Display, serif' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Welcome Rajiv
              </motion.h1>

              <motion.p
                className="text-xl text-gray-400 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Your Library Awaits
              </motion.p>

              <motion.p
                className="text-sm text-gray-600 mb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                Login to Continue Reading
              </motion.p>

              {/* Decorative book stack */}
              <motion.div
                className="flex justify-center gap-2 mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2d1b69'].map((color, i) => (
                  <motion.div
                    key={i}
                    className="rounded-sm"
                    style={{ width: 8 + i * 4, height: 50 - i * 4, background: color, opacity: 0.7 - i * 0.1 }}
                    animate={{ y: [0, -5 + i * 2, 0] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>

              <motion.button
                onClick={() => setShowLogin(true)}
                className="w-full py-4 rounded-2xl text-white font-semibold text-lg relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #4338ca)' }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />
                  Enter Reading Room
                </span>
              </motion.button>

              <motion.p
                className="mt-6 text-gray-700 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                Private & Secure Access Only
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Login card */}
              <div
                className="rounded-3xl p-8 border"
                style={{
                  background: 'rgba(15, 12, 30, 0.8)',
                  backdropFilter: 'blur(40px)',
                  borderColor: 'rgba(124, 58, 237, 0.2)',
                  boxShadow: '0 0 0 1px rgba(124,58,237,0.1), 0 40px 80px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Folio</h2>
                    <p className="text-gray-500 text-xs">Private Reading Room</p>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Welcome Rajiv!
                </h3>
                <p className="text-gray-500 text-sm mb-6">Enter your password to access the library</p>

                {/* Universal password toggle */}
                <div className="flex gap-2 mb-6">
                  {['Standard Login', 'Recovery Login'].map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => { setUseUniversal(i === 1); setError(''); }}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: (i === 1) === useUniversal ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.05)',
                        color: (i === 1) === useUniversal ? '#fff' : '#6b7280',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">
                      {useUniversal ? 'Universal / Recovery Password' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="Enter password"
                        className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-600 outline-none transition-all text-sm"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold relative overflow-hidden disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        Sign In
                      </span>
                    )}
                  </motion.button>
                </form>
              </div>

              <button
                onClick={() => { setShowLogin(false); setError(''); setPassword(''); }}
                className="mt-4 w-full text-center text-gray-600 hover:text-gray-400 text-sm transition-colors"
              >
                ← Back to Welcome
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
