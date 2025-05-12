'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { getUserSelectedTeam } from '../../../firebase/firestore';
import VideoPlaylist from '../../../components/video/VideoPlaylist';
import VideoPlayer from '../../../components/video/VideoPlayer';
import TranscriptSection from '../../../components/video/TranscriptSection';
import StudentInfoSidebarReadOnly from '../../../components/video/StudentInfoSidebarReadOnly';

interface Video {
  id: string;
  title: string;
  asset: string;
  transcript: string;
  identifiedStudent: string;
  identifiedStudentEmail?: string;
  duplicateStudent?: boolean;
  confidenceLevel: number;
  isReviewed: boolean;
  uploadDate: string;
  rosterId?: string;
  teamID?: string;
}

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!user || !user.email) return;
    
    try {
      setLoading(true);
      
      const selectedTeam = await getUserSelectedTeam(user.uid);
      
      if (!selectedTeam) {
        setVideos([]);
        setLoading(false);
        return;
      }
      
      const videosQuery = query(
        collection(db, 'videos'),
        where('identifiedStudentEmail', '==', user.email),
        where('isReviewed', '==', true),
        where('teamID', '==', selectedTeam)
      );
      
      const querySnapshot = await getDocs(videosQuery);
      
      const videosData: Video[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        videosData.push({
          id: doc.id,
          title: data.title,
          asset: data.asset,
          transcript: data.transcript,
          identifiedStudent: data.identifiedStudent,
          identifiedStudentEmail: data.identifiedStudentEmail || '',
          duplicateStudent: data.duplicateStudent || false,
          confidenceLevel: data.confidenceLevel || 100,
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
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleTeamChange = () => {
      fetchVideos();
    };
    
    window.addEventListener('refresh-teams', handleTeamChange);
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('refresh-teams', handleTeamChange);
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, [fetchVideos]);

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

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos, selectedTeam]);

  useEffect(() => {
    if (videos.length > 0) {
      setSelectedVideo(videos[0]);
    }
  }, [videos]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p>Loading videos...</p>
        </div>
      );
    }

    if (videos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
          <div className="bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Your Videos</h1>
            <p className="text-center text-gray-400">
              No videos assigned to you yet.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Video Playlist (left sidebar) */}
        <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-r lg:border-b-0 border-gray-200 dark:border-gray-700">
          <VideoPlaylist 
            videos={videos} 
            selectedVideoId={selectedVideo?.id || null} 
            onSelectVideo={handleSelectVideo}
            title="Your Videos"
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
    );
  };

  return (
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-6">Your Videos</h1>
      {renderContent()}
    </div>
  );
}
