'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import { useAuth } from '@/context/AuthContext';
import { getTeamsForUser, updateUserSelectedTeam, getUserSelectedTeam } from '@/firebase/firestore';

export default function Sidebar() {
  const pathname = usePathname();
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const storedExpandState = localStorage.getItem('teamsExpanded');
    if (storedExpandState) {
      setIsTeamsExpanded(storedExpandState === 'true');
    } else if (pathname === '/create_team') {
      setIsTeamsExpanded(true);
    }
  }, []);
  
  const fetchTeams = useCallback(async () => {
    if (!user) return;
    
    try {
      const userTeams = await getTeamsForUser(user.uid);
      setTeams(userTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user, fetchTeams]);
  
  useEffect(() => {
    const fetchSelectedTeam = async () => {
      if (!user) return;
      
      try {
        const userSelectedTeam = await getUserSelectedTeam(user.uid);
        setSelectedTeam(userSelectedTeam);
      } catch (error) {
        console.error('Error fetching selected team:', error);
      }
    };
    
    fetchSelectedTeam();
  }, [user]);
  
  useEffect(() => {
    if (user && teams.length === 1 && !selectedTeam) {
      handleTeamSelect(teams[0].id);
    }
  }, [user, teams, selectedTeam]);
  
  useEffect(() => {
    console.log('Selected Team:', selectedTeam);
  }, [selectedTeam]);
  
  useEffect(() => {
    const handleRefreshTeams = () => {
      fetchTeams();
    };
    
    window.addEventListener('refresh-teams', handleRefreshTeams);
    
    return () => {
      window.removeEventListener('refresh-teams', handleRefreshTeams);
    };
  }, [fetchTeams]);
  
  const handleTeamSelect = async (teamId: string) => {
    if (!user) return;
    
    if (selectedTeam === teamId) return;
    
    try {
      await updateUserSelectedTeam(user.uid, teamId);
      setSelectedTeam(teamId);
      console.log('Team selected:', teamId);
      
      const currentPath = window.location.pathname;
      if (currentPath === '/rosters' || currentPath === '/students') {
        window.location.reload();
      } else if (currentPath.startsWith('/rosters/')) {
        window.location.href = '/rosters';
      } else if (currentPath.startsWith('/students/')) {
        window.location.href = '/students';
      }
    } catch (error) {
      console.error('Error updating selected team:', error);
    }
  };
  
  const isTeamSelected = (teamId: string) => {
    return selectedTeam === teamId;
  };

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
  };

  const toggleTeamsExpand = () => {
    const newState = !isTeamsExpanded;
    setIsTeamsExpanded(newState);
    localStorage.setItem('teamsExpanded', newState.toString());
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
                  <div 
                    onClick={() => {
                      window.location.href = "/create_team";
                    }}
                    className={`flex items-center justify-between px-6 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isActive('/create_team')}`}
                  >
                    <span>+ Create Team</span>
                  </div>
                </li>
                {teams.map((team) => (
                  <li key={team.id} className="mb-2">
                    <div 
                      onClick={() => handleTeamSelect(team.id)}
                      className={`flex items-center justify-between px-6 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                    >
                      <span>{team.name}</span>
                      {selectedTeam === team.id && <span className="text-blue-600 font-bold ml-2">✓</span>}
                    </div>
                  </li>
                ))}
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
