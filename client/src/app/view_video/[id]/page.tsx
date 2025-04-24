'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
// @ts-ignore
import { AssemblyAI } from 'assemblyai';
import StudentIdentification from '@/components/student/StudentIdentification';
import { identifyStudentFromTranscript } from '@/utils/claude';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  rosterId: string;
  userUID: string;
  createdAt: string;
  size: number;
  type: string;
  transcript?: string | null;
  transcriptionStatus?: 'pending' | 'completed' | 'failed';
  identifiedStudent?: string;
}

export default function VideoDetail() {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterName, setRosterName] = useState<string>('');
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [identifiedStudent, setIdentifiedStudent] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [processingIdentification, setProcessingIdentification] = useState<boolean>(false);
  const [identificationAttempted, setIdentificationAttempted] = useState<boolean>(false);
  // transcribing state removed as it's handled by transcriptionStatus
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  const assemblyClient = new AssemblyAI({
    apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '',
  });

  useEffect(() => {
    const processTranscript = async () => {
      if (
        !video?.transcript || 
        processingIdentification || 
        rosterStudents.length === 0 || 
        identifiedStudent
      ) {
        return;
      }

      if (video.identifiedStudent) {
        setIdentifiedStudent(video.identifiedStudent);
        return;
      }

      try {
        setProcessingIdentification(true);
        
        const studentNames = rosterStudents.map(student => student.name);
        const studentNicknames = rosterStudents.map(student => student.nickname);
        
        const result = await identifyStudentFromTranscript(
          video.transcript, 
          studentNames,
          studentNicknames
        );
        
        setIdentificationAttempted(true);
        
        // Only set the identified student if confidence meets threshold
        if (result.confidence >= 70) {
          setIdentifiedStudent(result.identifiedStudent);
          setConfidence(result.confidence);
          
          const videoRef = doc(db, 'videos', video.id);
          await updateDoc(videoRef, {
            identifiedStudent: result.identifiedStudent
          });
        }
      } catch (error) {
        console.error('Error identifying student:', error);
        setIdentificationAttempted(true);
      } finally {
        setProcessingIdentification(false);
      }
    };

    processTranscript();
  }, [video?.transcript, video?.identifiedStudent, video?.id, rosterStudents, processingIdentification, identifiedStudent]);


  useEffect(() => {
    if (!user || !videoId) return;
    
    setLoading(true);
    const videoRef = doc(db, 'videos', videoId);
    
    const unsubscribe = onSnapshot(videoRef, async (videoSnap) => {
      if (videoSnap.exists()) {
        const data = videoSnap.data();
        
        if (data.userUID !== user.uid) {
          console.error('Unauthorized access to video');
          router.push('/process_video');
          return;
        }
        
        setVideo({
          id: videoSnap.id,
          title: data.title,
          url: data.url,
          rosterId: data.rosterId,
          userUID: data.userUID,
          createdAt: data.createdAt,
          size: data.size,
          type: data.type,
          transcript: data.transcript,
          transcriptionStatus: data.transcriptionStatus,
          identifiedStudent: data.identifiedStudent || ''
        });
        
        if (data.rosterId) {
          const rosterRef = doc(db, 'rosters', data.rosterId);
          const rosterSnap = await getDoc(rosterRef);
          
          if (rosterSnap.exists()) {
            const rosterData = rosterSnap.data();
            setRosterName(rosterData.name);
            setRosterStudents(rosterData.students || []);
          }
        }
        
        setLoading(false);
      } else {
        console.error('Video not found');
        router.push('/process_video');
      }
    }, (error) => {
      console.error('Error setting up real-time listener:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, videoId, router]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleStudentIdentified = async (studentName: string, studentConfidence: number) => {
    setIdentifiedStudent(studentName);
    setConfidence(studentConfidence);
    
    if (video?.id) {
      const videoRef = doc(db, 'videos', video.id);
      await updateDoc(videoRef, {
        identifiedStudent: studentName
      });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/process_video')}
            className="mr-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Process Video
          </button>
          <h1 className="text-2xl font-bold">{video?.title || 'Video Details'}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading video details...</p>
          </div>
        ) : !video ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">Video not found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <div className="mb-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Roster:</span> {rosterName}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Size:</span> {formatFileSize(video.size)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Uploaded:</span> {new Date(video.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                  <video
                    className="w-full h-full"
                    controls
                    src={video.url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Transcript</h2>
                  </div>

                  {transcriptionError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                      {transcriptionError}
                    </div>
                  )}

                  {video.transcriptionStatus === 'pending' && (
                    <div className="flex items-center justify-center py-8 bg-gray-100 dark:bg-gray-700 rounded">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p>Transcribing video...</p>
                    </div>
                  )}

                  {video.transcript && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded max-h-96 overflow-y-auto">
                      <p className="whitespace-pre-wrap">{video.transcript}</p>
                    </div>
                  )}

                  {!video.transcript && video.transcriptionStatus !== 'pending' && !transcriptionError && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-center">
                      <p>No transcript available. Transcription is automatically initiated when videos are uploaded.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="md:col-span-1">
              {rosterStudents.length > 0 && video.transcript && (
                <StudentIdentification 
                  students={rosterStudents}
                  transcript={video.transcript}
                  onIdentified={handleStudentIdentified}
                  identifiedStudent={identifiedStudent}
                  confidence={confidence}
                />
              )}
              
              {processingIdentification && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md mt-4">
                  <div className="flex items-center justify-center py-4">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Identifying student...</p>
                  </div>
                </div>
              )}
              
              {identificationAttempted && !processingIdentification && !identifiedStudent && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md mt-4">
                  <div className="text-center py-4">
                    <p className="text-amber-600 mb-2">Could not identify a student with confidence.</p>
                    <p>Please manually select a student from the dropdown above.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
