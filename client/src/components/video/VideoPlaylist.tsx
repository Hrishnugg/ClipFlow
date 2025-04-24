'use client';

import React from 'react';
import { Video } from '@/app/process_video/page';


interface VideoPlaylistProps {
  videos: Video[];
  currentVideoId: string;
  onVideoSelect: (video: Video) => void;
}

const VideoPlaylist: React.FC<VideoPlaylistProps> = ({ videos, currentVideoId, onVideoSelect }) => {
  return (
    <div className="w-64 h-full bg-white dark:bg-gray-800 overflow-auto shadow-md border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg">Playlist</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{videos.length} videos</p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {videos.map((video) => (
          <div
            key={video.id}
            onClick={() => onVideoSelect(video)}
            className={`p-3 cursor-pointer transition-colors ${
              video.id === currentVideoId
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex flex-col">
              <div className="font-medium truncate">{video.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(video.createdAt).toLocaleString()}
              </div>
              {video.identifiedStudent && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Student: {video.identifiedStudent}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoPlaylist;
