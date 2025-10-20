'use client';

import { useState } from 'react';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import { signOut } from '@/app/actions/auth';

interface UserMenuProps {
  email: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white/80 rounded-xl transition-all border border-gray-200"
      >
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
          <FaUser className="text-white text-sm" />
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700">{email}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{email}</p>
              <p className="text-xs text-gray-500 mt-1">Gamletun Vedlikehold</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <FaSignOutAlt />
              {loading ? 'Logger ut...' : 'Logg ut'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
