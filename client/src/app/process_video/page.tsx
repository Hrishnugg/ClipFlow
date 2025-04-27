'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import VideoPlaylist from '@/components/video/VideoPlaylist';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptSection from '@/components/video/TranscriptSection';
import StudentInfoSidebar from '@/components/video/StudentInfoSidebar';

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

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user) return;
      
      try {
        const videosQuery = query(
          collection(db, 'videos'), 
          where('user_uid', '==', user.uid),
          where('isReviewed', '==', false)
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
            confidenceLevel: data.confidenceLevel,
            isReviewed: data.isReviewed,
            uploadDate: data.uploadDate,
            rosterId: data.rosterId
          });
        });
        
        setVideos(videosData);
        if (videosData.length > 0) {
          setSelectedVideo(videosData[0]);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [user, isProcessing]);

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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p>Loading videos...</p>
        </div>
      );
    }

    if (videos.length === 0 || isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Process Video</h1>
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
              >
                Upload Videos
              </button>
            </div>
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
          <StudentInfoSidebar 
            identifiedStudent={selectedVideo?.identifiedStudent || null} 
            confidenceLevel={selectedVideo?.confidenceLevel}
            rosterId={selectedVideo?.rosterId}
          />
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      {renderContent()}
      
      <UploadVideoModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        error={error}
        onProcessingStatusChange={handleProcessingStatusChange}
      />
    </AuthenticatedLayout>
  );
}
