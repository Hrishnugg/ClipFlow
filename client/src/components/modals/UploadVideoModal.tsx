'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { processVideo, ensureVideosCollection } from '../../firebase/videos';
import { useAuth } from '../../context/AuthContext';

interface Roster {
  id: string;
  name: string;
}

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessingStatusChange?: (isProcessing: boolean) => void;
}

export default function UploadVideoModal({ isOpen, onClose, onProcessingStatusChange }: UploadVideoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<string>('');
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingCount, setProcessingCount] = useState({ total: 0, current: 0 });
  const { user } = useAuth();

  useEffect(() => {
    const fetchRosters = async () => {
      if (!user) return;

      try {
        const rostersRef = collection(db, 'rosters');
        const q = query(rostersRef, where('userUID', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const fetchedRosters: Roster[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedRosters.push({
            id: doc.id,
            name: data.name,
          });
        });

        setRosters(fetchedRosters);
      } catch (error) {
        console.error('Error fetching rosters:', error);
      }
    };

    if (isOpen) {
      fetchRosters();
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRosterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRosterId(e.target.value);
  };

  const handleSubmit = async () => {
    if (selectedFile && selectedRosterId) {
      setIsUploading(true);
      if (onProcessingStatusChange) {
        onProcessingStatusChange(true);
      }

      try {
        await ensureVideosCollection();

        const zipData = await selectedFile.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);

        const videoFiles: { name: string; data: Blob }[] = [];
        const folderPromises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
          if (
            zipEntry.dir ||
            relativePath.startsWith('__MACOSX/') ||
            !relativePath.toLowerCase().endsWith('.mp4')
          ) {
            return;
          }

          const promise = zipEntry.async('blob').then(blob => {
            const fileName = relativePath.split('/').pop() || 'unknown.mp4';
            videoFiles.push({
              name: fileName,
              data: blob
            });
          });

          folderPromises.push(promise);
        });

        await Promise.all(folderPromises);

        setProcessingCount({ total: videoFiles.length, current: 0 });

        for (const videoFile of videoFiles) {
          const file = new File([videoFile.data], videoFile.name, { type: 'video/mp4' });
          await processVideo(file, selectedRosterId, user?.uid || '');

          setProcessingCount(prev => ({
            ...prev,
            current: prev.current + 1
          }));
        }

        setSelectedFile(null);
        setSelectedRosterId('');
        setIsUploading(false);
        if (onProcessingStatusChange) {
          onProcessingStatusChange(false);
        }
        onClose();
      } catch (error) {
        console.error('Error processing zip file:', error);
        setIsUploading(false);
        if (onProcessingStatusChange) {
          onProcessingStatusChange(false);
        }
      }
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setSelectedRosterId('');
    if (onProcessingStatusChange && isUploading) {
      onProcessingStatusChange(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Upload Videos</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Roster
          </label>
          <select
            value={selectedRosterId}
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
            Select a ZIP file containing videos
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".zip"
            className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 focus:outline-none"
            disabled={isUploading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            ZIP file should contain MP4 videos only.
          </p>
        </div>

        {isUploading && (
          <div className="mb-4">
            <p className="text-sm mb-1">
              Processing videos: {processingCount.current} of {processingCount.total}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(processingCount.current / processingCount.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !selectedRosterId || isUploading}
            className={`px-4 py-2 rounded ${
              selectedFile && selectedRosterId && !isUploading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-400 text-white cursor-not-allowed'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
