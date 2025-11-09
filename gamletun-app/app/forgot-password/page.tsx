'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError('Kunne ikke sende tilbakestillings-e-post. Prøv igjen.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600 p-4 rounded-2xl shadow-xl mb-4">
              <FaCheckCircle className="text-5xl text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              E-post sendt!
            </h1>
            <p className="text-gray-600">Sjekk innboksen din</p>
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center space-y-4">
              <p className="text-gray-700">
                Vi har sendt en tilbakestillingslenke til:
              </p>
              <p className="font-semibold text-blue-600 text-lg">
                {email}
              </p>
              <p className="text-sm text-gray-600">
                Klikk på lenken i e-posten for å tilbakestille passordet ditt.
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Lenken er gyldig i 1 time.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
              >
                <FaArrowLeft />
                Tilbake til pålogging
              </Link>
            </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white p-6 rounded-2xl shadow-xl mb-4">
            <div className="relative h-20 w-48"><Image src="/logo.png" alt="Gamletun Gaard" fill className="object-contain" priority /></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Glemt passord?
          </h1>
          <p className="text-gray-600">Ingen problem, vi sender deg en tilbakestillingslenke</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-postadresse
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="din@epost.no"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Skriv inn e-postadressen din, så sender vi deg instruksjoner for å tilbakestille passordet.
              </p>
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
              <FaEnvelope />
              {loading ? 'Sender...' : 'Send tilbakestillingslenke'}
            </button>

            {/* Back to Login */}
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors py-2 text-sm"
            >
              <FaArrowLeft />
              Tilbake til pålogging
            </Link>
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
