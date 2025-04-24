'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import { AssemblyAI } from 'assemblyai';

interface Video {
  id: string;
  title: string;
  url: string;
  rosterId: string;
  userUID: string;
  createdAt: string;
  size: number;
  type: string;
  transcript?: string | null;
  transcriptionStatus?: 'pending' | 'completed' | 'failed';
}

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [rosterName, setRosterName] = useState<string>('');
  const { user } = useAuth();
  
  const assemblyClient = new AssemblyAI({
    apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '',
  });

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const videosRef = collection(db, 'videos');
        const q = query(
          videosRef, 
          where('userUID', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setLoading(false);
          return;
        }
        
        const firstDoc = querySnapshot.docs[0];
        const data = firstDoc.data();
        
        const video: Video = {
          id: firstDoc.id,
          title: data.title,
          url: data.url,
          rosterId: data.rosterId,
          userUID: data.userUID,
          createdAt: data.createdAt,
          size: data.size,
          type: data.type,
          transcript: data.transcript,
          transcriptionStatus: data.transcriptionStatus
        };
        
        setCurrentVideo(video);
        
        if (data.rosterId) {
          fetchRosterName(data.rosterId);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload = async (rosterId: string, file: File) => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      const storageRef = ref(storage, `videos/${user.uid}/${Date.now()}_${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Error uploading video:', error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const videoData: Omit<Video, 'id'> = {
            title: file.name,
            url: downloadURL,
            rosterId,
            userUID: user.uid,
            createdAt: new Date().toISOString(),
            size: file.size,
            type: file.type,
            transcriptionStatus: 'pending'
          };
          
          const docRef = await addDoc(collection(db, 'videos'), videoData);
          console.log('Video added with ID:', docRef.id);
          
          const newVideo: Video = {
            id: docRef.id,
            ...videoData
          };
          
          try {
            console.log('Starting transcription for video:', docRef.id);
            const transcriptionData = {
              audio: downloadURL
            };
            
            assemblyClient.transcripts.transcribe(transcriptionData)
              .then(async (transcript) => {
                if (transcript.text) {
                  await updateDoc(doc(db, 'videos', docRef.id), {
                    transcript: transcript.text,
                    transcriptionStatus: 'completed'
                  });
                  console.log('Transcription completed for video:', docRef.id);
                } else {
                  await updateDoc(doc(db, 'videos', docRef.id), {
                    transcriptionStatus: 'failed'
                  });
                  console.error('Transcription failed: No text returned');
                }
              })
              .catch(async (error) => {
                console.error('Error transcribing video:', error);
                await updateDoc(doc(db, 'videos', docRef.id), {
                  transcriptionStatus: 'failed'
                });
              });
          } catch (error) {
            console.error('Error starting transcription:', error);
          }
          
          setCurrentVideo(newVideo);
          fetchRosterName(rosterId);
        }
      );
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const fetchRosterName = async (rosterId: string) => {
    if (!user) return;
    
    try {
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const rosterData = rosterSnap.data();
        setRosterName(rosterData.name);
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };
  
  useEffect(() => {
    if (!currentVideo || !user) return;
    
    const videoRef = doc(db, 'videos', currentVideo.id);
    
    const unsubscribe = onSnapshot(videoRef, (videoSnap) => {
      if (videoSnap.exists()) {
        const data = videoSnap.data();
        
        setCurrentVideo({
          id: videoSnap.id,
          title: data.title,
          url: data.url,
          rosterId: data.rosterId,
          userUID: data.userUID,
          createdAt: data.createdAt,
          size: data.size,
          type: data.type,
          transcript: data.transcript,
          transcriptionStatus: data.transcriptionStatus
        });
      }
    }, (error) => {
      console.error('Error setting up real-time listener:', error);
    });
    
    return () => unsubscribe();
  }, [currentVideo?.id, user]);

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Process Video</h1>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Videos'}
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading videos...</p>
          </div>
        ) : !currentVideo ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">No videos uploaded, please upload a video</p>
            <button
              onClick={handleUpload}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Videos'}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">{currentVideo.title}</h2>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Roster:</span> {rosterName}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Size:</span> {formatFileSize(currentVideo.size)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Uploaded:</span> {new Date(currentVideo.createdAt).toLocaleString()}
              </p>
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
              <video
                className="w-full h-full"
                controls
                src={currentVideo.url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Transcript</h2>
              </div>
              
              {currentVideo.transcriptionStatus === 'pending' && (
                <div className="flex items-center justify-center py-8 bg-gray-100 dark:bg-gray-700 rounded">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p>Transcribing video...</p>
                </div>
              )}
              
              {currentVideo.transcript && (
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded max-h-96 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{currentVideo.transcript}</p>
                </div>
              )}
              
              {!currentVideo.transcript && currentVideo.transcriptionStatus !== 'pending' && (
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-center">
                  <p>No transcript available. Transcription is automatically initiated when videos are uploaded.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <UploadVideoModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload} 
      />
    </AuthenticatedLayout>
  );
}
