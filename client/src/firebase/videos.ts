import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';

/**
 * Process a single video by uploading it to Firebase Storage and adding it to Firestore
 */
export async function processVideo(
  video: File, 
  rosterId: string
): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    const transcriptionResult = await transcribeVideo(video);
    const transcript = transcriptionResult.success ? transcriptionResult.transcript : '';
    
    const storageRef = ref(storage, `videos/${Date.now()}_${video.name}`);
    const snapshot = await uploadBytes(storageRef, video);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const videoData = {
      title: video.name.replace('.mp4', ''),
      asset: downloadURL,
      rosterId: rosterId, 
      isReviewed: false,
      uploadDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      transcript: transcript
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
 * Transcribe a video using AssemblyAI
 */
export async function transcribeVideo(
  video: File
): Promise<{ success: boolean; transcript?: string; error?: string }> {
  try {
    const videoUrl = URL.createObjectURL(video);
    
    const { AssemblyAI } = await import('assemblyai');
    const apiKey = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('AssemblyAI API key is not defined');
    }
    
    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    // Use the correct parameter structure for AssemblyAI
    const result = await client.transcripts.transcribe({
      audio: videoUrl,
    });
    
    URL.revokeObjectURL(videoUrl);
    
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
