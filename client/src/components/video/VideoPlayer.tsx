'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

interface VideoPlayerProps {
  videoUrl: string | null;
  title: string;
}

export default function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const handleVideoReady = useCallback((player: any) => {
    try {
      const internalPlayer = player.getInternalPlayer();
      if (internalPlayer && internalPlayer.videoWidth && internalPlayer.videoHeight) {
        const width = internalPlayer.videoWidth;
        const height = internalPlayer.videoHeight;
        const aspectRatio = width / height;
        
        setVideoDimensions({
          width,
          height,
          aspectRatio
        });
        setIsVideoReady(true);
      } else {
        setTimeout(() => {
          try {
            const retryPlayer = player.getInternalPlayer();
            if (retryPlayer && retryPlayer.videoWidth && retryPlayer.videoHeight) {
              const width = retryPlayer.videoWidth;
              const height = retryPlayer.videoHeight;
              const aspectRatio = width / height;
              
              setVideoDimensions({
                width,
                height,
                aspectRatio
              });
              setIsVideoReady(true);
            }
          } catch (error) {
            console.warn('Could not get video dimensions on retry:', error);
            setIsVideoReady(true);
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Could not get video dimensions:', error);
      setIsVideoReady(true);
    }
  }, []);

  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Select a video to play</p>
      </div>
    );
  }

  const getVideoContainerStyle = () => {
    if (!isVideoReady || !videoDimensions) {
      return {
        aspectRatio: '16 / 9',
        maxWidth: 'min(90vw, 800px)',
        maxHeight: 'min(70vh, 600px)',
        width: '100%'
      };
    }

    const { aspectRatio } = videoDimensions;
    
    const maxWidth = aspectRatio < 1 ? 'min(60vw, 400px)' : 'min(90vw, 800px)';
    const maxHeight = aspectRatio > 1.5 ? 'min(60vh, 450px)' : 'min(70vh, 600px)';
    
    return {
      aspectRatio: `${aspectRatio}`,
      maxWidth,
      maxHeight,
      width: '100%'
    };
  };

  return (
    <div className="w-full flex flex-col">
      <div 
        className="bg-black rounded-lg overflow-hidden mx-auto relative"
        style={getVideoContainerStyle()}
      >
        {!isVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
            <div className="text-white text-sm">Loading video...</div>
          </div>
        )}
        <ReactPlayer
          url={videoUrl}
          width="100%"
          height="100%"
          controls={true}
          playing={false}
          onReady={handleVideoReady}
          onError={(error) => {
            console.error('Video playback error:', error);
            setIsVideoReady(true);
          }}
        />
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
    </div>
  );
}
