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
  isStudentView?: boolean; // Add prop to indicate Student View
  studentName?: string; // Add student name prop
  studentEmail?: string; // Add student email prop
}

export default function VideoPlaylist({ videos, selectedVideoId, onSelectVideo, title = "Unreviewed Videos", isStudentView = false, studentName, studentEmail }: VideoPlaylistProps) {
  if (videos.length === 0) {
    return <div className="p-4">No videos available</div>;
  }
  
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
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
        )}
      </div>
      <div className="divide-y divide-gray-800/50">
        {sortedVideos.map((video) => (
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
        ))}
      </div>
    </div>
  );
}
