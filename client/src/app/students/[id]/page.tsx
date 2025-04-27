'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useParams } from 'next/navigation';
import VideoPlaylist from '@/components/video/VideoPlaylist';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptSection from '@/components/video/TranscriptSection';
import StudentInfoSidebarWithReassign from '@/components/video/StudentInfoSidebarWithReassign';

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
            <h1 className="text-2xl font-bold">{student.name}</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
            <h2 className="text-black text-lg font-semibold mb-4">Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-black text-sm mb-1">Email</p>
                <p className="text-black text-base">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-black mb-1">Parent Email</p>
                <p className="text-black text-base">{student.parentEmail}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-black text-lg font-semibold mb-4">Videos</h2>
            <p className="text-black">No videos found for this student.</p>
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
          <h1 className="text-2xl font-bold">{student.name}</h1>
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
