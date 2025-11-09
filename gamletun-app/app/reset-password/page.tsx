'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Image from 'next/image';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user came from password reset email
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setValidSession(true);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passordene matcher ikke');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Update user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError('Kunne ikke oppdatere passord. Prøv igjen eller be om en ny tilbakestillingslenke.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  };

  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600 p-4 rounded-2xl shadow-xl mb-4">
              <FaExclamationTriangle className="text-5xl text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
              Ugyldig lenke
            </h1>
            <p className="text-gray-600">Denne tilbakestillingslenken er ugyldig eller utløpt</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center space-y-4">
              <p className="text-gray-700">
                Tilbakestillingslenken har utløpt eller er allerede brukt.
              </p>
              <p className="text-sm text-gray-600">
                Vennligst be om en ny tilbakestillingslenke.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/forgot-password"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
              >
                Be om ny lenke
              </Link>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors py-2 text-sm"
              >
                Tilbake til pålogging
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">© 2025 Gamletun. Alle rettigheter reservert.</p>
            <p className="text-xs text-gray-400 mt-1">www.gamletun.no</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600 p-4 rounded-2xl shadow-xl mb-4 animate-bounce">
              <FaCheckCircle className="text-5xl text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Passordet er oppdatert!
            </h1>
            <p className="text-gray-600">Du blir sendt til påloggingssiden...</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center space-y-4">
              <p className="text-gray-700">
                Ditt passord er nå oppdatert.
              </p>
              <p className="text-sm text-gray-600">
                Du kan nå logge inn med ditt nye passord.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
              >
                Gå til pålogging
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">© 2025 Gamletun. Alle rettigheter reservert.</p>
            <p className="text-xs text-gray-400 mt-1">www.gamletun.no</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white p-6 rounded-2xl shadow-xl mb-4">
            <div className="relative h-20 w-48"><Image src="/logo.png" alt="Gamletun Gaard" fill className="object-contain" priority /></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nytt passord
          </h1>
          <p className="text-gray-600">Skriv inn ditt nye passord</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nytt passord
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minst 6 tegn</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Bekreft passord
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <FaLock />
              {loading ? 'Oppdaterer...' : 'Oppdater passord'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">© 2025 Gamletun. Alle rettigheter reservert.</p>
          <p className="text-xs text-gray-400 mt-1">www.gamletun.no</p>
        </div>
      </div>
    </div>
  );
}
