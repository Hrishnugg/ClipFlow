'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/navigation/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  interface UserData {
    isCoach?: boolean | null;
    isStudent?: boolean | null;
    isParent?: boolean | null;
    selectedView?: string;
    [key: string]: unknown;
  }
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [, setSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoadingUserData(false);
        }
      }
    };

    fetchUserData();
  }, [user]);
  
  useEffect(() => {
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState) {
      setSidebarCollapsed(storedState === 'true');
    }
  }, []);
  
  useEffect(() => {
    const checkAccess = async () => {
      if (user && !loadingUserData && userData) {
        const userSelectedView = userData.selectedView;
        
        const restrictedPaths = ['/dashboard/rosters', '/dashboard/students', '/dashboard/process_video', '/dashboard/invite', '/dashboard/create_team'];
        const currentPath = window.location.pathname;
        
        if (userSelectedView === 'Student View' && 
            (restrictedPaths.includes(currentPath) || 
             currentPath.startsWith('/dashboard/rosters/') || 
             currentPath.startsWith('/dashboard/students/'))) {
          console.log(`Redirecting ${userSelectedView} from restricted page`);
          router.push('/dashboard');
        }
        
        if (userSelectedView === 'Parent View' && 
            (restrictedPaths.includes(currentPath) || 
             currentPath.startsWith('/dashboard/rosters/') || 
             (currentPath.startsWith('/dashboard/students/') && !currentPath.startsWith('/dashboard/student_videos')))) {
          console.log(`Redirecting ${userSelectedView} from restricted page`);
          router.push('/dashboard');
        }
      }
    };
    
    checkAccess();
  }, [user, loadingUserData, userData, router]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // This will not be rendered as the useEffect will redirect
  }

  if (loadingUserData) {
    return <div className="flex justify-center items-center min-h-screen">Loading user data...</div>;
  }

  const hasNoRoles = 
    !userData?.isCoach && 
    !userData?.isStudent && 
    !userData?.isParent;

  if (hasNoRoles) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4">No Team Access</h2>
          <p>You do not belong to a team. Please contact an admin to get set up.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="w-full ml-24 transition-all duration-300 ease-in-out">
        {children}
      </div>
    </div>
  );
}
