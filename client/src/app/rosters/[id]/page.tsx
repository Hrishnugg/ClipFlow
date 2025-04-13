'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
}

interface Roster {
  id: string;
  name: string;
  userUID: string;
  students: Student[];
}

export async function generateStaticParams() {
  return [];
}

export default function RosterDetail() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const rosterId = params.id as string;

  useEffect(() => {
    if (user && rosterId) {
      fetchRosterDetails();
    }
  }, [user, rosterId]);

  const fetchRosterDetails = async () => {
    if (!user || !rosterId) return;
    
    try {
      setLoading(true);
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const data = rosterSnap.data();
        
        if (data.userUID !== user.uid) {
          console.error('Unauthorized access to roster');
          router.push('/rosters');
          return;
        }
        
        setRoster({
          id: rosterSnap.id,
          name: data.name,
          userUID: data.userUID,
          students: data.students || []
        });
      } else {
        console.error('Roster not found');
        router.push('/rosters');
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/rosters')}
            className="mr-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Rosters
          </button>
          <h1 className="text-2xl font-bold">{roster?.name || 'Roster Details'}</h1>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading roster details...</p>
          </div>
        ) : !roster ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">Roster not found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            {roster.students.length === 0 ? (
              <div className="p-8 text-center">
                <p>No students in this roster.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Parent Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {roster.students.map((student, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {student.parentEmail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
