'use client';

import React, { useState, useEffect } from 'react';
import { getStudentNamesFromRoster } from '@/firebase/llm';

interface StudentInfoSidebarProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
  rosterId?: string;
  onStudentSelect?: (studentName: string | null) => void;
}

export default function StudentInfoSidebar({ 
  identifiedStudent, 
  confidenceLevel, 
  rosterId,
  onStudentSelect 
}: StudentInfoSidebarProps) {
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(identifiedStudent);

  useEffect(() => {
    async function fetchStudentNames() {
      if (!rosterId) {
        setStudentNames([]);
        return;
      }
      
      setLoading(true);
      try {
        const names = await getStudentNamesFromRoster(rosterId);
        setStudentNames(names);
      } catch (error) {
        console.error('Error fetching student names:', error);
        setStudentNames([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentNames();
  }, [rosterId]);
  
  useEffect(() => {
    setSelectedStudent(identifiedStudent);
  }, [identifiedStudent]);
  
  const handleStudentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStudent = event.target.value || null;
    setSelectedStudent(newStudent);
    
    if (onStudentSelect) {
      onStudentSelect(newStudent);
    }
  };
  if (loading) {
    return (
      <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
        <p className="text-gray-500 dark:text-gray-400">Loading student list...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
      <div className="mt-2">
        {studentNames.length > 0 ? (
          <select
            value={selectedStudent || ''}
            onChange={handleStudentChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">-- Select Student --</option>
            {studentNames.map((name, index) => (
              <option key={index} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            {!rosterId 
              ? "No roster associated with this video" 
              : "No students found in roster"}
          </p>
        )}
        
        {confidenceLevel !== undefined && (
          <div className="mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Confidence: {confidenceLevel}%</p>
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
