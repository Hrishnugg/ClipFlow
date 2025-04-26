'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

interface VideoPlayerProps {
  videoUrl: string | null;
  title: string;
}

export default function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Select a video to play</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <ReactPlayer
          url={videoUrl}
          width="100%"
          height="100%"
          controls={true}
          playing={true}
        />
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
    </div>
  );
}
