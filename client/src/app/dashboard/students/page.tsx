'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { getUserSelectedTeam } from '../../../firebase/firestore';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  user_uid?: string;
  teamID?: string[];
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const selectedTeam = await getUserSelectedTeam(user.uid);
      
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
      
      const studentsData: Student[] = [];
      studentsSnapshot.forEach((doc) => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          name: data.name,
          email: data.email,
          parentEmail: data.parentEmail,
          user_uid: data.user_uid,
          teamID: data.teamID
        });
      });
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);
  
  useEffect(() => {
    const handleTeamChange = () => {
      fetchStudents();
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, []);
  
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
      <h1 className="text-2xl font-bold mb-6">Students</h1>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-gray-300">Loading students...</span>
          </div>
        </div>
      ): students.length === 0 ? (
        <p>
          {selectedTeam 
            ? "No students found. Upload a roster to add students." 
            : "Please create a team and upload a roster to view students."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Link 
              href={`/dashboard/students/${student.id}`} 
              key={student.id}
              className="block"
            >
              <div className="glass-card hover-lift h-full">
                <h2 className="text-lg font-semibold mb-2">{student.name}</h2>
                <p className="text-gray-400 text-sm">{student.email}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
