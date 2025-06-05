import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { identifyStudentViaLLM, getStudentNamesFromRoster } from './llm';

/**
 * Process a single video by uploading it to Firebase Storage and adding it to Firestore
 */
export async function processVideo(
  video: File, 
  rosterId: string,
  user_uid: string,
  teamID?: string
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    const storageRef = ref(storage, `videos/${Date.now()}_${video.name}`);
    const snapshot = await uploadBytes(storageRef, video);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const transcodingResult = await transcodeVideo(downloadURL, storageRef.fullPath);
    if (!transcodingResult.success) {
      console.warn('Transcoding failed, proceeding with original video:', transcodingResult.error);
    }
    
    const transcriptionResult = await transcribeVideo(downloadURL);
    const transcript = transcriptionResult.success ? transcriptionResult.transcript : '';
    
    let identifiedStudent = '';
    let confidenceLevel = 0;
    let identifiedStudentEmail = '';
    let duplicateStudent = false;

    if (transcript && rosterId) {
      const studentNames = await getStudentNamesFromRoster(rosterId);
      
      if (studentNames.length > 0) {
        const identification = await identifyStudentViaLLM(studentNames, transcript);
        identifiedStudent = identification.identifiedStudent;
        confidenceLevel = identification.confidence;
        
        if (identifiedStudent) {
          const nameMatches = studentNames.filter(nameWithEmail => {
            const match = nameWithEmail.match(/(.*) \((.*)\)/);
            return match && match[1] === identifiedStudent;
          });
          
          duplicateStudent = nameMatches.length > 1;
          
          if (nameMatches.length > 0) {
            const match = nameMatches[0].match(/(.*) \((.*)\)/);
            if (match) {
              identifiedStudentEmail = match[2];
            }
          }
        }
      }
    }
    
    const videoData = {
      title: video.name.replace(/\.(mp4|mov)$/i, ''),
      asset: downloadURL,
      rosterId: rosterId, 
      isReviewed: false,
      uploadDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      transcript: transcript,
      user_uid: user_uid,
      identifiedStudent: identifiedStudent,
      identifiedStudentEmail: identifiedStudentEmail,
      duplicateStudent: duplicateStudent,
      confidenceLevel: confidenceLevel,
      teamID: teamID
    };
    
    const videoRef = await addDoc(collection(db, 'videos'), videoData);
    
    return { success: true, videoId: videoRef.id };
  } catch (error) {
    console.error('Error processing video:', error);
    return { 
      success: false, 
      error: 'An error occurred while processing the video. Please try again.' 
    };
  }
}
/**
 * Transcode a video using Google Transcoder API for cross-browser compatibility
 */
async function transcodeVideo(videoUrl: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/transcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, storagePath })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error transcoding video:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown transcoding error'
    };
  }
}

/**
 * Transcribe a video using AssemblyAI
 */
export async function transcribeVideo(
  videoUrl: string
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  try {
    
    const { AssemblyAI } = await import('assemblyai');
    const apiKey = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('AssemblyAI API key is not defined');
    }
    
    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    const result = await client.transcripts.transcribe({
      audio: videoUrl,
    });
    
    return { success: true, transcript: result.text || '' };
  } catch (error) {
    console.error('Error transcribing video:', error);
    return { 
      success: false, 
      error: 'Failed to transcribe video. Will proceed with upload without transcript.',
      transcript: ''
    };
  }
}


/**
 * Check if videos collection exists, create if it doesn't
 */
export async function ensureVideosCollection(): Promise<boolean> {
  try {
    const videosRef = collection(db, 'videos');
    await getDocs(query(videosRef, limit(1)));
    return true;
  } catch (error) {
    console.error('Error checking videos collection:', error);
    return false;
  }
}
