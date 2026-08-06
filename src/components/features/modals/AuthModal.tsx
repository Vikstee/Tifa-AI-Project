import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, waNumber }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Pendaftaran gagal.');
        }

        setIsSignUp(false);
        setSuccessMessage('Pendaftaran akun berhasil! Silakan masuk menggunakan akun Anda.');
        setPassword('');
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Login gagal.');
        }

        if (data.token && data.user) {
          onLoginSuccess(data.token, data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Autentikasi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-telkom-sidebar w-full max-w-md m-4 rounded-2xl p-6 relative animate-in fade-in zoom-in duration-200 border border-transparent dark:border-telkom-border-dark animate-smoky-shadow">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-telkom-gray dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-telkom-border-dark transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {isSignUp ? 'Daftar Akun TIFA' : 'Masuk ke TIFA'}
          </h2>
          <p className="text-gray-500 dark:text-telkom-gray text-sm">
            {isSignUp
              ? 'Daftar akun baru untuk mulai menggunakan sistem TIFA AI.'
              : 'Silakan masuk menggunakan akun Anda untuk memulai percakapan.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm border border-green-200 dark:border-green-800">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Viki Firmansyah"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-telkom-dark border border-gray-200 dark:border-telkom-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-telkom-red transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@telkom.co.id"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-telkom-dark border border-gray-200 dark:border-telkom-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-telkom-red transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-telkom-dark border border-gray-200 dark:border-telkom-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-telkom-red transition-all"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                No. WhatsApp (Opsional)
              </label>
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="628123456789"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-telkom-dark border border-gray-200 dark:border-telkom-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-telkom-red transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-telkom-red hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-md shadow-telkom-red/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              'Daftar Sekarang'
            ) : (
              'Masuk Akun'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-telkom-gray">
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccessMessage('');
            }}
            className="text-telkom-red font-medium hover:underline focus:outline-none"
          >
            {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
