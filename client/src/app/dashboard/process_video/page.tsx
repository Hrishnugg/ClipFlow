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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredVideos = videos.filter(video => {
    if (searchQuery.length < 2) return true;
    return video.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (videos.length > 0 && !selectedVideo) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, selectedVideo]);
  
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (filteredVideos.length > 0) {
        setSelectedVideo(filteredVideos[0]);
      } else {
        setSelectedVideo(null);
      }
    }
  }, [filteredVideos, searchQuery]);

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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2 px-6 rounded-md shadow hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
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
        <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full overflow-y-auto border-b lg:border-b-0 border-gray-200 dark:border-gray-700 p-0 lg:p-4">
          <VideoPlaylist 
            videos={filteredVideos} 
            selectedVideoId={selectedVideo?.id || null} 
            onSelectVideo={handleSelectVideo}
            title="Unreviewed Videos"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          {/* Video player */}
          <div className="mb-4">
            {selectedVideo ? (
              <VideoPlayer
                videoUrl={selectedVideo?.asset || null}
                title={selectedVideo?.title || ''}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg aspect-video">
                <div className="text-center p-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-200">No Video Selected</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    {searchQuery.length >= 2 ? "No videos match your search query." : "Please select a video from the playlist."}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Transcript section */}
          <div>
            {selectedVideo ? (
              <TranscriptSection transcript={selectedVideo?.transcript || null} />
            ) : (
              <div className="bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2 text-gray-200">Transcript</h3>
                <p className="text-gray-400 italic">No transcript available.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Student info sidebar */}
        <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto border-t lg:border-t-0 border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex-grow">
            {selectedVideo ? (
              <StudentInfoSidebar 
                identifiedStudent={selectedVideo?.identifiedStudent || null} 
                confidenceLevel={selectedVideo?.confidenceLevel}
                rosterId={selectedVideo?.rosterId}
                videoId={selectedVideo?.id}
                onStudentUpdate={handleStudentUpdate}
                duplicateStudent={selectedVideo?.duplicateStudent}
              />
            ) : (
              <div className="w-full h-full p-4 bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2 text-gray-200">Identified Student</h3>
                <p className="text-gray-400">
                  {searchQuery.length >= 2 ? "No videos match your search query." : "No video selected."}
                </p>
              </div>
            )}
          </div>
          
          {filteredVideos.length > 0 && selectedVideo && (
            <div className="flex-shrink-0 mt-3">
              <VideoActionsPanel 
                userUid={user?.uid || ''} 
                onUpdate={handleStudentUpdate}
                allVideosHaveIdentifiedStudents={filteredVideos.every(video => video.identifiedStudent !== "")}
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
