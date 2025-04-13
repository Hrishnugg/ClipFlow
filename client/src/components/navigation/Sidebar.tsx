'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
  };

  return (
    <div className="w-64 h-screen shadow-md bg-white dark:bg-gray-800 fixed left-0 top-0">
      <div className="py-4 px-6">
        <h2 className="text-xl font-bold">ClipFlow</h2>
      </div>
      <nav className="mt-6">
        <ul>
          <li className="mb-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center px-6 py-3 ${isActive('/dashboard')} transition-colors`}
            >
              <span>Dashboard</span>
            </Link>
          </li>
          <li className="mb-2">
            <Link 
              href="/rosters" 
              className={`flex items-center px-6 py-3 ${isActive('/rosters')} transition-colors`}
            >
              <span>Rosters</span>
            </Link>
          </li>
          <li className="mb-2">
            <Link 
              href="/process_video" 
              className={`flex items-center px-6 py-3 ${isActive('/process_video')} transition-colors`}
            >
              <span>Process Video</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
