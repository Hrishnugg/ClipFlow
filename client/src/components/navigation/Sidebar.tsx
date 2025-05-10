'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import { useAuth } from '@/context/AuthContext';
import { getTeamsForUser, updateUserSelectedTeam, getUserSelectedTeam, getUser, updateUserSelectedView, getTeamsForStudent, getTeamsForParent } from '@/firebase/firestore';

export default function Sidebar() {
  const pathname = usePathname();
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<{isCoach?: boolean; isStudent?: boolean; isParent?: boolean}>({});
  const [selectedView, setSelectedView] = useState<string>('');
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
      if (selectedView === 'Student View' && user.email) {
        const studentTeams = await getTeamsForStudent(user.email);
        setTeams(studentTeams);
      } else if (selectedView === 'Parent View' && user.email) {
        const parentTeams = await getTeamsForParent(user.email);
        setTeams(parentTeams);
      } else {
        const userTeams = await getTeamsForUser(user.uid);
        setTeams(userTeams);
      }

    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  }, [user, selectedView]);
  
  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user, fetchTeams, selectedView]);
  
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
    const fetchUserRoles = async () => {
      if (!user) return;
      
      try {
        const userData = await getUser(user.uid);
        if (userData) {
          setUserRoles({
            isCoach: userData.isCoach,
            isStudent: userData.isStudent,
            isParent: userData.isParent
          });
          
          let defaultView = '';
          if (userData.selectedView) {
            defaultView = userData.selectedView;
          } else if (userData.isCoach) {
            defaultView = 'Coach View';
          } else if (userData.isStudent) {
            defaultView = 'Student View';
          } else if (userData.isParent) {
            defaultView = 'Parent View';
          }
          
          setSelectedView(defaultView);
          
          if (defaultView && !userData.selectedView) {
            updateUserSelectedView(user.uid, defaultView)
              .then(() => console.log('Default view saved to database:', defaultView))
              .catch(error => console.error('Error saving default view to database:', error));
          }
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };
    
    fetchUserRoles();
  }, [user]);
  
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
      
      window.dispatchEvent(new Event('team-selected'));
      
      const currentPath = window.location.pathname;
      if (currentPath === '/rosters' || currentPath === '/students' || currentPath === '/process_video' || currentPath === '/videos') {
        window.location.reload();
      } else if (currentPath.startsWith('/rosters/')) {
        window.location.href = '/rosters';
      } else if (currentPath.startsWith('/students/')) {
        window.location.href = '/students';
      } else if (currentPath === '/student_videos') {
        window.location.reload();
      } else if (currentPath.startsWith('/student_videos/')) {
        window.location.href = '/student_videos';
      }
    } catch (error) {
      console.error('Error updating selected team:', error);
    }
  };
  
  const isTeamSelected = (teamId: string) => {
    return selectedTeam === teamId;
  };
  
  const handleViewSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user) return;
    
    const newView = e.target.value;
    if (selectedView === newView) return;
    
    try {
      await updateUserSelectedView(user.uid, newView);
      setSelectedView(newView);
      console.log('View selected:', newView);
      
      let newTeams: any[] = [];
      if (newView === 'Student View' && user.email) {
        newTeams = await getTeamsForStudent(user.email);
      } else if (newView === 'Parent View' && user.email) {
        newTeams = await getTeamsForParent(user.email);
      } else {
        newTeams = await getTeamsForUser(user.uid);
      }
      
      if (newTeams.length > 0) {
        await updateUserSelectedTeam(user.uid, newTeams[0].id);
      }
      
      window.location.reload();
    } catch (error) {
      console.error('Error updating selected view:', error);
    }
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
                {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
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
                )}
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
          {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
            <>
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
            </>
          )}
          {selectedView === 'Student View' && (
            <li className="mb-2">
              <Link 
                href="/videos" 
                className={`flex items-center px-6 py-3 ${isActive('/videos')} transition-colors`}
              >
                <span>Videos</span>
              </Link>
            </li>
          )}
          {selectedView === 'Parent View' && (
            <li className="mb-2">
              <Link 
                href="/student_videos" 
                className={`flex items-center px-6 py-3 ${isActive('/student_videos')} transition-colors`}
              >
                <span>Student Videos</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {(userRoles.isCoach || userRoles.isStudent || userRoles.isParent) && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select View
            </label>
            <select
              value={selectedView}
              onChange={handleViewSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
            >
              {userRoles.isCoach && (
                <option value="Coach View">Coach View</option>
              )}
              {userRoles.isStudent && (
                <option value="Student View">Student View</option>
              )}
              {userRoles.isParent && (
                <option value="Parent View">Parent View</option>
              )}
            </select>
          </div>
        )}
        <SignOutButton />
      </div>
    </div>
  );
}
