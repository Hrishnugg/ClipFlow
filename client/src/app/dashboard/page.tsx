'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/auth/SignOutButton';
import AuthenticatedLayout from '../../../components/navigation/AuthenticatedLayout';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Dashboard</h1>
          <div className="mb-6">
            <p className="text-lg mb-2">
              Welcome <span className="font-semibold">{user.displayName}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
          </div>
          <div className="flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
