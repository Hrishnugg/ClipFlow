'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function AuthenticatedLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

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
    const checkAccess = async () => {
      if (user && !loadingUserData && userData) {
        const userSelectedView = userData.selectedView;
        
        const restrictedPaths = ['/rosters', '/students', '/process_video', '/invite', '/create_team'];
        const currentPath = window.location.pathname;
        
        if ((userSelectedView === 'Student View' || userSelectedView === 'Parent View') && 
            (restrictedPaths.includes(currentPath) || 
             currentPath.startsWith('/rosters/') || 
             currentPath.startsWith('/students/'))) {
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
    <div className="flex">
      <Sidebar />
      <div className="ml-64 w-full">
        {children}
      </div>
    </div>
  );
}
