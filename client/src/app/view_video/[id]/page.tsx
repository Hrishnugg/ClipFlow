'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Video {
  id: string;
  title: string;
  url: string;
  rosterId: string;
  userUID: string;
  createdAt: string;
  size: number;
  type: string;
}

export default function VideoDetail() {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterName, setRosterName] = useState<string>('');
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const fetchVideoDetails = useCallback(async () => {
    if (!user || !videoId) return;
    
    try {
      setLoading(true);
      const videoRef = doc(db, 'videos', videoId);
      const videoSnap = await getDoc(videoRef);
      
      if (videoSnap.exists()) {
        const data = videoSnap.data();
        
        if (data.userUID !== user.uid) {
          console.error('Unauthorized access to video');
          router.push('/process_video');
          return;
        }
        
        setVideo({
          id: videoSnap.id,
          title: data.title,
          url: data.url,
          rosterId: data.rosterId,
          userUID: data.userUID,
          createdAt: data.createdAt,
          size: data.size,
          type: data.type
        });
        
        const rosterRef = doc(db, 'rosters', data.rosterId);
        const rosterSnap = await getDoc(rosterRef);
        
        if (rosterSnap.exists()) {
          setRosterName(rosterSnap.data().name);
        }
      } else {
        console.error('Video not found');
        router.push('/process_video');
      }
    } catch (error) {
      console.error('Error fetching video details:', error);
    } finally {
      setLoading(false);
    }
  }, [user, videoId, router]);
  
  useEffect(() => {
    if (user && videoId) {
      fetchVideoDetails();
    }
  }, [user, videoId, fetchVideoDetails]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/process_video')}
            className="mr-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Process Video
          </button>
          <h1 className="text-2xl font-bold">{video?.title || 'Video Details'}</h1>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading video details...</p>
          </div>
        ) : !video ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">Video not found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Roster:</span> {rosterName}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Size:</span> {formatFileSize(video.size)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Uploaded:</span> {new Date(video.createdAt).toLocaleString()}
              </p>
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video 
                className="w-full h-full" 
                controls 
                src={video.url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
