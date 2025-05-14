'use client';

import React, { useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { ref, deleteObject } from 'firebase/storage';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { formatVideoTitle } from '../../utils/formatting';

interface VideoActionsPanelProps {
  userUid: string;
  onUpdate: () => void;
  allVideosHaveIdentifiedStudents: boolean;
}

export default function VideoActionsPanel({ userUid, onUpdate, allVideosHaveIdentifiedStudents }: VideoActionsPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveAll = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setErrorMessage(null);
    
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        where('user_uid', '==', userUid),
        where('isReviewed', '==', false)
      );
      
      const querySnapshot = await getDocs(videosQuery);
      
      if (querySnapshot.empty) {
        setIsSaving(false);
        return;
      }
      
      const batch = writeBatch(db);
      
      querySnapshot.forEach((document) => {
        const videoRef = doc(db, 'videos', document.id);
        const videoData = document.data();
        const identifiedStudent = videoData.identifiedStudent;
        const identifiedStudentEmail = videoData.identifiedStudentEmail;
        
        if (identifiedStudent && identifiedStudentEmail) {
          const creationDate = videoData.createdAt || videoData.uploadDate;
          const newTitle = formatVideoTitle(identifiedStudent, identifiedStudentEmail, creationDate);
          
          batch.update(videoRef, { 
            isReviewed: true,
            title: newTitle
          });
        }
      });
      
      await batch.commit();
      onUpdate(); // Trigger refresh
    } catch (error) {
      console.error('Error saving all videos:', error);
      setErrorMessage('There was an error saving the videos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteAll = async () => {
    setIsConfirmationOpen(true);
  };
  
  const confirmDeleteAll = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setErrorMessage(null);
    setIsConfirmationOpen(false);
    
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        where('user_uid', '==', userUid),
        where('isReviewed', '==', false)
      );
      
      const querySnapshot = await getDocs(videosQuery);
      
      if (querySnapshot.empty) {
        setIsDeleting(false);
        return;
      }
      
      const deletePromises = querySnapshot.docs.map(async (document) => {
        try {
          const videoRef = doc(db, 'videos', document.id);
          const videoDoc = await getDoc(videoRef);
          
          if (videoDoc.exists()) {
            const videoData = videoDoc.data();
            const assetUrl = videoData.asset;
            
            await deleteDoc(videoRef);
            
            if (assetUrl) {
              const filePathMatch = assetUrl.match(/\/o\/([^?]+)/);
              if (filePathMatch && filePathMatch[1]) {
                const filePath = decodeURIComponent(filePathMatch[1]);
                const storageRef = ref(storage, filePath);
                await deleteObject(storageRef);
              }
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error deleting video:', error);
          throw error;
        }
      });
      
      await Promise.allSettled(deletePromises);
      
      onUpdate(); // Trigger refresh
    } catch (error) {
      console.error('Error deleting all videos:', error);
      setErrorMessage('There was an error deleting some videos. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const closeConfirmation = () => {
    setIsConfirmationOpen(false);
  };

  return (
    <div className="w-full bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow p-4 mt-2">
      <h3 className="text-lg font-semibold mb-2 text-gray-200">Quick Actions</h3>
      
      <div className="space-y-2">
        <button 
          onClick={handleSaveAll}
          disabled={isSaving || !allVideosHaveIdentifiedStudents}
          className={`w-full px-4 py-2 font-medium rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] ${
            isSaving || !allVideosHaveIdentifiedStudents ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? 'Saving...' : 'Save All'}
        </button>
        
        <button 
          onClick={handleDeleteAll}
          disabled={isDeleting}
          className={`w-full px-4 py-2 font-medium rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 hover:shadow-lg hover:scale-[1.02] ${
            isDeleting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isDeleting ? 'Deleting...' : 'Delete All'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="mt-2 p-2 text-sm text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded">
          {errorMessage}
        </div>
      )}
      
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={closeConfirmation}
        onConfirm={confirmDeleteAll}
        title="Delete All Videos"
        message="Are you sure you want to delete all unreviewed videos? This action cannot be undone."
        confirmButtonText="Delete All"
      />
    </div>
  );
}
