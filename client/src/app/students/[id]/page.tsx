'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

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

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!user || !params.id) return;
      
      try {
        const studentRef = doc(db, 'students', params.id);
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
            where('studentIds', 'array-contains', params.id)
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
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Student Details</h1>
        <p>Loading student information...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Student Details</h1>
        <p>Student not found.</p>
        <Link href="/students" className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link href="/students" className="text-blue-500 hover:underline mb-4 inline-block">
        ← Back to Students
      </Link>
      
      <h1 className="text-2xl font-bold mb-6">{student.name}</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Student Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Email</p>
            <p>{student.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Parent Email</p>
            <p>{student.parentEmail}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Videos</h2>
        
        {videos.length === 0 ? (
          <p>No videos found for this student.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <Link 
                href={`/view_video/${video.id}`} 
                key={video.id}
                className="block p-4 bg-gray-50 rounded-lg hover:shadow transition-shadow"
              >
                <h3 className="font-medium">{video.title}</h3>
                <p className="text-sm text-gray-500">{video.uploadDate}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
