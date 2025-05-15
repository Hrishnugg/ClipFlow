'use client';

import React from 'react';
import { Search } from 'lucide-react';

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
  isStudentView?: boolean; // Add prop to indicate Student View
  studentName?: string; // Add student name prop
  studentEmail?: string; // Add student email prop
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function VideoPlaylist({ videos, selectedVideoId, onSelectVideo, title = "Unreviewed Videos", isStudentView = false, studentName, studentEmail, searchQuery = "", onSearchChange }: VideoPlaylistProps) {
  const sortedVideos = [...videos].sort((a, b) => {
    if (isStudentView) return 0;
    
    if (a.duplicateStudent && !b.duplicateStudent) return -1;
    if (!a.duplicateStudent && b.duplicateStudent) return 1;
    
    return a.confidenceLevel - b.confidenceLevel;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-transparent backdrop-blur-lg border border-gray-800/50 rounded-lg">
      <div className="p-4 border-b border-gray-800/50">
        {studentName ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-200">{studentName}</h2>
            <p className="text-sm text-gray-400">{studentEmail}</p>
            {onSearchChange && (
              <div className="relative w-full mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
            {onSearchChange && isStudentView && (
              <div className="relative w-full mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="divide-y divide-gray-800/50">
        {sortedVideos.length > 0 ? (
          sortedVideos.map((video) => (
            <button
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className={`
                w-full p-4 text-left text-gray-200
                hover:bg-gray-800/30 hover:text-white
                transition-colors flex flex-col overflow-hidden 
                ${selectedVideoId === video.id ? 'bg-gray-800/60 text-white' : ''}
              `}
            >
              {/* make this div shrinkable */}
              <div className="w-full max-w-full min-w-0 flex items-center">
                {isStudentView ? (
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 flex-shrink-0" 
                       title="Your video"></div>
                ) : (
                  <>
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
                  </>
                )}
                {/* now truncate will work reliably */}
                <p className="font-medium truncate">
                  {video.title}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {new Date(video.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-400">
              {searchQuery && searchQuery.length >= 2 
                ? "No videos match your search query." 
                : "No videos available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
