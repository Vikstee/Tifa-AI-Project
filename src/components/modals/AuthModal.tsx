import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';

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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          onLoginSuccess(data.session.access_token, {
            id: data.user?.id,
            email: data.user?.email,
            name: data.user?.user_metadata?.full_name || email.split('@')[0],
          });
        } else {
          // Sometimes email confirmation is required by default on Supabase
          setIsSignUp(false);
          setSuccessMessage('Pendaftaran berhasil! Silakan login untuk melanjutkan.');
          setPassword('');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Email belum terdaftar atau password salah.');
          }
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Email belum dikonfirmasi. Harap matikan "Confirm email" di pengaturan Supabase Anda, atau cek kotak masuk email Anda.');
          }
          throw signInError;
        }
        if (data.session) {
          onLoginSuccess(data.session.access_token, {
            id: data.user?.id,
            email: data.user?.email,
            name: data.user?.user_metadata?.full_name || email.split('@')[0],
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Autentikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-telkom-sidebar w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200 border border-transparent dark:border-telkom-border-dark">
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
              ? 'Buat akun uji coba untuk mencoba aplikasi ini.'
              : 'Silakan masuk menggunakan akun Anda untuk memulai percakapan.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-500/20">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-telkom-red/50 text-gray-900 dark:text-white"
                placeholder="Nama Anda"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-telkom-red/50 text-gray-900 dark:text-white"
              placeholder="nama@telkominfra.co.id"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-telkom-red/50 text-gray-900 dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-telkom-red text-white rounded-lg font-medium hover:bg-telkom-red-dark transition-colors disabled:opacity-70 flex justify-center items-center mt-2"
          >
            {loading ? (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : isSignUp ? (
              'Daftar'
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-telkom-gray">
            {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMessage('');
              }}
              className="text-telkom-red hover:underline font-medium"
            >
              {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

