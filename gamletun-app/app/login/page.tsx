import LoginForm from '@/components/auth/LoginForm';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white p-6 rounded-2xl shadow-xl mb-4">
            <div className="relative h-20 w-48">
              <Image
                src="/logo.png"
                alt="Gamletun Gaard"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Vedlikeholdssystem
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
