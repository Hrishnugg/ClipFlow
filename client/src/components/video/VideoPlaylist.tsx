'use client';

import React from 'react';

interface Video {
  id: string;
  title: string;
  asset: string;
  transcript: string;
  identifiedStudent: string;
  identifiedStudentEmail?: string;
  duplicateStudent?: boolean;
  confidenceLevel: number;
  isReviewed: boolean;
  uploadDate: string;
  teamID?: string;
}

interface VideoPlaylistProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (video: Video) => void;
  title?: string; // Add title prop
}

export default function VideoPlaylist({ videos, selectedVideoId, onSelectVideo, title = "Unreviewed Videos" }: VideoPlaylistProps) {
  if (videos.length === 0) {
    return <div className="p-4">No videos available</div>;
  }
  
  const sortedVideos = [...videos].sort((a, b) => {
    if (a.duplicateStudent && !b.duplicateStudent) return -1;
    if (!a.duplicateStudent && b.duplicateStudent) return 1;
    
    return a.confidenceLevel - b.confidenceLevel;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedVideos.map((video) => (
          <button
            key={video.id}
            onClick={() => onSelectVideo(video)}
            className={`
              w-full p-4 text-left 
              hover:bg-gray-200 dark:hover:bg-gray-700 
              transition-colors flex flex-col overflow-hidden 
              ${selectedVideoId === video.id ? 'bg-gray-200 dark:bg-gray-700' : ''}
            `}
          >
            {/* make this div shrinkable */}
            <div className="w-full max-w-full min-w-0 flex items-center">
              {!video.identifiedStudent && (
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2 flex-shrink-0" 
                     title="Low confidence - Could not identify any student"></div>
              )}
              {video.identifiedStudent && video.duplicateStudent && (
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2 flex-shrink-0" 
                     title="Warning - Multiple students with this name found"></div>
              )}
              {video.identifiedStudent && !video.duplicateStudent && (
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 flex-shrink-0" 
                     title="Student identified with confidence"></div>
              )}
              {/* now truncate will work reliably */}
              <p className="font-medium truncate">
                {video.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {new Date(video.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
