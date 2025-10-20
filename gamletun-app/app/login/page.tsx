import LoginForm from '@/components/auth/LoginForm';
import { FaTractor } from 'react-icons/fa';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl mb-4">
            <FaTractor className="text-5xl text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Gamletun Vedlikehold
          </h1>
          <p className="text-gray-600">Logg inn for å fortsette</p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">© 2025 Gamletun. Alle rettigheter reservert.</p>
          <p className="text-xs text-gray-400 mt-1">www.gamletun.no</p>
        </div>
      </div>
    </div>
  );
}
