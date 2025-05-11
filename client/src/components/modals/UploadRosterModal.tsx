'use client';

import React, { useState, useRef } from 'react';

interface UploadRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (rosterName: string, file: File) => void;
  error?: string | null;
}

export default function UploadRosterModal({ isOpen, onClose, onUpload }: UploadRosterModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rosterName, setRosterName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRosterNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRosterName(e.target.value);
  };

  const handleSubmit = () => {
    if (selectedFile && rosterName) {
      onUpload(rosterName, selectedFile);
      setSelectedFile(null);
      setRosterName('');
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setRosterName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Upload a Roster</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Roster Name
          </label>
          <input
            type="text"
            value={rosterName}
            onChange={handleRosterNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter roster name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select a CSV file
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            CSV should have 3 columns: Student Name, Student Email, Parent Email
          </p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !rosterName}
            className={`px-4 py-2 rounded ${
              selectedFile && rosterName
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-400 text-white cursor-not-allowed'
            }`}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
