'use client';

import React, { useState, useEffect } from 'react';
import { getStudentNamesFromRoster, getStudentEmailByName, hasStudentDuplicates } from '@/firebase/llm';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, deleteObject } from 'firebase/storage';

interface StudentInfoSidebarWithReassignProps {
  identifiedStudent: string | null;
  rosterId?: string;
  videoId?: string;
  onStudentUpdate?: () => void;
  duplicateStudent?: boolean;
}

export default function StudentInfoSidebarWithReassign({ 
  identifiedStudent, 
  rosterId, 
  videoId, 
  onStudentUpdate,
  duplicateStudent
}: StudentInfoSidebarWithReassignProps) {
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(identifiedStudent || '');
  const [isReassigning, setIsReassigning] = useState(false);
  
  useEffect(() => {
    const fetchStudentNames = async () => {
      if (rosterId) {
        try {
          const names = await getStudentNamesFromRoster(rosterId);
          setStudentNames(names);
        } catch (error) {
          console.error('Error fetching student names:', error);
        }
      }
    };
    
    fetchStudentNames();
  }, [rosterId]);

  useEffect(() => {
    setSelectedStudent(identifiedStudent || '');
  }, [identifiedStudent]);

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedStudent = e.target.value;
    setSelectedStudent(newSelectedStudent);
  };
  
  const handleReassignStudent = async () => {
    if (videoId && selectedStudent) {
      setIsReassigning(true);
      try {
        const videoRef = doc(db, 'videos', videoId);
        
        const videoDoc = await getDoc(videoRef);
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          const createdDate = videoData.uploadDate || new Date().toISOString().split('T')[0];
          
          let studentEmail = '';
          let hasDuplicates = false;
          
          if (selectedStudent && rosterId) {
            studentEmail = await getStudentEmailByName(rosterId, selectedStudent);
            hasDuplicates = await hasStudentDuplicates(rosterId, selectedStudent);
          }
          
          await updateDoc(videoRef, {
            identifiedStudent: selectedStudent,
            identifiedStudentEmail: studentEmail,
            duplicateStudent: hasDuplicates,
            title: `${selectedStudent} ${createdDate}`
          });
          
          console.log('Updated video with new student and title:', selectedStudent, createdDate);
        }
        
        if (onStudentUpdate) {
          onStudentUpdate();
        }
      } catch (error) {
        console.error('Error updating identified student:', error);
      } finally {
        setIsReassigning(false);
      }
    }
  };

  const handleDeleteVideo = async () => {
    if (videoId) {
      try {
        const videoRef = doc(db, 'videos', videoId);
        const videoDoc = await getDoc(videoRef);
        
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          const assetUrl = videoData.asset;
          
          await deleteDoc(videoRef);
          console.log('Deleted video document from Firestore');
          
          try {
            if (assetUrl) {
              const filePathMatch = assetUrl.match(/\/o\/([^?]+)/);
              if (filePathMatch && filePathMatch[1]) {
                const filePath = decodeURIComponent(filePathMatch[1]);
                const storageRef = ref(storage, filePath);
                await deleteObject(storageRef);
                console.log('Deleted video file from Storage:', filePath);
              } else {
                console.error('Could not extract file path from URL:', assetUrl);
              }
            }
          } catch (storageError) {
            console.error('Error deleting video from storage:', storageError);
          }
        }
        
        if (onStudentUpdate) {
          onStudentUpdate();
        }
      } catch (error) {
        console.error('Error deleting video:', error);
      }
    }
  };

  return (
    <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
      {duplicateStudent && identifiedStudent && (
        <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-800 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
          <p className="text-sm">⚠️ Warning: Multiple students found with the name "{identifiedStudent}" in the roster.</p>
        </div>
      )}
      <div className="mt-2">
        <select 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
          value={selectedStudent}
          onChange={handleStudentSelect}
        >
          <option value="">Select a student</option>
          {studentNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        
        <button 
          onClick={handleReassignStudent}
          disabled={isReassigning || selectedStudent === identifiedStudent || !selectedStudent}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed mt-2"
        >
          {isReassigning ? 'Reassigning...' : 'Reassign Video'}
        </button>
      </div>
      
      {/* Video action buttons */}
      {videoId && (
        <div className="mt-6">
          <button 
            onClick={handleDeleteVideo}
            className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Video
          </button>
        </div>
      )}
    </div>
  );
}
