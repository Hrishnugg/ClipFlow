'use client';

import React, { useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

import { formatVideoTitle } from '../../utils/formatting';

interface VideoActionsPanelProps {
  userUid: string;
  onUpdate: () => void;
  onDeleteAll: () => void;
  isDeleting: boolean;
  allVideosHaveIdentifiedStudents: boolean;
}

export default function VideoActionsPanel({ userUid, onUpdate, onDeleteAll, isDeleting, allVideosHaveIdentifiedStudents }: VideoActionsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
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
  
  const handleDeleteAll = () => {
    onDeleteAll();
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
      

    </div>
  );
}
