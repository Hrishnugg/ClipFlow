'use client';

import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/components/navigation/AuthenticatedLayout';
import UploadVideoModal from '@/components/modals/UploadVideoModal';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, updateDoc, doc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import { AssemblyAI } from 'assemblyai';
import { identifyStudentFromTranscript } from '@/utils/claude';

interface Student {
  name: string;
  email: string;
  parentEmail: string;
  nickname: string;
}

export interface Video {
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
  isReviewed?: boolean;
  fromZip?: boolean;
  zipGroupId?: string | null;
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
  const [deleting, setDeleting] = useState<boolean>(false);
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
        
        if (data.fromZip && data.zipGroupId) {
          const zipGroupId = data.zipGroupId;
          const zipVideosQuery = query(
            collection(db, 'videos'),
            where('userUID', '==', user.uid),
            where('zipGroupId', '==', zipGroupId),
            orderBy('createdAt', 'asc')
          );
          
          const zipVideosSnapshot = await getDocs(zipVideosQuery);
          const zipVideos: Video[] = [];
          
          zipVideosSnapshot.forEach(doc => {
            const data = doc.data();
            zipVideos.push({
              id: doc.id,
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
              identificationAttempted: data.identificationAttempted || false,
              isReviewed: data.isReviewed || false
            });
          });
          
          setZipUploadedVideos(zipVideos);
          
          if (zipVideos.length > 0) {
            setCurrentVideo(zipVideos[0]);
            if (zipVideos[0].rosterId) {
              fetchRosterName(zipVideos[0].rosterId);
            }
            return;
          }
        }
        
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
          transcriptionStatus: data.transcriptionStatus,
          identifiedStudent: data.identifiedStudent || '',
          llmIdentifiedStudent: data.llmIdentifiedStudent || '',
          confidence: data.confidence || 0,
          manuallySelected: data.manuallySelected || false,
          identificationAttempted: data.identificationAttempted || false,
          isReviewed: data.isReviewed || false
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
  
  const [zipUploadedVideos, setZipUploadedVideos] = useState<Video[]>([]);
  
  const areAllVideosProcessed = () => {
    if (zipUploadedVideos.length === 0) return false;
    
    return zipUploadedVideos.every(video => 
      video.transcriptionStatus === 'completed' && 
      video.identificationAttempted === true
    );
  };
  
  const handleZipUpload = async (rosterId: string, zipFile: File) => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      const JSZip = (await import('jszip')).default;
      
      const zip = new JSZip();
      
      const zipContents = await zip.loadAsync(zipFile);
      
      const videoFiles: { name: string, content: Blob }[] = [];
      
      const uploadedVideos: Video[] = [];
      
      const filePromises: Promise<void>[] = [];
      
      const zipGroupId = `zip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      zipContents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          if (relativePath.includes('__MACOSX')) {
            console.log(`Skipping Mac OS X metadata file: ${relativePath}`);
            return;
          }
          
          const isVideoFile = relativePath.toLowerCase().endsWith('.mp4');
          
          if (isVideoFile) {
            console.log(`Processing video file: ${relativePath}`);
            const promise = zipEntry.async('blob').then(content => {
              const file = new File([content], zipEntry.name, { type: 'video/mp4' });
              videoFiles.push({ name: zipEntry.name, content: file });
            });
            
            filePromises.push(promise);
          }
        }
      });
      
      await Promise.all(filePromises);
      
      console.log(`Found ${videoFiles.length} videos in the zip file`);
      
      for (const videoFile of videoFiles) {
        try {
          const file = new File([videoFile.content], videoFile.name, { type: 'video/mp4' });
          
          const storageRef = ref(storage, `videos/${user.uid}/${Date.now()}_${file.name}`);
          
          const uploadTask = uploadBytesResumable(storageRef, file);
          
          const downloadURL = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload of ${file.name} is ${progress}% done`);
              },
              (error) => {
                console.error(`Error uploading ${file.name}:`, error);
                reject(error);
              },
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
          
          const videoData: Omit<Video, 'id'> = {
            title: file.name,
            url: downloadURL,
            rosterId,
            userUID: user.uid,
            createdAt: new Date().toISOString(),
            size: file.size,
            type: file.type,
            transcriptionStatus: 'pending',
            isReviewed: false,
            fromZip: true,
            zipGroupId: zipGroupId
          };
          
          const docRef = await addDoc(collection(db, 'videos'), videoData);
          console.log(`Video ${file.name} added with ID:`, docRef.id);
          
          const newVideo: Video = {
            id: docRef.id,
            ...videoData
          };
          
          uploadedVideos.push(newVideo);
          
          try {
            console.log(`Starting transcription for video: ${docRef.id}`);
            const transcriptionData = {
              audio: downloadURL
            };
            
            await assemblyClient.transcripts.transcribe(transcriptionData)
              .then(async (transcript) => {
                if (transcript.text) {
                  await updateDoc(doc(db, 'videos', docRef.id), {
                    transcript: transcript.text,
                    transcriptionStatus: 'completed'
                  });
                  console.log(`Transcription completed for video: ${docRef.id}`);
                  
                  // After transcription, run student identification
                  await processVideoIdentification(docRef.id, transcript.text, rosterId);
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
            console.error(`Error starting transcription for ${file.name}:`, error);
          }
        } catch (error) {
          console.error(`Error processing video ${videoFile.name}:`, error);
        }
      }
      
      setZipUploadedVideos(uploadedVideos);
      
      console.log('Videos uploaded via zip:', uploadedVideos);
      
      if (uploadedVideos.length > 0) {
        setCurrentVideo(uploadedVideos[uploadedVideos.length - 1]);
        fetchRosterName(rosterId);
      }
      
    } catch (error) {
      console.error('Error handling zip upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (rosterId: string, file: File, isZipFile?: boolean) => {
    if (!user) return;
    
    if (isZipFile) {
      await handleZipUpload(rosterId, file);
      return;
    }
    
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
            isReviewed: false,
            fromZip: false,
            zipGroupId: null
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
          identificationAttempted: data.identificationAttempted || false,
          isReviewed: data.isReviewed || false
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

  const handleDeleteVideo = async () => {
    if (!currentVideo || !user || deleting) return;
    
    try {
      setDeleting(true);
      
      const videoPath = currentVideo.url.split('videos%2F')[1].split('?')[0];
      const decodedPath = decodeURIComponent(videoPath);
      const storageRef = ref(storage, `videos/${decodedPath}`);
      
      await deleteObject(storageRef).catch(error => {
        console.error('Error deleting video from storage:', error);
      });
      
      const videoRef = doc(db, 'videos', currentVideo.id);
      await deleteDoc(videoRef);
      
      setCurrentVideo(null);
      setIdentifiedStudent('');
      setConfidence(0);
      setIdentificationAttempted(false);
      
    } catch (error) {
      console.error('Error deleting video:', error);
    } finally {
      setDeleting(false);
    }
  };

  const processVideoIdentification = async (videoId: string, transcript: string, rosterId: string) => {
    try {
      // Get roster students for identification
      const rosterRef = doc(db, 'rosters', rosterId);
      const rosterSnap = await getDoc(rosterRef);
      
      if (!rosterSnap.exists()) {
        console.error('Roster not found for student identification');
        return;
      }
      
      const rosterData = rosterSnap.data();
      const students = rosterData.students || [];
      
      if (students.length === 0) {
        console.error('No students found in roster for identification');
        return;
      }
      
      const studentNames = students.map((student: Student) => student.name);
      const studentNicknames = students.map((student: Student) => student.nickname);
      
      const result = await identifyStudentFromTranscript(
        transcript,
        studentNames,
        studentNicknames
      );
      
      const videoRef = doc(db, 'videos', videoId);
      
      if (result.confidence >= 70) {
        await updateDoc(videoRef, {
          identifiedStudent: result.identifiedStudent,
          llmIdentifiedStudent: result.identifiedStudent,
          confidence: result.confidence,
          manuallySelected: false,
          identificationAttempted: true
        });
        console.log(`Student identification completed for video: ${videoId}`);
      } else {
        await updateDoc(videoRef, {
          identificationAttempted: true,
          confidence: 0
        });
        console.log(`Could not identify student with confidence for video: ${videoId}`);
      }
    } catch (error) {
      console.error('Error identifying student:', error);
      const videoRef = doc(db, 'videos', videoId);
      await updateDoc(videoRef, {
        identificationAttempted: true,
        confidence: 0
      });
    }
  };

  const isProcessing = loading || 
                      (currentVideo?.transcriptionStatus === 'pending') || 
                      processingIdentification || 
                      (currentVideo?.transcript && !identificationAttempted);
  
  const allVideosProcessed = areAllVideosProcessed();
  const showPlaylist = zipUploadedVideos.length > 1 && allVideosProcessed;

  const handleVideoSelect = (video: Video) => {
    setCurrentVideo(video);
    setIdentifiedStudent(video.identifiedStudent || '');
    setConfidence(video.confidence || 0);
    setIdentificationAttempted(video.identificationAttempted || false);
  };

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
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <div className="text-center">
              <p className="text-green-600 font-medium">Video uploaded successfully!</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Your video has been processed and saved to the database.
              </p>
              <button
                onClick={handleUpload}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded shadow hover:bg-blue-700 mt-4"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Another Video'}
              </button>
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
