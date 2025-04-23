'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
  userUID: string;
}

interface Video {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  uploadDate: { toDate?: () => Date } | Date;
  rosterIds: string[];
}

export default function StudentDetail() {
  const [student, setStudent] = useState<Student | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const fetchStudentDetails = useCallback(async () => {
    if (!user || !studentId) return;
    
    try {
      setLoading(true);
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        
        if (data.userUID !== user.uid) {
          console.error('Unauthorized access to student');
          router.push('/students');
          return;
        }
        
        setStudent({
          id: studentSnap.id,
          name: data.name,
          email: data.email,
          parentEmail: data.parentEmail || '',
          nickname: data.nickname || '',
          userUID: data.userUID
        });
        
        const videosRef = collection(db, 'videos');
        const videoQuery = query(videosRef, where('userUID', '==', user.uid));
        const videoSnapshot = await getDocs(videoQuery);
        
        const studentVideos: Video[] = [];
        videoSnapshot.forEach((doc) => {
          const videoData = doc.data();
          
          if (videoData.rosterIds && videoData.rosterIds.length > 0) {
            studentVideos.push({
              id: doc.id,
              title: videoData.title,
              fileName: videoData.fileName,
              fileSize: videoData.fileSize,
              uploadDate: videoData.uploadDate,
              rosterIds: videoData.rosterIds
            });
          }
        });
        
        setVideos(studentVideos);
      } else {
        console.error('Student not found');
        router.push('/students');
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  }, [user, studentId, router]);
  
  useEffect(() => {
    if (user && studentId) {
      fetchStudentDetails();
    }
  }, [user, studentId, fetchStudentDetails]);

  const formatDate = (timestamp: { toDate?: () => Date } | Date | null) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="mb-6">
          <div className="mb-3">
            <button
              onClick={() => router.push('/students')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Students
            </button>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{student?.name || 'Student Details'}</h1>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading student details...</p>
          </div>
        ) : !student ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">Student not found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Student Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Name:</p>
                    <p className="text-gray-900 dark:text-white">{student.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Email:</p>
                    <p className="text-gray-900 dark:text-white">{student.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Parent Email:</p>
                    <p className="text-gray-900 dark:text-white">{student.parentEmail || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Nickname:</p>
                    <p className="text-gray-900 dark:text-white">{student.nickname || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Associated Videos</h2>
                {videos.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No videos associated with this student.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map((video) => (
                      <Link 
                        href={`/view_video/${video.id}`} 
                        key={video.id}
                        className="block"
                      >
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">{video.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded: {formatDate(video.uploadDate)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
