'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import { useAuth } from '@/context/AuthContext';
import { getTeamsForUser, updateUserSelectedTeam, getUserSelectedTeam, getUser, updateUserSelectedView, getTeamsForStudent, getTeamsForParent } from '@/firebase/firestore';
import { ChevronLeft, ChevronRight, Home, BookOpen, FileText, Settings, User, LogOut } from 'lucide-react';

const SIDEBAR_EXPANDED_WIDTH = 'w-64';
const SIDEBAR_COLLAPSED_WIDTH = 'w-16';
const CONTENT_MARGIN_EXPANDED = 'ml-64';
const CONTENT_MARGIN_COLLAPSED = 'ml-16';

const useSidebarCollapse = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState) {
      setIsCollapsed(storedState === 'true');
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
    
    window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: { isCollapsed: newState } }));
  }, [isCollapsed]);

  return { isCollapsed, toggleCollapse };
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<{isCoach?: boolean; isStudent?: boolean; isParent?: boolean}>({});
  const [selectedView, setSelectedView] = useState<string>('');
  const { isCollapsed, toggleCollapse } = useSidebarCollapse();
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
      
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error updating selected view:', error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-600 text-white' : 'hover:bg-gray-700';
  };

  const toggleTeamsExpand = () => {
    const newState = !isTeamsExpanded;
    setIsTeamsExpanded(newState);
    localStorage.setItem('teamsExpanded', newState.toString());
  };

  return (
    <div className={`${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH} h-screen fixed left-0 top-0 flex flex-col bg-gray-900/60 backdrop-blur-lg border-r border-gray-800/50 transition-all duration-300 ease-in-out z-30`}>
      <div className={`py-4 ${isCollapsed ? 'px-3 justify-center' : 'px-6 justify-start'} flex items-center border-b border-gray-800/50`}>
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              ClipFlow
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              C
            </span>
          </Link>
        )}
      </div>
      <nav className="mt-6 flex-grow overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          <li className="mb-2">
            <div 
              onClick={toggleTeamsExpand}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-6 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors rounded-lg text-gray-400 hover:text-white`}
            >
              {!isCollapsed && <span>Teams</span>}
              {isCollapsed ? (
                <BookOpen size={20} className="text-white" />
              ) : (
                <span className="text-xs">{isTeamsExpanded ? '▼' : '▶'}</span>
              )}
            </div>
            {isTeamsExpanded && !isCollapsed && (
              <ul className="ml-4">
                {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
                  <li className="mb-2">
                    <div 
                      onClick={() => {
                        window.location.href = "/create_team";
                      }}
                      className={`flex items-center justify-between px-6 py-2 hover:bg-gray-800/30 transition-colors cursor-pointer rounded-lg text-gray-400 hover:text-white ${isActive('/create_team')}`}
                    >
                      <span>+ Create Team</span>
                    </div>
                  </li>
                )}
                {teams.map((team) => (
                  <li key={team.id} className="mb-2">
                    <div 
                      onClick={() => handleTeamSelect(team.id)}
                      className={`flex items-center justify-between px-6 py-2 hover:bg-gray-800/30 transition-colors cursor-pointer rounded-lg text-gray-400 hover:text-white`}
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
              className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard')} transition-colors text-gray-400 hover:text-white`}
              title={isCollapsed ? "Dashboard" : undefined}
            >
              <Home size={20} className={`${isCollapsed ? 'text-white' : 'mr-3'}`} />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
          </li>
          {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
            <>
              <li className="mb-2">
                <Link 
                  href="/rosters" 
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/rosters')} transition-colors text-gray-400 hover:text-white`}
                  title={isCollapsed ? "Rosters" : undefined}
                >
                  <FileText size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                  {!isCollapsed && <span>Rosters</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/students" 
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/students')} transition-colors text-gray-400 hover:text-white`}
                  title={isCollapsed ? "Students" : undefined}
                >
                  <User size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                  {!isCollapsed && <span>Students</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/process_video" 
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/process_video')} transition-colors text-gray-400 hover:text-white`}
                  title={isCollapsed ? "Process Video" : undefined}
                >
                  <FileText size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                  {!isCollapsed && <span>Process Video</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/invite" 
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/invite')} transition-colors text-gray-400 hover:text-white`}
                  title={isCollapsed ? "Invite" : undefined}
                >
                  <User size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                  {!isCollapsed && <span>Invite</span>}
                </Link>
              </li>
            </>
          )}
          {selectedView === 'Student View' && (
            <li className="mb-2">
              <Link 
                href="/videos" 
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/videos')} transition-colors text-gray-400 hover:text-white`}
                title={isCollapsed ? "Videos" : undefined}
              >
                <FileText size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                {!isCollapsed && <span>Videos</span>}
              </Link>
            </li>
          )}
          {selectedView === 'Parent View' && (
            <li className="mb-2">
              <Link 
                href="/student_videos" 
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/student_videos')} transition-colors text-gray-400 hover:text-white`}
                title={isCollapsed ? "Student Videos" : undefined}
              >
                <FileText size={20} className={`${isCollapsed ? 'text-white' : 'mr-3 text-gray-400'}`} />
                {!isCollapsed && <span>Student Videos</span>}
              </Link>
            </li>
          )}
        </ul>
      </nav>
      
      {/* Collapse button */}
      <div className="hidden md:flex justify-center py-2">
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse();
          }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      <div className={`p-4 border-t border-gray-800/50 ${isCollapsed ? 'items-center' : ''}`}>
        {(userRoles.isCoach || userRoles.isStudent || userRoles.isParent) && !isCollapsed && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Select View
            </label>
            <select
              value={selectedView}
              onChange={handleViewSelect}
              className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/60 text-gray-200 mb-4"
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
        
        {!isCollapsed ? (
          <SignOutButton />
        ) : (
          <LogOut 
            size={20} 
            onClick={() => {
              const signOutBtn = document.querySelector('button[class*="bg-red-600"]') as HTMLButtonElement;
              if (signOutBtn) signOutBtn.click();
            }} 
            className="text-white hover:text-white cursor-pointer" 
          />
        )}
      </div>
    </div>
  );
}
