'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
}

interface Video {
  id: string;
  title: string;
  uploadDate: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!user || !studentId) return;
      
      try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          setStudent({
            id: studentSnap.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail
          });
          
          const videosQuery = query(
            collection(db, 'videos'), 
            where('studentIds', 'array-contains', studentId)
          );
          
          const videosSnapshot = await getDocs(videosQuery);
          const videosData: Video[] = [];
          
          videosSnapshot.forEach((doc) => {
            const data = doc.data();
            videosData.push({
              id: doc.id,
              title: data.title,
              uploadDate: data.uploadDate
            });
          });
          
          setVideos(videosData);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [user, studentId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-black flex justify-center py-8">
          <p>Loading student information...</p>
        </div>
      );
    }

    if (!student) {
      return (
        <div>
          <p>Student not found.</p>
          <Link href="/students" className="text-blue-300 hover:underline mt-4 inline-block">
            Back to Students
          </Link>
        </div>
      );
    }

    return (
      <>
        <div className="mb-6">
          <Link 
            href="/students" 
            className="text-blue-400 hover:text-blue-200 flex items-center"
          >
            <span className="mr-1">←</span> Back to Students
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-xl font-bold">{student.name}</h1>
          <h2 className="text-md">{student.email}</h2>
        </div>
      </>
    );
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        {renderContent()}
      </div>
    </AuthenticatedLayout>
  );
}
