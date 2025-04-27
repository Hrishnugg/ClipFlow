'use client';

import React, { useState, useEffect } from 'react';
import { getStudentNamesFromRoster } from '@/firebase/llm';

interface StudentInfoSidebarProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
  rosterId?: string;
}

export default function StudentInfoSidebar({ identifiedStudent, confidenceLevel, rosterId }: StudentInfoSidebarProps) {
  const [studentNames, setStudentNames] = useState<string[]>([]);
  
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

  return (
    <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
      <div className="mt-2">
        <select 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
          defaultValue={identifiedStudent || ''}
        >
          <option value="">Select a student</option>
          {studentNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
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
