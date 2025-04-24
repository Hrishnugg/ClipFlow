'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
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
  llmIdentifiedStudent?: string;
  confidence?: number;
  manuallySelected?: boolean;
  identificationAttempted?: boolean;
}

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [rosterName, setRosterName] = useState<string>('');
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [identifiedStudent, setIdentifiedStudent] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [processingIdentification, setProcessingIdentification] = useState<boolean>(false);
  const [identificationAttempted, setIdentificationAttempted] = useState<boolean>(false);
  const { user } = useAuth();
  
  const assemblyClient = new AssemblyAI({
    apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '',
  });

  const fetchRosterName = async (rosterId: string) => {
    if (!user) return;
    
    try {
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (rosterSnap.exists()) {
        const rosterData = rosterSnap.data();
        setRosterName(rosterData.name);
        setRosterStudents(rosterData.students || []);
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const videosRef = collection(db, 'videos');
        const q = query(
          videosRef, 
          where('userUID', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setLoading(false);
          return;
        }
        
        const firstDoc = querySnapshot.docs[0];
        const data = firstDoc.data();
        
        const video: Video = {
          id: firstDoc.id,
          title: data.title,
          url: data.url,
          rosterId: data.rosterId,
          userUID: data.userUID,
          createdAt: data.createdAt,
          size: data.size,
          type: data.type,
          transcript: data.transcript,
          transcriptionStatus: data.transcriptionStatus
        };
        
        setCurrentVideo(video);
        
        if (data.rosterId) {
          fetchRosterName(data.rosterId);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload = async (rosterId: string, file: File) => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      const storageRef = ref(storage, `videos/${user.uid}/${Date.now()}_${file.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Error uploading video:', error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const videoData: Omit<Video, 'id'> = {
            title: file.name,
            url: downloadURL,
            rosterId,
            userUID: user.uid,
            createdAt: new Date().toISOString(),
            size: file.size,
            type: file.type,
            transcriptionStatus: 'pending'
          };
          
          const docRef = await addDoc(collection(db, 'videos'), videoData);
          console.log('Video added with ID:', docRef.id);
          
          const newVideo: Video = {
            id: docRef.id,
            ...videoData
          };
          
          try {
            console.log('Starting transcription for video:', docRef.id);
            const transcriptionData = {
              audio: downloadURL
            };
            
            assemblyClient.transcripts.transcribe(transcriptionData)
              .then(async (transcript) => {
                if (transcript.text) {
                  await updateDoc(doc(db, 'videos', docRef.id), {
                    transcript: transcript.text,
                    transcriptionStatus: 'completed'
                  });
                  console.log('Transcription completed for video:', docRef.id);
                } else {
                  await updateDoc(doc(db, 'videos', docRef.id), {
                    transcriptionStatus: 'failed'
                  });
                  console.error('Transcription failed: No text returned');
                }
              })
              .catch(async (error) => {
                console.error('Error transcribing video:', error);
                await updateDoc(doc(db, 'videos', docRef.id), {
                  transcriptionStatus: 'failed'
                });
              });
          } catch (error) {
            console.error('Error starting transcription:', error);
          }
          
          setCurrentVideo(newVideo);
          fetchRosterName(rosterId);
        }
      );
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (!currentVideo || !user) return;
    
    const videoRef = doc(db, 'videos', currentVideo.id);
    
    const unsubscribe = onSnapshot(videoRef, (videoSnap) => {
      if (videoSnap.exists()) {
        const data = videoSnap.data();
        
        const updatedVideo = {
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
          identifiedStudent: data.identifiedStudent || '',
          llmIdentifiedStudent: data.llmIdentifiedStudent || '',
          confidence: data.confidence || 0,
          manuallySelected: data.manuallySelected || false,
          identificationAttempted: data.identificationAttempted || false
        };
        
        setCurrentVideo(updatedVideo);
        
        if (data.identifiedStudent) {
          setIdentifiedStudent(data.identifiedStudent);
          setConfidence(data.confidence || 0);
          setIdentificationAttempted(true);
        }
      }
    }, (error) => {
      console.error('Error setting up real-time listener:', error);
    });
    
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id, user]);

  const handleStudentIdentified = useCallback(async (studentName: string, studentConfidence: number) => {
    if (studentName === identifiedStudent && studentConfidence === confidence) {
      return;
    }
    
    setIdentifiedStudent(studentName);
    setConfidence(studentConfidence);

    if (currentVideo?.id) {
      const videoRef = doc(db, 'videos', currentVideo.id);
      const isManuallySelected = studentName !== currentVideo.llmIdentifiedStudent;

      await updateDoc(videoRef, {
        identifiedStudent: studentName,
        confidence: studentConfidence,
        manuallySelected: isManuallySelected
      });
    }
  }, [identifiedStudent, confidence, currentVideo?.id, currentVideo?.llmIdentifiedStudent]);

  useEffect(() => {
    const processTranscript = async () => {
      if (
        !currentVideo?.transcript || 
        processingIdentification || 
        rosterStudents.length === 0 ||
        currentVideo.identifiedStudent ||
        currentVideo.identificationAttempted
      ) {
        return;
      }

      try {
        setProcessingIdentification(true);

        const studentNames = rosterStudents.map(student => student.name);
        const studentNicknames = rosterStudents.map(student => student.nickname);

        const result = await identifyStudentFromTranscript(
          currentVideo.transcript,
          studentNames,
          studentNicknames
        );

        setIdentificationAttempted(true);

        if (result.confidence >= 70) {
          setIdentifiedStudent(result.identifiedStudent);
          setConfidence(result.confidence);

          const videoRef = doc(db, 'videos', currentVideo.id);
          await updateDoc(videoRef, {
            identifiedStudent: result.identifiedStudent,
            llmIdentifiedStudent: result.identifiedStudent,
            confidence: result.confidence,
            manuallySelected: false
          });
        } else {
          setConfidence(0);
          const videoRef = doc(db, 'videos', currentVideo.id);
          await updateDoc(videoRef, {
            identificationAttempted: true,
            confidence: 0
          });
        }
      } catch (error) {
        console.error('Error identifying student:', error);
        setIdentificationAttempted(true);
        setConfidence(0);

        const videoRef = doc(db, 'videos', currentVideo.id);
        await updateDoc(videoRef, {
          identificationAttempted: true,
          confidence: 0
        });
      } finally {
        setProcessingIdentification(false);
      }
    };

    processTranscript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.transcript, currentVideo?.identifiedStudent, currentVideo?.id, currentVideo?.identificationAttempted, rosterStudents, processingIdentification]);

  const isProcessing = loading || 
                      (currentVideo?.transcriptionStatus === 'pending') || 
                      processingIdentification || 
                      (currentVideo?.transcript && !identificationAttempted);

  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Process Video</h1>
          <button
            onClick={handleUpload}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Videos'}
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading videos...</p>
          </div>
        ) : !currentVideo ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
            <p className="mb-4">No videos uploaded, please upload a video</p>
            <button
              onClick={handleUpload}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Videos'}
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg font-medium mb-2">
              {loading ? "Loading video details..." : 
               currentVideo?.transcriptionStatus === 'pending' ? "Transcribing video..." : 
               processingIdentification ? "Identifying student..." : 
               "Processing video..."}
            </p>
            <p className="text-sm text-gray-500">
              Please wait while we prepare your video
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">{currentVideo.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Roster:</span> {rosterName}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Size:</span> {formatFileSize(currentVideo.size)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Uploaded:</span> {new Date(currentVideo.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                  <video
                    className="w-full h-full"
                    controls
                    src={currentVideo.url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Transcript</h2>
                  </div>
                  
                  {currentVideo.transcriptionStatus === 'pending' && (
                    <div className="flex items-center justify-center py-8 bg-gray-100 dark:bg-gray-700 rounded">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p>Transcribing video...</p>
                    </div>
                  )}
                  
                  {currentVideo.transcript && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded max-h-96 overflow-y-auto">
                      <p className="whitespace-pre-wrap">{currentVideo.transcript}</p>
                    </div>
                  )}
                  
                  {!currentVideo.transcript && currentVideo.transcriptionStatus !== 'pending' && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-center">
                      <p>No transcript available. Transcription is automatically initiated when videos are uploaded.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="md:col-span-1">
              {rosterStudents.length > 0 && currentVideo.transcript && (
                <StudentIdentification
                  students={rosterStudents}
                  transcript={currentVideo.transcript}
                  onIdentified={handleStudentIdentified}
                  identifiedStudent={identifiedStudent}
                  llmIdentifiedStudent={currentVideo?.llmIdentifiedStudent}
                  confidence={confidence}
                  manuallySelected={currentVideo?.manuallySelected}
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
                  {confidence === 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-sm mb-1">Confidence Level:</p>
                      <div className="text-lg font-bold text-amber-600">0.0%</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <UploadVideoModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onUpload={handleFileUpload} 
      />
    </AuthenticatedLayout>
  );
}
