'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="glass-card max-w-md w-full py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Dashboard</h1>
        <div className="mb-6 text-center">
          <p className="text-lg mb-2">
            Welcome <span className="font-semibold">{user.displayName}</span>
          </p>
          <p className="text-gray-300">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
