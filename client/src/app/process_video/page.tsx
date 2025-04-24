'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, updateDoc, doc, getDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import { AssemblyAI } from 'assemblyai';
import StudentIdentification from '@/components/student/StudentIdentification';

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
  confidence?: number;
  underReview?: boolean;
  saved?: boolean;
  reviewStatus?: 'pending' | 'completed';
}

type SessionMode = 'upload' | 'review';

export default function ProcessVideo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>('upload');
  const [loading, setLoading] = useState(false);
  const [rosterName, setRosterName] = useState<string>('');
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [identifiedStudent, setIdentifiedStudent] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const { user } = useAuth();

  const assemblyClient = new AssemblyAI({
    apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '',
  });

  const fetchRosterDetails = async (rosterId: string) => {
    if (!user || !rosterId) return;

    try {
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);

      if (rosterSnap.exists()) {
        const data = rosterSnap.data();
        setRosterName(data.name);
        setRosterStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching roster details:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchVideoUnderReview = async () => {
        try {
          setLoading(true);
          const videosRef = collection(db, 'videos');
          const videoQuery = query(
            videosRef, 
            where('userUID', '==', user.uid),
            where('underReview', '==', true)
          );
          
          const videoSnapshot = await getDocs(videoQuery);
          
          if (!videoSnapshot.empty) {
            const videoDoc = videoSnapshot.docs[0];
            const videoData = videoDoc.data();
            
            setCurrentVideo({
              id: videoDoc.id,
              ...videoData
            } as Video);
            
            setSessionMode('review');
            
            // Fetch roster details for student identification
            if (videoData.rosterId) {
              await fetchRosterDetails(videoData.rosterId);
            }
            
            if (videoData.identifiedStudent) {
              setIdentifiedStudent(videoData.identifiedStudent);
              setConfidence(videoData.confidence || 0);
            }
          }
        } catch (error) {
          console.error('Error fetching video under review:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchVideoUnderReview();
    }
  }, [user, fetchRosterDetails]);

  const handleStudentIdentified = async (studentName: string, studentConfidence: number) => {
    setIdentifiedStudent(studentName);
    setConfidence(studentConfidence);

    if (currentVideo?.id) {
      const videoRef = doc(db, 'videos', currentVideo.id);
      await updateDoc(videoRef, {
        identifiedStudent: studentName,
        confidence: studentConfidence,
        manuallySelected: true
      });
    }
  };

  const handleDeleteVideo = async () => {
    if (!currentVideo || !user) return;

    try {
      setLoading(true);

      const videoStorageRef = ref(storage, currentVideo.url);
      await deleteObject(videoStorageRef);

      await deleteDoc(doc(db, 'videos', currentVideo.id));

      setCurrentVideo(null);
      setSessionMode('upload');
      setIdentifiedStudent('');
      setConfidence(0);
      setRosterStudents([]);
      setRosterName('');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!currentVideo || !identifiedStudent) return;

    try {
      setLoading(true);

      const videoRef = doc(db, 'videos', currentVideo.id);
      await updateDoc(videoRef, {
        identifiedStudent,
        confidence,
        saved: true,
        underReview: false,
        reviewStatus: 'completed'
      });

      setCurrentVideo(null);
      setSessionMode('upload');
      setIdentifiedStudent('');
      setConfidence(0);
      setRosterStudents([]);
      setRosterName('');
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Failed to save video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            transcriptionStatus: 'pending',
            underReview: true,
            saved: false
          };

          const docRef = await addDoc(collection(db, 'videos'), videoData);
          console.log('Video added with ID:', docRef.id);

          const newVideo: Video = {
            id: docRef.id,
            ...videoData
          };

          setCurrentVideo(newVideo);
          setSessionMode('review');

          await fetchRosterDetails(rosterId);

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

                  setCurrentVideo(prev => prev ? {
                    ...prev,
                    transcript: transcript.text,
                    transcriptionStatus: 'completed'
                  } : null);
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
        }
      );
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };


  return (
    <AuthenticatedLayout>
      <div className="p-8 w-full">
        {sessionMode === 'upload' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Process Video</h1>
              <button
                onClick={handleUpload}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
              <p className="mb-4">Upload a video to process</p>
              <button
                onClick={handleUpload}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-6">
              <h1 className="text-2xl font-bold">Review Video</h1>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <p>Loading...</p>
              </div>
            ) : !currentVideo ? (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
                <p className="mb-4">Video not found.</p>
                <button
                  onClick={() => setSessionMode('upload')}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700"
                >
                  Back to Upload
                </button>
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
                        <span className="font-medium">Size:</span> {(currentVideo.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Uploaded:</span> {formatDate(currentVideo.createdAt)}
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

                    {/* Action buttons */}
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={handleDeleteVideo}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-red-700"
                        disabled={loading}
                      >
                        {loading ? 'Processing...' : 'Delete Video'}
                      </button>
                      <button
                        onClick={handleSaveVideo}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-green-700"
                        disabled={loading || !identifiedStudent}
                      >
                        {loading ? 'Processing...' : 'Save Video'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1">
                  {rosterStudents.length > 0 && (
                    <StudentIdentification
                      students={rosterStudents}
                      transcript={currentVideo.transcript || null}
                      onIdentified={handleStudentIdentified}
                      identifiedStudent={identifiedStudent}
                      confidence={confidence}
                    />
                  )}
                </div>
              </div>
            )}
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
