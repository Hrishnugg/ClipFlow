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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredVideos = videos.filter(video => {
    if (searchQuery.length < 2) return true;
    return video.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (filteredVideos.length > 0) {
        setSelectedVideo(filteredVideos[0]);
      } else {
        setSelectedVideo(null);
      }
    } else if (searchQuery.length === 0 && filteredVideos.length > 0) {
      setSelectedVideo(filteredVideos[0]);
    }
  }, [filteredVideos, searchQuery]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
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

    if (videos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-8">
          <div className="bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg max-w-md w-full py-8">
            <h1 className="text-2xl font-bold mb-6 text-center pt-5 text-gray-200">Your Videos</h1>
            <p className="text-center text-gray-400 pb-5">
              No videos assigned to you yet.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Video Playlist (left sidebar) */}
        <div className="w-full lg:w-64 lg:min-w-64 h-64 lg:h-full p-0 lg:p-4">
          <VideoPlaylist 
            videos={filteredVideos} 
            selectedVideoId={selectedVideo?.id || null} 
            onSelectVideo={handleSelectVideo}
            title="Your Videos"
            isStudentView={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 p-4 overflow-y-auto">
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
        <div className="w-full lg:w-64 h-64 lg:h-full p-4 overflow-y-auto">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              {selectedVideo ? (
                <StudentInfoSidebarReadOnly 
                  identifiedStudent={selectedVideo?.identifiedStudent || null}
                  confidenceLevel={selectedVideo?.confidenceLevel}
                  rosterId={selectedVideo?.rosterId}
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
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 w-full">
      {renderContent()}
    </div>
  );
}
