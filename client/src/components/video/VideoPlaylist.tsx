'use client';

import React from 'react';

interface Video {
  id: string;
  title: string;
  asset: string;
  transcript: string;
  identifiedStudent: string;
  confidenceLevel: number;
  isReviewed: boolean;
  uploadDate: string;
}

interface VideoPlaylistProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (video: Video) => void;
}

export default function VideoPlaylist({ videos, selectedVideoId, onSelectVideo }: VideoPlaylistProps) {
  if (videos.length === 0) {
    return <div className="p-4">No videos available</div>;
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Unreviewed Videos</h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => onSelectVideo(video)}
            className={`w-full p-4 text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex flex-col ${
              selectedVideoId === video.id ? 'bg-gray-200 dark:bg-gray-700' : ''
            }`}
          >
            <span className="font-medium truncate">{video.title}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(video.uploadDate).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
