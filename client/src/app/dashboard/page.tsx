'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
          <span className="text-sm text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="glass-card max-w-md w-full py-8">
        <h1 className="text-2xl font-bold mb-6 text-center pt-5">Dashboard</h1>
        <div className="mb-6 text-center">
          <p className="text-lg mb-2">
            Welcome <span className="font-semibold">{user.displayName}</span>
          </p>
          <p className="text-gray-300 pb-5">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
