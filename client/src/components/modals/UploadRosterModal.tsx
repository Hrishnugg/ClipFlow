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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">Upload a Roster</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Roster Name
          </label>
          <input
            type="text"
            value={rosterName}
            onChange={handleRosterNameChange}
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="Enter roster name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select a CSV file
          </label>
          <div className="mt-1">
            <label 
              htmlFor="csvFile" 
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-emerald-700/70 bg-emerald-900/30 text-emerald-400 rounded-lg cursor-pointer hover:bg-emerald-800/40 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Browse Files</span>
            </label>
            <input
              type="file"
              id="csvFile"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-cyan-400">
                Selected: {selectedFile.name}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              CSV should have 3 columns: Student Name, Student Email, Parent Email
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleCancel}
            className="relative inline-flex h-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm px-6 py-2 font-medium text-white transition-all duration-300 hover:bg-gray-700/50 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !rosterName}
            className={`relative inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 px-6 py-2 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(34,211,238,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              !selectedFile || !rosterName ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
