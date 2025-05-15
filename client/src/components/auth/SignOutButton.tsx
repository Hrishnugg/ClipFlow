'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className={`w-full ${collapsed ? 'flex justify-center' : 'px-6'}`}>
      <button
        onClick={handleSignOut}
        className="flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <LogOut className={`h-4 w-4 ${!collapsed ? 'mr-2' : ''}`} />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </div>
  );
}
