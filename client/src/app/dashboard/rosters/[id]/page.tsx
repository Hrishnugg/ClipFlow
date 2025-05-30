'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getUserSelectedTeam, getTeamById } from '@/firebase/firestore';
import { Search } from 'lucide-react';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
}

interface Roster {
  id: string;
  name: string;
  userUID: string;
  teamID: string; // We're keeping this as string since rosters belong to only one team
  students: Student[];
}

export default function RosterDetail() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const rosterId = params.id as string;

  const fetchRosterDetails = useCallback(async () => {
    if (!user || !rosterId) return;
    
    try {
      setLoading(true);
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const data = rosterSnap.data();
        const selectedTeam = await getUserSelectedTeam(user.uid);
        
        if (data.teamID !== selectedTeam) {
          console.error('Unauthorized access to roster');
          router.push('/dashboard');
          return;
        }
        
        const team = await getTeamById(selectedTeam!);
        if (!team || !team.members.includes(user.email!)) {
          console.error('User is not a coach on this team');
          router.push('/dashboard');
          return;
        }
        
        setRoster({
          id: rosterSnap.id,
          name: data.name,
          userUID: data.userUID,
          teamID: data.teamID,
          students: data.students || []
        });
      } else {
        console.error('Roster not found');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    } finally {
      setLoading(false);
    }
  }, [user, rosterId, router]);
  
  useEffect(() => {
    if (user && rosterId) {
      fetchRosterDetails();
    }
  }, [user, rosterId, fetchRosterDetails]);

  const filteredStudents = roster?.students.filter(student => {
    if (searchQuery.length < 2) return true;
    
    return student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           student.parentEmail.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  return (
    <div className="p-8 w-full">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/rosters')}
          className="text-[#2D9CDB] hover:text-blue-400 flex items-center"
        >
          <span className="mr-1">←</span> Back to Rosters
        </button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{roster?.name || 'Roster Details'}</h1>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-gray-300">Loading roster details...</span>
          </div>
        </div>
      ): !roster ? (
        <div className="bg-gray-800 shadow-lg rounded-lg p-8 text-center">
          <p className="mb-4">Roster not found.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {roster.students.length === 0 ? (
            <div className="p-8 text-center">
              <p>No students in this roster.</p>
            </div>
          ) : (
            <div>
              <div className="p-4 border-b border-gray-800/50">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-sm font-medium text-white">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-sm font-medium text-white">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-sm font-medium text-white">
                        Parent Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center text-white mr-3">
                            {student.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {student.parentEmail}
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
                {searchQuery.length >= 2 && filteredStudents.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No students match your search query.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
