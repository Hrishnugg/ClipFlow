'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { getUserSelectedTeam } from '../../../firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  user_uid?: string;
  teamID?: string[];
}

export default function StudentVideosPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const selectedTeam = await getUserSelectedTeam(user.uid);
        setSelectedTeam(selectedTeam);
        
        if (!selectedTeam) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const studentsQuery = query(
          collection(db, 'students'),
          where('teamID', 'array-contains', selectedTeam)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const initialStudents: Student[] = [];
        
        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          initialStudents.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail,
            user_uid: data.user_uid,
            teamID: data.teamID
          });
        });
        
        try {
          const rostersRef = collection(db, 'rosters');
          const rostersQuery = query(
            rostersRef,
            where('teamID', '==', selectedTeam)
          );
          const rostersSnapshot = await getDocs(rostersQuery);
          
          const filteredStudents = initialStudents.filter(student => {
            for (const rosterDoc of rostersSnapshot.docs) {
              const rosterData = rosterDoc.data();
              const rosterStudents = rosterData.students || [];
              
              for (const rosterStudent of rosterStudents) {
                if (rosterStudent.email === student.email && 
                    rosterStudent.parentEmail === user.email) {
                  return true;
                }
              }
            }
            return false;
          });
          
          filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(filteredStudents);
        } catch (rosterError) {
          console.error('Error fetching or processing rosters:', rosterError);
          const fallbackStudents = initialStudents.filter(student => 
            student.parentEmail === user.email
          );
          fallbackStudents.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(fallbackStudents);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]);
  
  useEffect(() => {
    const handleTeamChange = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const selectedTeam = await getUserSelectedTeam(user.uid);
        setSelectedTeam(selectedTeam);
        
        if (!selectedTeam) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const studentsQuery = query(
          collection(db, 'students'),
          where('teamID', 'array-contains', selectedTeam)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const initialStudents: Student[] = [];
        
        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          initialStudents.push({
            id: doc.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail,
            user_uid: data.user_uid,
            teamID: data.teamID
          });
        });
        
        try {
          const rostersRef = collection(db, 'rosters');
          const rostersQuery = query(
            rostersRef,
            where('teamID', '==', selectedTeam)
          );
          const rostersSnapshot = await getDocs(rostersQuery);
          
          const filteredStudents = initialStudents.filter(student => {
            for (const rosterDoc of rostersSnapshot.docs) {
              const rosterData = rosterDoc.data();
              const rosterStudents = rosterData.students || [];
              
              for (const rosterStudent of rosterStudents) {
                if (rosterStudent.email === student.email && 
                    rosterStudent.parentEmail === user.email) {
                  return true;
                }
              }
            }
            return false;
          });
          
          filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(filteredStudents);
        } catch (rosterError) {
          console.error('Error fetching or processing rosters:', rosterError);
          const fallbackStudents = initialStudents.filter(student => 
            student.parentEmail === user.email
          );
          fallbackStudents.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(fallbackStudents);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [user]);
  
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

  return (
    <div className="p-8 w-full">
      <h1 className="text-2xl font-bold mb-6">Student Videos</h1>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <p>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <p>
          {selectedTeam 
            ? "No students found associated with your email." 
            : "Please select a team to view students."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Link 
              href={`/dashboard/student_videos/${student.id}`} 
              key={student.id}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
            >
              <h2 className="text-black text-lg font-semibold mb-2">{student.name}</h2>
              <p className="text-gray-800 text-sm">{student.email}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
