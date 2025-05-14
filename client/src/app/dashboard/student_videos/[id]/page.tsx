'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getUserSelectedTeam } from '@/firebase/firestore';
import VideoPlaylist from '@/components/video/VideoPlaylist';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptSection from '@/components/video/TranscriptSection';
import StudentInfoSidebarReadOnly from '@/components/video/StudentInfoSidebarReadOnly';

interface Student {
  id: string;
  name: string;
  email: string;
  parentEmail: string;
  teamID?: string[];
}

interface Video {
  id: string;
  title: string;
  asset: string;
  transcript: string;
  identifiedStudent: string;
  identifiedStudentEmail?: string;
  confidenceLevel: number;
  isReviewed: boolean;
  uploadDate: string;
  rosterId?: string;
  teamID?: string;
}

export default function StudentVideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!user || !studentId) return;
      
      try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          const selectedTeam = await getUserSelectedTeam(user.uid);
          setSelectedTeam(selectedTeam);
          
          const teamIDs = Array.isArray(data.teamID) ? data.teamID : [data.teamID];
          
          if (!teamIDs.includes(selectedTeam)) {
            console.error('Unauthorized access to student');
            router.push('/dashboard/student_videos');
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
            where('identifiedStudentEmail', '==', data.email),
            where('teamID', '==', selectedTeam)
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
              identifiedStudentEmail: data.identifiedStudentEmail || '',
              confidenceLevel: data.confidenceLevel || 100, // Default to 100 for reviewed videos
              isReviewed: data.isReviewed,
              uploadDate: data.uploadDate,
              rosterId: data.rosterId,
              teamID: data.teamID
            });
          });
          
          videosData.sort((a, b) => {
            const dateA = new Date(a.uploadDate).getTime();
            const dateB = new Date(b.uploadDate).getTime();
            return dateB - dateA; // Descending order (newest first)
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
  }, [user, studentId, router]);
  
  useEffect(() => {
    if (videos.length > 0) {
      setSelectedVideo(videos[0]);
    }
  }, [videos]);
  
  useEffect(() => {
    const handleTeamChange = () => {
      router.push('/dashboard/student_videos');
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [router]);
  
  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-gray-300">Loading student information...</span>
          </div>
        </div>
      );
    }

    if (!student) {
      return (
        <div>
          <p>Student not found or you don't have access to this student.</p>
          <Link href="/dashboard/student_videos" className="text-[#2D9CDB] hover:text-blue-400 hover:underline mt-4 inline-block">
            Back to Student Videos
          </Link>
        </div>
      );
    }

    if (videos.length === 0) {
      return (
        <>
          <div className="mb-6">
            <Link 
              href="/dashboard/student_videos" 
              className="text-[#2D9CDB] hover:text-blue-400 flex items-center"
            >
              <span className="mr-1">←</span> Back to Student Videos
            </Link>
          </div>
          
          {/* Student name and email removed from here and moved to playlist header */}
          
          <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
            {/* Video Playlist (left sidebar) */}
            <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-gray-700 p-0 lg:p-4">
              <div className="w-full h-full bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg">
                <div className="p-4 border-b border-gray-800/50">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-200">{student.name}</h2>
                    <p className="text-sm text-gray-400">{student.email}</p>
                  </div>
                </div>
                <div className="p-8 flex flex-col items-center justify-center h-[calc(100%-60px)]">
                  <div className="text-gray-400 text-center">
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
                <div className="w-full h-full flex items-center justify-center bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg aspect-video">
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-400">No Video Selected</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      This student has no reviewed videos available to display.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Transcript section */}
              <div>
                <div className="bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-200">Transcript</h3>
                  <p className="text-gray-400 italic">No transcript available.</p>
                </div>
              </div>
            </div>
            
            {/* Student info sidebar */}
            <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto border-t lg:border-l lg:border-t-0 border-gray-200 dark:border-gray-700">
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <div className="w-full h-full p-4 bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2 text-gray-200">Identified Student</h3>
                    <p className="text-gray-400 mb-4">
                      No videos available for this student.
                    </p>
                    <p className="text-sm text-gray-400 mt-4">
                      Videos will appear here once they are reviewed and assigned to this student.
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
            href="/dashboard/student_videos" 
            className="text-[#2D9CDB] hover:text-blue-400 flex items-center"
          >
            <span className="mr-1">←</span> Back to Student Videos
          </Link>
        </div>
        
        {/* Student name and email removed from here and moved to playlist header */}
        
        <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
          {/* Video Playlist (left sidebar) */}
          <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-gray-700 p-0 lg:p-4">
            <VideoPlaylist 
              videos={videos} 
              selectedVideoId={selectedVideo?.id || null} 
              onSelectVideo={handleSelectVideo}
              studentName={student?.name}
              studentEmail={student?.email}
              isStudentView={true}
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
                <StudentInfoSidebarReadOnly 
                  identifiedStudent={selectedVideo?.identifiedStudent || null} 
                  confidenceLevel={selectedVideo?.confidenceLevel}
                  rosterId={selectedVideo?.rosterId}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="p-8 w-full">
      {renderContent()}
    </div>
  );
}
