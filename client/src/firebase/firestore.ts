import { db } from './config';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, limit } from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const TEAMS_COLLECTION = 'teams';

export interface UserData {
  uid: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  selectedTeam?: string;
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

export async function ensureTeamsCollection(): Promise<boolean> {
  try {
    const teamsRef = collection(db, TEAMS_COLLECTION);
    await getDocs(query(teamsRef, limit(1)));
    return true;
  } catch (error) {
    console.error('Error checking teams collection:', error);
    return false;
  }
}

export interface TeamData {
  name: string;
  members: string[];
  memberIds: string[];
  owner_uid: string;
  createdAt: string;
}

export async function createTeam(teamData: Omit<TeamData, 'memberIds'>): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    await ensureTeamsCollection();
    
    const memberIdsPromises = teamData.members.map(async (email) => {
      const user = await getUserByEmail(email);
      return user?.uid || null;
    });
    
    const memberIds = (await Promise.all(memberIdsPromises)).filter(id => id !== null) as string[];
    
    const teamDocData: TeamData = {
      ...teamData,
      memberIds,
      createdAt: new Date().toISOString()
    };
    
    const teamRef = await addDoc(collection(db, TEAMS_COLLECTION), teamDocData);
    return { success: true, teamId: teamRef.id };
  } catch (error) {
    console.error('Error creating team:', error);
    return { 
      success: false, 
      error: 'An error occurred while creating the team. Please try again.' 
    };
  }
}

export async function getTeamsForUser(uid: string): Promise<TeamData[]> {
  try {
    const teamsRef = collection(db, TEAMS_COLLECTION);
    
    const ownerQuery = query(teamsRef, where('owner_uid', '==', uid));
    const memberQuery = query(teamsRef, where('memberIds', 'array-contains', uid));
    
    const [ownerSnapshot, memberSnapshot] = await Promise.all([
      getDocs(ownerQuery),
      getDocs(memberQuery)
    ]);
    
    const teams: { [id: string]: TeamData & { id: string } } = {};
    
    ownerSnapshot.forEach((doc) => {
      teams[doc.id] = { ...doc.data() as TeamData, id: doc.id };
    });
    
    memberSnapshot.forEach((doc) => {
      if (!teams[doc.id]) {
        teams[doc.id] = { ...doc.data() as TeamData, id: doc.id };
      }
    });
    
    return Object.values(teams).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error getting teams for user:', error);
    return [];
  }
}

export async function checkTeamNameExists(uid: string, teamName: string): Promise<boolean> {
  try {
    const teams = await getTeamsForUser(uid);
    return teams.some(team => team.name.toLowerCase() === teamName.toLowerCase());
  } catch (error) {
    console.error('Error checking team name:', error);
    return false;
  }
}

export async function updateUserSelectedTeam(uid: string, teamId: string): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, { selectedTeam: teamId }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating selected team for user:', error);
    return false;
  }
}

export async function getUserSelectedTeam(uid: string): Promise<string | null> {
  const userData = await getUser(uid);
  return userData?.selectedTeam || null;
}
