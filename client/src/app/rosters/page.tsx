'use client';

import React, { useState } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadRosterModal from '@/components/modals/UploadRosterModal';

export default function Rosters() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload = (file: File) => {
    console.log('File selected:', file.name);
  };

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Rosters</h1>
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
            >
              Upload Roster
            </button>
          </div>
        </div>
      </div>
      
      <UploadRosterModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload} 
      />
    </AuthenticatedLayout>
  );
}
