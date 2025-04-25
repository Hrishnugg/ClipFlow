import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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
    const storageRef = ref(storage, `videos/${Date.now()}_${video.name}`);
    const snapshot = await uploadBytes(storageRef, video);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    const videoData = {
      title: video.name.replace('.mp4', ''),
      asset: downloadURL,
      rosterId: rosterId, 
      isReviewed: false,
      uploadDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
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
 * Check if videos collection exists, create if it doesn't
 */
export async function ensureVideosCollection(): Promise<boolean> {
  try {
    const videosRef = collection(db, 'videos');
    await getDocs(query(videosRef, where('__name__', '>=', '')));
    return true;
  } catch (error) {
    console.error('Error checking videos collection:', error);
    return false;
  }
}
