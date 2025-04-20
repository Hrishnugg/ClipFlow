'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface Roster {
  id: string;
  name: string;
  userUID: string;
}

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (rosterId: string, file: File) => void;
}

export default function UploadVideoModal({ isOpen, onClose, onUpload }: UploadVideoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRoster, setSelectedRoster] = useState<string>('');
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRosters = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const rostersRef = collection(db, 'rosters');
        const q = query(rostersRef, where('userUID', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const fetchedRosters: Roster[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedRosters.push({
            id: doc.id,
            name: data.name,
            userUID: data.userUID,
          });
        });
        
        setRosters(fetchedRosters);
      } catch (error) {
        console.error('Error fetching rosters:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && user) {
      fetchRosters();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRosterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoster(e.target.value);
  };

  const handleSubmit = () => {
    if (selectedFile && selectedRoster) {
      onUpload(selectedRoster, selectedFile);
      setSelectedFile(null);
      setSelectedRoster('');
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setSelectedRoster('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Upload a Video</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Roster
          </label>
          <select
            value={selectedRoster}
            onChange={handleRosterChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a roster</option>
            {rosters.map((roster) => (
              <option key={roster.id} value={roster.id}>
                {roster.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select a Video File
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".mp4"
            className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only MP4 video files are supported
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
            disabled={!selectedFile || !selectedRoster}
            className={`px-4 py-2 rounded ${
              selectedFile && selectedRoster
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
