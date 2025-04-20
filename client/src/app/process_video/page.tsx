'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

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
          
          const videoData = {
            title: file.name,
            url: downloadURL,
            rosterId,
            userUID: user.uid,
            createdAt: new Date().toISOString(),
            size: file.size,
            type: file.type
          };
          
          const docRef = await addDoc(collection(db, 'videos'), videoData);
          console.log('Video added with ID:', docRef.id);
          
          router.push(`/view_video/${docRef.id}`);
        }
      );
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Process Video</h1>
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Videos'}
            </button>
          </div>
        </div>
      </div>
      
      <UploadVideoModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload} 
      />
    </AuthenticatedLayout>
  );
}
