'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { getUserSelectedTeam } from '@/firebase/firestore';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  teamID?: string[];
}

export default function StudentVideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!user || !studentId) return;
      
      try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          const selectedTeam = await getUserSelectedTeam(user.uid);
          
          const teamIDs = Array.isArray(data.teamID) ? data.teamID : [data.teamID];
          
          if (!teamIDs.includes(selectedTeam) || data.parentEmail !== user.email) {
            console.error('Unauthorized access to student');
            router.push('/student_videos');
            return;
          }
          
          const studentData = {
            id: studentSnap.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail
          };
          setStudent(studentData);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [user, studentId, router]);
  
  useEffect(() => {
    const handleTeamChange = () => {
      router.push('/student_videos');
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [router]);

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading student information...</p>
          </div>
        ) : !student ? (
          <div>
            <p>Student not found or you don't have access to this student.</p>
            <Link href="/student_videos" className="text-blue-300 hover:underline mt-4 inline-block">
              Back to Student Videos
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Link 
                href="/student_videos" 
                className="text-blue-400 hover:text-blue-200 flex items-center"
              >
                <span className="mr-1">←</span> Back to Student Videos
              </Link>
            </div>
            
            <div className="mb-6">
              <h1 className="text-xl font-bold">{student.name}</h1>
              <h2 className="text-md">{student.email}</h2>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-6">
              <p className="text-center text-gray-500">
                Student video details will be available soon.
              </p>
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
