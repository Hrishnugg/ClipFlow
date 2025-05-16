'use client';

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, deleteObject } from 'firebase/storage';
import { formatVideoTitle } from '@/utils/formatting';

interface StudentInfoSidebarProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
  rosterId?: string;
  videoId?: string;
  onStudentUpdate?: () => void;
  duplicateStudent?: boolean;
}

export default function StudentInfoSidebar({ identifiedStudent, confidenceLevel, rosterId, videoId, onStudentUpdate, duplicateStudent }: StudentInfoSidebarProps) {
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(identifiedStudent || '');
  
  useEffect(() => {
    const fetchStudentNames = async () => {
      if (rosterId) {
        try {
          const rosterRef = doc(db, 'rosters', rosterId);
          const rosterSnap = await getDoc(rosterRef);
          
          if (rosterSnap.exists()) {
            const data = rosterSnap.data();
            const students = data.students || [];
            const formattedNames = students.map((student: { name: string, email: string }) => 
              `${student.name} (${student.email})`
            );
            setStudentNames(formattedNames);
          }
        } catch (error) {
          console.error('Error fetching student names:', error);
        }
      }
    };
    
    fetchStudentNames();
  }, [rosterId]);

  useEffect(() => {
    if (identifiedStudent && studentNames.length > 0) {
      const matchingOption = studentNames.find(option => {
        const match = option.match(/(.*) \((.*)\)/);
        return match && match[1] === identifiedStudent;
      });
      setSelectedStudent(matchingOption || '');
    } else {
      setSelectedStudent('');
    }
  }, [identifiedStudent, studentNames]);

  const handleStudentSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = e.target.value;
    setSelectedStudent(selectedOption);
    
    if (videoId) {
      try {
        const nameMatch = selectedOption.match(/(.*) \((.*)\)/);
        if (!nameMatch) return;
        
        const studentName = nameMatch[1];
        const studentEmail = nameMatch[2];
        
        const duplicateNames = studentNames.filter(option => {
          const match = option.match(/(.*) \((.*)\)/);
          return match && match[1] === studentName;
        });
        const hasDuplicates = duplicateNames.length > 1;
        
        const videoRef = doc(db, 'videos', videoId);
        await updateDoc(videoRef, {
          identifiedStudent: studentName,
          identifiedStudentEmail: studentEmail,
          duplicateStudent: hasDuplicates
        });
        
        console.log('Updated student in video document:', studentName, studentEmail, hasDuplicates);
        if (onStudentUpdate) {
          onStudentUpdate();
        }
      } catch (error) {
        console.error('Error updating identified student:', error);
      }
    }
  };
  
  const handleSaveVideo = async () => {
    if (videoId && selectedStudent) {
      try {
        const videoRef = doc(db, 'videos', videoId);
        const videoDoc = await getDoc(videoRef);
        
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          const creationDate = videoData.createdAt || videoData.uploadDate;
          const nameMatch = selectedStudent.match(/(.*) \((.*)\)/);
          if (!nameMatch) return;
          
          const studentName = nameMatch[1];
          const studentEmail = nameMatch[2];
          const newTitle = formatVideoTitle(studentName, studentEmail, creationDate);
          
          await updateDoc(videoRef, {
            isReviewed: true,
            title: newTitle
          });
          
          console.log('Marked video as reviewed and updated title');
          if (onStudentUpdate) {
            onStudentUpdate();
          }
        }
      } catch (error) {
        console.error('Error updating video review status:', error);
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
    <div className="w-full h-full p-4 bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2 text-gray-200">Identified Student</h3>
      {duplicateStudent && identifiedStudent && (
        <div className="mb-2 p-2 bg-yellow-800 border-l-4 border-yellow-500 text-yellow-300">
          <p className="text-sm">⚠️ Warning: Multiple students found with the name &quot;{identifiedStudent}&quot; in the roster.</p>
        </div>
      )}
      <div className="mt-2">
        <select 
          className="w-full px-3 py-2 border border-gray-800/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/60 text-gray-200 font-medium"
          value={selectedStudent}
          onChange={handleStudentSelect}
        >
          <option value="">Select a student</option>
          {studentNames.map((nameWithEmail) => (
            <option key={nameWithEmail} value={nameWithEmail}>
              {nameWithEmail}
            </option>
          ))}
        </select>
        {confidenceLevel !== undefined && (
          <div className="mt-2">
            <p className="text-sm text-gray-400">AI Confidence: {confidenceLevel}%</p>
            <div className="w-full bg-gray-800/60 rounded-full h-2 mt-1">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"
                style={{ width: `${confidenceLevel}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Video action buttons */}
      {videoId && (
        <div className="mt-6 space-y-2">
          <button 
            onClick={handleSaveVideo}
            disabled={!selectedStudent}
            className={`w-full px-4 py-2 font-medium rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] ${
              !selectedStudent ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Save Video
          </button>
          <button 
            onClick={handleDeleteVideo}
            className="w-full px-4 py-2 font-medium rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 hover:shadow-lg hover:scale-[1.02]"
          >
            Delete Video
          </button>
        </div>
      )}
    </div>
  );
}
