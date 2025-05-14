'use client';

import React, { useState, useEffect } from 'react';
import UploadVideoModal from '../../../components/modals/UploadVideoModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { getUserSelectedTeam } from '../../../firebase/firestore';
import VideoPlaylist from '../../../components/video/VideoPlaylist';
import VideoPlayer from '../../../components/video/VideoPlayer';
import TranscriptSection from '../../../components/video/TranscriptSection';
import StudentInfoSidebar from '../../../components/video/StudentInfoSidebar';
import VideoActionsPanel from '../../../components/video/VideoActionsPanel';

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

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isStudentUpdate, setIsStudentUpdate] = useState(false);
  const [hasMatchingRosters, setHasMatchingRosters] = useState(false);
  const { user } = useAuth();

  const fetchVideos = async () => {
    if (!user) return;
    
    try {
      const selectedTeam = await getUserSelectedTeam(user.uid);
      
      const videosQuery = query(
        collection(db, 'videos'), 
        where('user_uid', '==', user.uid),
        where('isReviewed', '==', false),
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
          confidenceLevel: data.confidenceLevel,
          isReviewed: data.isReviewed,
          uploadDate: data.uploadDate,
          rosterId: data.rosterId,
          teamID: data.teamID
        });
      });
      
      const sortedVideosData = [...videosData].sort((a, b) => {
        if (a.duplicateStudent && !b.duplicateStudent) return -1;
        if (!a.duplicateStudent && b.duplicateStudent) return 1;
        
        return a.confidenceLevel - b.confidenceLevel;
      });
      
      setVideos(sortedVideosData);
      
      if (isStudentUpdate && selectedVideo) {
        const updatedSelectedVideo = sortedVideosData.find(video => video.id === selectedVideo.id);
        if (updatedSelectedVideo) {
          setSelectedVideo(updatedSelectedVideo);
        }
        setIsStudentUpdate(false);
      }
      
      const rostersRef = collection(db, 'rosters');
      const rostersQuery = query(
        rostersRef,
        where('teamID', '==', selectedTeam)
      );
      const rostersSnapshot = await getDocs(rostersQuery);
      setHasMatchingRosters(!rostersSnapshot.empty);
      
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchVideos();
  }, [user, isProcessing, refreshTrigger]);
  
  useEffect(() => {
    const handleTeamChange = () => {
      fetchVideos();
    };
    
    window.addEventListener('team-selected', handleTeamChange);
    
    return () => {
      window.removeEventListener('team-selected', handleTeamChange);
    };
  }, []);

  useEffect(() => {
    if (videos.length > 0) {
      setSelectedVideo(videos[0]);
    }
  }, [videos]);

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleProcessingStatusChange = (isCurrentlyProcessing: boolean) => {
    setIsProcessing(isCurrentlyProcessing);
  };
  
  const handleStudentUpdate = () => {
    setIsStudentUpdate(true);
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-gray-300">Loading videos...</span>
          </div>
        </div>
      );
    }

    if (videos.length === 0 || isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
          <div className="glass-card max-w-md w-full py-8">
            <h1 className="text-2xl font-bold mb-6 text-center pt-5">Process Video</h1>
            <div className="flex justify-center pb-5">
              {hasMatchingRosters ? (
                <button
                  onClick={handleUpload}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-6 rounded-md shadow hover:shadow-lg transition-all duration-300"
                >
                  Upload Videos
                </button>
              ) : (
                <p className="text-center text-gray-400">
                  No rosters found. Upload a roster to get started.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Video Playlist (left sidebar) */}
        <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-b-0 border-gray-200 dark:border-gray-700 p-0 lg:pt-4 lg:pl-4">
          <VideoPlaylist 
            videos={videos} 
            selectedVideoId={selectedVideo?.id || null} 
            onSelectVideo={handleSelectVideo} 
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
        <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto border-t lg:border-t-0 border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex-grow">
            <StudentInfoSidebar 
              identifiedStudent={selectedVideo?.identifiedStudent || null} 
              confidenceLevel={selectedVideo?.confidenceLevel}
              rosterId={selectedVideo?.rosterId}
              videoId={selectedVideo?.id}
              onStudentUpdate={handleStudentUpdate}
              duplicateStudent={selectedVideo?.duplicateStudent}
            />
          </div>
          
          {videos.length > 0 && (
            <div className="flex-shrink-0 mt-3">
              <VideoActionsPanel 
                userUid={user?.uid || ''} 
                onUpdate={handleStudentUpdate}
                allVideosHaveIdentifiedStudents={videos.every(video => video.identifiedStudent !== "")}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {renderContent()}
      
      <UploadVideoModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onProcessingStatusChange={handleProcessingStatusChange}
      />
    </div>
  );
}
