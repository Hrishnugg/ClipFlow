'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import { useAuth } from '@/context/AuthContext';
import { getTeamsForUser, updateUserSelectedTeam, getUserSelectedTeam, getUser, updateUserSelectedView, getTeamsForStudent, getTeamsForParent } from '@/firebase/firestore';
import { ChevronLeft, ChevronRight, Home, BookOpen, FileText, User, Menu, X } from 'lucide-react';
import { TeamData } from '@/firebase/firestore';

const SIDEBAR_EXPANDED_WIDTH = 'w-64';
const SIDEBAR_COLLAPSED_WIDTH = 'w-22';

const useSidebarCollapse = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    if (!isMobile) {
      const storedState = localStorage.getItem('sidebarCollapsed');
      if (storedState) {
        setIsCollapsed(storedState === 'true');
      }
    }
  }, [isMobile]);

  const toggleCollapse = useCallback(() => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      localStorage.setItem('sidebarCollapsed', newState.toString());
    }
  }, [isCollapsed, isMobile, isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  return { isCollapsed, toggleCollapse, isMobile, isMobileMenuOpen, closeMobileMenu };
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<{isCoach?: boolean; isStudent?: boolean; isParent?: boolean}>({});
  const [selectedView, setSelectedView] = useState<string>('');
  const [isViewChanging, setIsViewChanging] = useState(false);
  const { isCollapsed, toggleCollapse, isMobile, isMobileMenuOpen, closeMobileMenu } = useSidebarCollapse();
  const { user } = useAuth();
  
  useEffect(() => {
    const storedExpandState = localStorage.getItem('teamsExpanded');
    if (storedExpandState) {
      setIsTeamsExpanded(storedExpandState === 'true');
    } else if (pathname === '/create_team') {
      setIsTeamsExpanded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      handleTeamSelect(teams[0].id!);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      const currentPath = pathname;
      
      if (currentPath === '/dashboard/rosters' || currentPath === '/dashboard/students' || 
          currentPath === '/dashboard/process_video' || currentPath === '/dashboard/videos') {
        router.refresh();
      } else if (currentPath.startsWith('/dashboard/rosters/')) {
        router.push('/dashboard/rosters');
      } else if (currentPath.startsWith('/dashboard/students/')) {
        router.push('/dashboard/students');
      } else if (currentPath === '/dashboard/student_videos') {
        router.refresh();
      } else if (currentPath.startsWith('/dashboard/student_videos/')) {
        router.push('/dashboard/student_videos');
      }
    } catch (error) {
      console.error('Error updating selected team:', error);
    }
  };

  const handleViewSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user) return;
    
    const newView = e.target.value;
    if (selectedView === newView) return;
    
    try {
      setIsViewChanging(true);
      
      await updateUserSelectedView(user.uid, newView);
      setSelectedView(newView);
      console.log('View selected:', newView);
      
      let newTeams: TeamData[] = [];
      if (newView === 'Student View' && user.email) {
        newTeams = await getTeamsForStudent(user.email);
      } else if (newView === 'Parent View' && user.email) {
        newTeams = await getTeamsForParent(user.email);
      } else {
        newTeams = await getTeamsForUser(user.uid);
      }
      
      if (newTeams.length > 0) {
        await updateUserSelectedTeam(user.uid, newTeams[0].id!);
        setSelectedTeam(newTeams[0].id!);
      } else {
        setSelectedTeam(null);
      }
      
      setIsTeamsExpanded(false);
      localStorage.setItem('teamsExpanded', 'false');
      
      router.push('/dashboard');
      
      setTimeout(() => {
        setIsViewChanging(false);
      }, 300);
    } catch (error) {
      console.error('Error updating selected view:', error);
      setIsViewChanging(false); // Reset loading state on error
    }
  };

  const isActive = (path: string) => {
    return pathname === path || (path !== '/dashboard' && pathname?.startsWith(path)) 
      ? 'bg-gray-800/60 text-white' 
      : 'hover:bg-gray-800/30 hover:text-white';
  };

  const toggleTeamsExpand = () => {
    const newState = !isTeamsExpanded;
    setIsTeamsExpanded(newState);
    localStorage.setItem('teamsExpanded', newState.toString());
  };

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={toggleCollapse}
          className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-900/80 backdrop-blur-lg border border-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 w-full transform transition-transform duration-300 ease-in-out z-40 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : `${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH} h-screen fixed left-0 top-0 transition-all duration-300 ease-in-out z-40`
        } 
        flex flex-col bg-gray-900/60 backdrop-blur-lg border-r border-gray-800/50
      `}>
      {isViewChanging && (
        <div className="absolute inset-0 bg-gray-900 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-gray-300">Loading view...</span>
          </div>
        </div>
      )}
      <div className={`py-4 ${isCollapsed && !isMobile ? 'px-3 justify-center' : isMobile ? 'px-6 justify-center' : 'px-6 justify-start'} flex items-center border-b border-gray-800/50`}>
        {(!isCollapsed || isMobile) ? (
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
      <nav className="flex-grow overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          <li className="mb-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard')} transition-colors text-gray-200`}
              title={isCollapsed && !isMobile ? "Dashboard" : undefined}
              onClick={closeMobileMenu}
            >
              <Home size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
              {(!isCollapsed || isMobile) && <span>Dashboard</span>}
            </Link>
          </li>
          {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
            <>
              <li className="mb-2">
                <Link 
                  href="/dashboard/rosters" 
                  className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/rosters')} transition-colors text-gray-200`}
                  title={isCollapsed && !isMobile ? "Rosters" : undefined}
                  onClick={closeMobileMenu}
                >
                  <FileText size={24} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!isCollapsed || isMobile) && <span>Rosters</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/dashboard/students" 
                  className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/students')} transition-colors text-gray-200`}
                  title={isCollapsed && !isMobile ? "Students" : undefined}
                  onClick={closeMobileMenu}
                >
                  <User size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!isCollapsed || isMobile) && <span>Students</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/dashboard/process_video" 
                  className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/process_video')} transition-colors text-gray-200`}
                  title={isCollapsed && !isMobile ? "Process Video" : undefined}
                  onClick={closeMobileMenu}
                >
                  <FileText size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!isCollapsed || isMobile) && <span>Process Video</span>}
                </Link>
              </li>
              <li className="mb-2">
                <Link 
                  href="/dashboard/invite" 
                  className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/invite')} transition-colors text-gray-200`}
                  title={isCollapsed && !isMobile ? "Invite" : undefined}
                  onClick={closeMobileMenu}
                >
                  <User size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                  {(!isCollapsed || isMobile) && <span>Invite</span>}
                </Link>
              </li>
            </>
          )}
          {selectedView === 'Student View' && (
            <li className="mb-2">
              <Link 
                href="/dashboard/videos" 
                className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/videos')} transition-colors text-gray-200`}
                title={isCollapsed && !isMobile ? "Videos" : undefined}
                onClick={closeMobileMenu}
              >
                <FileText size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                {(!isCollapsed || isMobile) && <span>Videos</span>}
              </Link>
            </li>
          )}
          {selectedView === 'Parent View' && (
            <li className="mb-2">
              <Link 
                href="/dashboard/student_videos" 
                className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} px-6 py-3 rounded-lg ${isActive('/dashboard/student_videos')} transition-colors text-gray-200`}
                title={isCollapsed && !isMobile ? "Student Videos" : undefined}
                onClick={closeMobileMenu}
              >
                <FileText size={20} className={`${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                {(!isCollapsed || isMobile) && <span>Student Videos</span>}
              </Link>
            </li>
          )}
          <li className="mb-2">
            {(!isCollapsed || isMobile) && (
              <div 
                onClick={toggleTeamsExpand}
                className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors rounded-lg text-gray-200 hover:bg-gray-800/30 hover:text-white`}
              >
                <div className="flex items-center">
                  <BookOpen size={20} className="mr-3" />
                  <span>
                    {selectedTeam 
                      ? ((teams.find(team => team.id === selectedTeam)?.name?.length ?? 0) > 15 
                          ? teams.find(team => team.id === selectedTeam)?.name?.substring(0, 12) + '...' 
                          : teams.find(team => team.id === selectedTeam)?.name)
                      : "Teams"}
                  </span>
                </div>
                <span className="text-xs">{isTeamsExpanded ? '▼' : '▶'}</span>
              </div>
            )}
            {(!isCollapsed || isMobile) && (
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isTeamsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <ul className="ml-4 transform transition-transform duration-300 ease-in-out">
                  {selectedView !== 'Student View' && selectedView !== 'Parent View' && (
                    <li className="mb-2">
                      <div 
                        onClick={() => {
                          router.push("/dashboard/create_team");
                          closeMobileMenu();
                        }}
                        className={`flex items-center justify-between px-6 py-2 transition-colors cursor-pointer rounded-lg text-gray-200 ${isActive('/dashboard/create_team')}`}
                      >
                        <span>+ Create Team</span>
                      </div>
                    </li>
                  )}
                  {teams.map((team) => (
                    <li key={team.id} className="mb-2">
                      <div 
                        onClick={() => {
                          handleTeamSelect(team.id!);
                          closeMobileMenu();
                        }}
                        className={`flex items-center justify-between px-6 py-2 transition-colors cursor-pointer rounded-lg text-gray-200 hover:bg-gray-800/30 hover:text-white`}
                      >
                        <span>{team.name}</span>
                        {selectedTeam === team.id && <span className="text-[#2D9CDB] font-bold ml-2">✓</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
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
      
      <div className={`p-4 border-t border-gray-800/50 ${isCollapsed && !isMobile ? 'items-center' : ''}`}>
        {(userRoles.isCoach || userRoles.isStudent || userRoles.isParent) && (!isCollapsed || isMobile) && (
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
        
        <SignOutButton collapsed={isCollapsed && !isMobile} />
      </div>
    </div>
    </>
  );
}
