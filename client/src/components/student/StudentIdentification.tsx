'use client';

import React, { useState, useEffect } from 'react';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
}

interface StudentIdentificationProps {
  students: Student[];
  transcript: string | null;
  onIdentified?: (studentName: string, confidence: number) => void;
  identifiedStudent?: string;
  llmIdentifiedStudent?: string;
  confidence?: number;
  manuallySelected?: boolean;
}

export default function StudentIdentification({
  students,
  transcript,
  onIdentified,
  identifiedStudent,
  llmIdentifiedStudent,
  confidence,
  manuallySelected
}: StudentIdentificationProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>(identifiedStudent || '');

  useEffect(() => {
    if (identifiedStudent) {
      setSelectedStudent(identifiedStudent);
    }
  }, [identifiedStudent]);

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStudent(e.target.value);
    if (onIdentified) {
      onIdentified(e.target.value, 100); // 100% confidence when manually selected
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-blue-600';
    return 'text-amber-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md">
      <h3 className="font-bold mb-2">Student Identification</h3>
      
      {manuallySelected && identifiedStudent !== llmIdentifiedStudent ? (
        <div className="mb-4">
          <p className="text-sm mb-1">Selection:</p>
          <div className="text-lg font-bold text-purple-600">
            Manually Selected
          </div>
        </div>
      ) : (confidence !== undefined && confidence > 0 && (
        <div className="mb-4">
          <p className="text-sm mb-1">Confidence Level:</p>
          <div className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
            {confidence.toFixed(1)}%
          </div>
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium mb-2">
          Student
        </label>
        <select
          value={selectedStudent}
          onChange={handleSelectionChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Select a student</option>
          {students.map((student, index) => (
            <option key={index} value={student.name}>
              {student.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
