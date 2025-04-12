import { db } from './config';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export interface UserData {
  uid: string;
  name: string | null;
  email: string | null;
  createdAt: string;
}

export async function addUser(userData: UserData): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userData.uid);
    await setDoc(userRef, userData);
  } catch (error) {
    console.error('Error adding user to Firestore:', error);
    throw error;
  }
}

export async function getUser(uid: string): Promise<UserData | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const querySnapshot = await getDocs(usersRef);
    
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserData);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users from Firestore:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user by email from Firestore:', error);
    throw error;
  }
}
