'use client';

import React from 'react';

interface TranscriptSectionProps {
  transcript: string | null;
}

export default function TranscriptSection({ transcript }: TranscriptSectionProps) {
  if (!transcript) {
    return (
      <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow mt-4">
        <h3 className="text-lg font-semibold mb-2">Transcript</h3>
        <p className="text-gray-500 dark:text-gray-400">No transcript available</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow mt-4">
      <h3 className="text-lg font-semibold mb-2">Transcript</h3>
      <div className="max-h-60 overflow-y-auto p-2">
        <p className="whitespace-pre-line">{transcript}</p>
      </div>
    </div>
  );
}
