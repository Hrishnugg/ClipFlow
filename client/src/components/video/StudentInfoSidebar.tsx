'use client';

import React from 'react';

interface StudentInfoSidebarProps {
  identifiedStudent: string | null;
  confidenceLevel?: number;
}

export default function StudentInfoSidebar({ identifiedStudent, confidenceLevel }: StudentInfoSidebarProps) {
  if (!identifiedStudent) {
    return (
      <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
        <p className="text-gray-500 dark:text-gray-400">No student identified</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Identified Student</h3>
      <div className="mt-2">
        <p className="font-medium">{identifiedStudent}</p>
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
