'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  
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
        const fetchedVideos: Video[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedVideos.push({
            id: doc.id,
            title: data.title,
            url: data.url,
            rosterId: data.rosterId,
            userUID: data.userUID,
            createdAt: data.createdAt,
            size: data.size,
            type: data.type
          });
        });
        
        setVideos(fetchedVideos);
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
          
          setVideos(prevVideos => [newVideo, ...prevVideos]);
          
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
          
          router.push(`/view_video/${docRef.id}`);
        }
      );
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

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
        ) : videos.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div 
                key={video.id}
                onClick={() => router.push(`/view_video/${video.id}`)}
                className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300"
              >
                <div className="aspect-video bg-black">
                  <video 
                    className="w-full h-full object-cover"
                    src={video.url}
                    preload="metadata"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{truncateTitle(video.title)}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Uploaded: {formatDate(video.createdAt)}
                  </p>
                </div>
              </div>
            ))}
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
