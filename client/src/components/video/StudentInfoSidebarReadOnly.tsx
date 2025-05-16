'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface StudentInfoSidebarReadOnlyProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
  rosterId?: string;
}

export default function StudentInfoSidebarReadOnly({ 
  identifiedStudent, 
  rosterId
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
    <div className="w-full h-full p-4 bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2 text-gray-200">Identified Student</h3>
      <div className="mt-2">
        <select 
          className="w-full px-3 py-2 border border-gray-800/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/60 text-gray-200 font-medium"
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
      </div>
    </div>
  );
}
