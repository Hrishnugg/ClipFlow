'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';

export default function Sidebar() {
  const pathname = usePathname();
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(false);
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
  };

  const toggleTeamsExpand = () => {
    setIsTeamsExpanded(!isTeamsExpanded);
  };

  return (
    <div className="w-64 h-screen shadow-md bg-white dark:bg-black fixed left-0 top-0 flex flex-col">
      <div className="py-4 px-6">
        <h2 className="text-xl font-bold">ClipFlow</h2>
      </div>
      <nav className="mt-6 flex-grow">
        <ul>
          <li className="mb-2">
            <div 
              onClick={toggleTeamsExpand}
              className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span>Teams</span>
              <span className="text-xs">{isTeamsExpanded ? '▼' : '▶'}</span>
            </div>
            {isTeamsExpanded && (
              <ul className="ml-4">
                <li className="mb-2">
                  <Link 
                    href="/create_team" 
                    className="flex items-center px-6 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>+ Create Team</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
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
              href="/students" 
              className={`flex items-center px-6 py-3 ${isActive('/students')} transition-colors`}
            >
              <span>Students</span>
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
          <li className="mb-2">
            <Link 
              href="/invite" 
              className={`flex items-center px-6 py-3 ${isActive('/invite')} transition-colors`}
            >
              <span>Invite</span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <SignOutButton />
      </div>
    </div>
  );
}
