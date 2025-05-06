'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getUserByEmail, updateExistingUserUid, updateTeamMemberIds } from '@/firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userEmail = user.email || '';
      if (!userEmail) {
        console.error('User email is null or undefined');
        return;
      }
      
      const existingUser = await getUserByEmail(userEmail);
      
      if (existingUser) {
        if (existingUser.uid !== user.uid) {
          await updateExistingUserUid(existingUser, user.uid, user.displayName);
          
          await updateTeamMemberIds(userEmail, user.uid);
        }
      } else {
        const userRef = doc(db, 'users', user.uid);
        const userData = {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          createdAt: new Date().toISOString(),
          isCoach: false
        };
        
        await setDoc(userRef, userData);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      
      localStorage.removeItem('firebase:authUser');
      sessionStorage.removeItem('firebase:authUser');
      
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
