'use client';

import React, { useState, useEffect } from 'react';
// import { getStudentNamesFromRoster } from '../../firebase/llm';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface StudentInfoSidebarReadOnlyProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
  rosterId?: string;
  duplicateStudent?: boolean;
}

export default function StudentInfoSidebarReadOnly({ 
  identifiedStudent, 
  confidenceLevel, 
  rosterId, 
  duplicateStudent 
}: StudentInfoSidebarReadOnlyProps) {
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

  return (
    <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
      {duplicateStudent && identifiedStudent && (
        <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-800 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
          <p className="text-sm">⚠️ Warning: Multiple students found with the name &quot;{identifiedStudent}&quot; in the roster.</p>
        </div>
      )}
      <div className="mt-2">
        <select 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
          value={selectedStudent}
          disabled={true}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">AI Confidence: {confidenceLevel}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${confidenceLevel}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
