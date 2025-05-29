'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { processVideo, ensureVideosCollection } from '../../firebase/videos';
import { useAuth } from '../../context/AuthContext';
import { getUserSelectedTeam } from '../../firebase/firestore';

interface Roster {
  id: string;
  name: string;
  teamID?: string;
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
        const selectedTeam = await getUserSelectedTeam(user.uid);
        const rostersRef = collection(db, 'rosters');
        const q = query(
          rostersRef, 
          where('teamID', '==', selectedTeam)
        );
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
            !relativePath.toLowerCase().endsWith('.mp4') && !relativePath.toLowerCase().endsWith('.mov')
          ) {
            return;
          }

          const promise = zipEntry.async('blob').then(blob => {
            const fileName = relativePath.split('/').pop() || 'unknown_video';
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
          const mimeType = videoFile.name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
          const file = new File([videoFile.data], videoFile.name, { type: mimeType });
          const selectedTeam = await getUserSelectedTeam(user?.uid || '');
          await processVideo(file, selectedRosterId, user?.uid || '', selectedTeam || undefined);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">Upload Videos</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Roster
          </label>
          <select
            value={selectedRosterId}
            onChange={handleRosterChange}
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
          <div className="mt-1">
            <label 
              htmlFor="zipFile" 
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
              id="zipFile"
              onChange={handleFileChange}
              accept=".zip"
              className="hidden"
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-cyan-400">
                Selected: {selectedFile.name}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              ZIP file should contain MP4 or MOV videos only.
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="mb-4">
            <p className="text-sm mb-1">
              Processing videos: {processingCount.current} of {processingCount.total}
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 h-2.5 rounded-full"
                style={{ width: `${(processingCount.current / processingCount.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleCancel}
            className="relative inline-flex h-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm px-6 py-2 font-medium text-white transition-all duration-300 hover:bg-gray-700/50 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !selectedRosterId || isUploading}
            className={`relative inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 font-medium text-white transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              !selectedFile || !selectedRosterId || isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
