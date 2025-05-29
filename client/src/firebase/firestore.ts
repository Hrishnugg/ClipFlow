import { db } from './config';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, limit, updateDoc, deleteDoc } from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const TEAMS_COLLECTION = 'teams';

export interface UserData {
  uid: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  selectedTeam?: string;
  isCoach?: boolean;
  isStudent?: boolean;
  isParent?: boolean;
  selectedView?: string;
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

export async function addNonExistentUser(email: string): Promise<string> {
  try {
    const uid = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const userData: UserData = {
      uid: uid,
      email: email,
      name: null,
      isCoach: true,
      createdAt: new Date().toISOString()
    };
    
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, userData);
    return uid;
  } catch (error) {
    console.error('Error adding non-existent user to Firestore:', error);
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

export async function updateUserIsCoach(uid: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, { isCoach: true }, { merge: true });
  } catch (error) {
    console.error('Error updating user isCoach status:', error);
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
  id?: string;
}

export async function createTeam(teamData: Omit<TeamData, 'memberIds'>): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    await ensureTeamsCollection();
    
    const memberIds: string[] = [];
    
    for (const email of teamData.members) {
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        await updateUserIsCoach(existingUser.uid);
        
        memberIds.push(existingUser.uid);
      } else {
        await addNonExistentUser(email);
        
      }
    }
    
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

export async function getTeamById(teamId: string): Promise<(TeamData & { id: string }) | null> {
  try {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      return { ...teamSnap.data() as TeamData, id: teamId };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting team by ID:', error);
    return null;
  }
}

export async function addMembersToTeam(
  teamId: string, 
  newEmails: string[]
): Promise<{ 
  success: boolean; 
  error?: string; 
  alreadyMembers?: string[];
}> {
  try {
    const team = await getTeamById(teamId);
    if (!team) {
      return { success: false, error: 'Team not found' };
    }
    
    const alreadyMembers = newEmails.filter(email => 
      team.members.map(m => m.toLowerCase()).includes(email.toLowerCase())
    );
    
    if (alreadyMembers.length === newEmails.length) {
      return { 
        success: false, 
        error: 'All emails are already members of this team',
        alreadyMembers
      };
    }
    
    const emailsToAdd = newEmails.filter(email => 
      !team.members.map(m => m.toLowerCase()).includes(email.toLowerCase())
    );
    
    const memberIds = [...team.memberIds];
    const members = [...team.members];
    
    for (const email of emailsToAdd) {
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        await updateUserIsCoach(existingUser.uid);
        members.push(email);
        memberIds.push(existingUser.uid);
      } else {
        await addNonExistentUser(email);
        members.push(email);
      }
    }
    
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(teamRef, {
      members,
      memberIds
    });
    
    return { 
      success: true, 
      alreadyMembers: alreadyMembers.length > 0 ? alreadyMembers : undefined 
    };
  } catch (error) {
    console.error('Error adding members to team:', error);
    return { 
      success: false, 
      error: 'An error occurred while adding members to the team. Please try again.' 
    };
  }
}

export async function getTeamsByMemberEmail(email: string): Promise<TeamData[]> {
  try {
    const teamsRef = collection(db, TEAMS_COLLECTION);
    const q = query(teamsRef, where('members', 'array-contains', email));
    const querySnapshot = await getDocs(q);
    
    const teams: TeamData[] = [];
    querySnapshot.forEach((doc) => {
      teams.push({ ...doc.data() as TeamData, id: doc.id });
    });
    
    return teams;
  } catch (error) {
    console.error('Error getting teams by member email:', error);
    return [];
  }
}

export async function updateTeamMemberIds(email: string, newUid: string, oldUid: string): Promise<TeamData[]> {
  try {
    const teams = await getTeamsByMemberEmail(email);
    const updatedTeams: TeamData[] = [];
    
    for (const team of teams) {
      if (team.id) {
        const teamRef = doc(db, TEAMS_COLLECTION, team.id);
        
        const filteredMemberIds = team.memberIds.filter(id => id !== oldUid);
        const updatedMemberIds = filteredMemberIds.includes(newUid) 
          ? filteredMemberIds 
          : [...filteredMemberIds, newUid];
        
        if (JSON.stringify(updatedMemberIds) !== JSON.stringify(team.memberIds)) {
          await updateDoc(teamRef, {
            memberIds: updatedMemberIds
          });
          
          console.log(`Updated memberIds for team ${team.id}: removed ${oldUid}, added ${newUid}`);
          updatedTeams.push({...team, memberIds: updatedMemberIds});
        } else {
          updatedTeams.push(team);
        }
      }
    }
    
    return updatedTeams;
  } catch (error) {
    console.error('Error updating team memberIds:', error);
    return [];
  }
}

export async function setFirstTeamAsSelected(uid: string): Promise<boolean> {
  try {
    const teams = await getTeamsForUser(uid);
    
    if (teams.length > 0) {
      const firstTeam = teams[0];
      if (firstTeam.id) {
        await updateUserSelectedTeam(uid, firstTeam.id);
        console.log(`Set first team ${firstTeam.id} as selected for user ${uid}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error setting first team as selected:', error);
    return false;
  }
}

export async function updateExistingUserUid(existingUser: UserData, newUid: string, newName: string | null = null): Promise<void> {
  try {
    const newUserRef = doc(db, USERS_COLLECTION, newUid);
    
    const updatedName = (newName && (existingUser.name === null)) ? newName : existingUser.name;
    
    await setDoc(newUserRef, {
      ...existingUser,
      uid: newUid,
      name: updatedName
    });
    
    const oldUserRef = doc(db, USERS_COLLECTION, existingUser.uid);
    await deleteDoc(oldUserRef);
    
    console.log(`Updated user UID from ${existingUser.uid} to ${newUid}`);
    if (updatedName !== existingUser.name) {
      console.log(`Updated user name from ${existingUser.name} to ${updatedName}`);
    }
  } catch (error) {
    console.error('Error updating user UID:', error);
  }
}

export async function updateUserSelectedView(uid: string, view: string): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, { selectedView: view }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating selected view for user:', error);
    return false;
  }
}

export async function getUserSelectedView(uid: string): Promise<string | null> {
  const userData = await getUser(uid);
  return userData?.selectedView || null;
}

export async function getTeamsForStudent(email: string): Promise<TeamData[]> {
  try {
    const rostersRef = collection(db, 'rosters');
    const rosterTeamIDs: Set<string> = new Set(); // Changed from array to Set for deduplication
    
    const querySnapshot = await getDocs(rostersRef);
    querySnapshot.forEach((doc) => {
      const rosterData = doc.data();
      const students = rosterData.students || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any  
      const isStudentInRoster = students.some((student: any) => 
        student.email === email
      );
      
      if (isStudentInRoster && rosterData.teamID) {
        rosterTeamIDs.add(rosterData.teamID); // Changed push to add for Set
      }
    });
    
    const teams: TeamData[] = [];
    for (const teamId of rosterTeamIDs) { // Set is iterable
      const team = await getTeamById(teamId);
      if (team) teams.push(team);
    }
    
    return teams;
  } catch (error) {
    console.error('Error getting teams for student:', error);
    return [];
  }
}

export async function getTeamsForParent(email: string): Promise<TeamData[]> {
  try {
    const rostersRef = collection(db, 'rosters');
    const rosterTeamIDs: Set<string> = new Set(); // Changed from array to Set for deduplication
    
    const querySnapshot = await getDocs(rostersRef);
    querySnapshot.forEach((doc) => {
      const rosterData = doc.data();
      const students = rosterData.students || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isParentInRoster = students.some((student: any) => 
        student.parentEmail === email
      );
      
      if (isParentInRoster && rosterData.teamID) {
        rosterTeamIDs.add(rosterData.teamID); // Changed push to add for Set
      }
    });
    
    const teams: TeamData[] = [];
    for (const teamId of rosterTeamIDs) { // Set is iterable
      const team = await getTeamById(teamId);
      if (team) teams.push(team);
    }
    
    return teams;
  } catch (error) {
    console.error('Error getting teams for parent:', error);
    return [];
  }
}

export const verifyParentStudentAccess = async (
  studentId: string, 
  userEmail: string, 
  selectedTeam: string
): Promise<boolean> => {
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      return false;
    }
    
    const studentData = studentSnap.data();
    const teamIDs = Array.isArray(studentData.teamID) ? studentData.teamID : [studentData.teamID];
    
    if (!teamIDs.includes(selectedTeam)) {
      return false;
    }
    
    const rostersRef = collection(db, 'rosters');
    const rostersQuery = query(rostersRef, where('teamID', '==', selectedTeam));
    const rostersSnapshot = await getDocs(rostersQuery);
    
    for (const rosterDoc of rostersSnapshot.docs) {
      const rosterData = rosterDoc.data();
      const rosterStudents = rosterData.students || [];
      
      for (const rosterStudent of rosterStudents) {
        if (rosterStudent.email === studentData.email && 
            rosterStudent.parentEmail === userEmail) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying parent-student access:', error);
    return false;
  }
};
