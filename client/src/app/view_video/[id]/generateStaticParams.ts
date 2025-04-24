import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function generateStaticParams() {
  const videosSnapshot = await getDocs(collection(db, 'videos'));
  
  return videosSnapshot.docs.map((doc) => ({
    id: doc.id,
  }));
}

export default generateStaticParams;
