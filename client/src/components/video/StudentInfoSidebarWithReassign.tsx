'use client';

import React, { useState, useEffect } from 'react';
import { getStudentNamesFromRoster } from '@/firebase/llm';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';
import { ref, deleteObject } from 'firebase/storage';
import { formatVideoTitle } from '@/utils/formatting';

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

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedStudent = e.target.value;
    setSelectedStudent(newSelectedStudent);
  };
  
  const handleReassignStudent = async () => {
    if (videoId && selectedStudent) {
      setIsReassigning(true);
      try {
        const nameMatch = selectedStudent.match(/(.*) \((.*)\)/);
        if (!nameMatch) {
          setIsReassigning(false);
          return;
        }
        
        const studentName = nameMatch[1];
        const studentEmail = nameMatch[2];
        
        const videoRef = doc(db, 'videos', videoId);
        
        const videoDoc = await getDoc(videoRef);
        if (videoDoc.exists()) {
          const videoData = videoDoc.data();
          const createdDate = videoData.uploadDate || new Date().toISOString().split('T')[0];
          
          const duplicateNames = studentNames.filter(option => {
            const match = option.match(/(.*) \((.*)\)/);
            return match && match[1] === studentName;
          });
          const hasDuplicates = duplicateNames.length > 1;
          
          await updateDoc(videoRef, {
            identifiedStudent: studentName,
            identifiedStudentEmail: studentEmail,
            duplicateStudent: hasDuplicates,
            title: formatVideoTitle(studentName, studentEmail, createdDate)
          });
          
          console.log('Updated video with new student and title:', studentName, createdDate);
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
    <div className="w-full h-full p-4 bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2 text-gray-200">Identified Student</h3>
      {duplicateStudent && identifiedStudent && (
        <div className="mb-2 p-2 bg-yellow-800 border-l-4 border-yellow-500 text-yellow-300">
          <p className="text-sm">⚠️ Warning: Multiple students found with the name "{identifiedStudent}" in the roster.</p>
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
        
        <button 
          onClick={handleReassignStudent}
          disabled={isReassigning || selectedStudent === identifiedStudent || !selectedStudent}
          className={`w-full px-4 py-2 mt-6 font-medium rounded-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] ${
            isReassigning || selectedStudent === identifiedStudent || !selectedStudent ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isReassigning ? 'Reassigning...' : 'Reassign Video'}
        </button>
      </div>
      
      {/* Video action buttons */}
      {videoId && (
        <div className="mt-2">
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
