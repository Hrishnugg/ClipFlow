'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useParams, useRouter } from 'next/navigation';
import VideoPlaylist from '@/components/video/VideoPlaylist';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptSection from '@/components/video/TranscriptSection';
import StudentInfoSidebarWithReassign from '@/components/video/StudentInfoSidebarWithReassign';
import { getUserSelectedTeam } from '@/firebase/firestore';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
}

interface Video {
  id: string;
  title: string;
  asset: string;
  transcript: string;
  identifiedStudent: string;
  confidenceLevel: number;
  isReviewed: boolean;
  uploadDate: string;
  rosterId?: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!user || !studentId) return;
      
      try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          const selectedTeam = await getUserSelectedTeam(user.uid);
          
          if (data.teamID !== selectedTeam) {
            console.error('Unauthorized access to student');
            router.push('/students');
            return;
          }
          
          const studentData = {
            id: studentSnap.id,
            name: data.name,
            email: data.email,
            parentEmail: data.parentEmail
          };
          setStudent(studentData);
          
          const videosQuery = query(
            collection(db, 'videos'),
            where('isReviewed', '==', true),
            where('identifiedStudent', '==', data.name)
          );
          
          const videosSnapshot = await getDocs(videosQuery);
          const videosData: Video[] = [];
          
          videosSnapshot.forEach((doc) => {
            const data = doc.data();
            videosData.push({
              id: doc.id,
              title: data.title,
              asset: data.asset,
              transcript: data.transcript,
              identifiedStudent: data.identifiedStudent,
              confidenceLevel: data.confidenceLevel || 100, // Default to 100 for reviewed videos
              isReviewed: data.isReviewed,
              uploadDate: data.uploadDate,
              rosterId: data.rosterId
            });
          });
          
          setVideos(videosData);
          if (videosData.length > 0) {
            setSelectedVideo(videosData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [user, studentId, refreshTrigger]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleStudentUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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

    if (videos.length === 0) {
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
          
          <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
            {/* Video Playlist (left sidebar) */}
            <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-gray-700">
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold">Student Videos</h2>
                </div>
                <div className="p-8 flex flex-col items-center justify-center h-[calc(100%-60px)]">
                  <div className="text-gray-500 dark:text-gray-400 text-center">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <p className="font-medium">No Videos Available</p>
                    <p className="text-sm mt-1">This student has no reviewed videos.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content area */}
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Video player */}
              <div className="mb-4">
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg aspect-video">
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400">No Video Selected</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This student has no reviewed videos available to display.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Transcript section */}
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium mb-2">Transcript</h3>
                  <p className="text-gray-500 dark:text-gray-400 italic">No transcript available.</p>
                </div>
              </div>
            </div>
            
            {/* Student info sidebar */}
            <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto border-t lg:border-l lg:border-t-0 border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No videos available for this student.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Upload and review videos to assign them to this student.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
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
        
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
          {/* Video Playlist (left sidebar) */}
          <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-gray-700">
            <VideoPlaylist 
              videos={videos} 
              selectedVideoId={selectedVideo?.id || null} 
              onSelectVideo={handleSelectVideo}
              title="Student Videos"
            />
          </div>
          
          {/* Main content area */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Video player */}
            <div className="mb-4">
              <VideoPlayer
                videoUrl={selectedVideo?.asset || null}
                title={selectedVideo?.title || ''}
              />
            </div>
            
            {/* Transcript section */}
            <div>
              <TranscriptSection transcript={selectedVideo?.transcript || null} />
            </div>
          </div>
          
          {/* Student info sidebar */}
          <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto border-t lg:border-l lg:border-t-0 border-gray-200 dark:border-gray-700">
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <StudentInfoSidebarWithReassign 
                  identifiedStudent={selectedVideo?.identifiedStudent || null} 
                  rosterId={selectedVideo?.rosterId}
                  videoId={selectedVideo?.id}
                  onStudentUpdate={handleStudentUpdate}
                />
              </div>
            </div>
          </div>
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
