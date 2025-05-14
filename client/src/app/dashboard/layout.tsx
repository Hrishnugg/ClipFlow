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
  const [userData, setUserData] = useState<any>(null);
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
    (!userData?.isCoach || userData.isCoach === false) && 
    (!userData?.isStudent || userData.isStudent === false) && 
    (!userData?.isParent || userData.isParent === false);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>
      <div className="flex relative z-10 min-h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-24 transition-all duration-300 ease-in-out">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 max-w-7xl min-h-[calc(100vh-2rem)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
