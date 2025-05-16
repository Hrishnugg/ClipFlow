import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './config';
import { getUserByEmail } from './firestore';

/**
 * Validates an email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface Student {
  id?: string;
  name: string;
  email: string;
  parentEmail: string;
  teamID?: string[]; // Array of team IDs
}

/**
 * Adds a student to the students collection if they don't already exist,
 * or updates their parent email if they do exist.
 */
export async function addOrUpdateStudent(student: Student, user_uid: string, teamID: string): Promise<string> {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('email', '==', student.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingStudentDoc = querySnapshot.docs[0];
      const existingStudent = existingStudentDoc.data();
      
      const teamIDs = existingStudent.teamID || [];
      
      if (!teamIDs.includes(teamID)) {
        teamIDs.push(teamID);
      }
      
      await setDoc(doc(db, 'students', existingStudentDoc.id), {
        ...existingStudent,
        parentEmail: student.parentEmail,
        teamID: teamIDs
      }, { merge: true });
      
      return existingStudentDoc.id;
    } else {
      const newStudentRef = doc(collection(db, 'students'));
      await setDoc(newStudentRef, {
        name: student.name,
        email: student.email,
        parentEmail: student.parentEmail,
        user_uid: user_uid,
        teamID: [teamID], // Initialize as array with the first teamID
        createdAt: new Date().toISOString()
      });
      
      return newStudentRef.id;
    }
  } catch (error) {
    console.error('Error adding/updating student:', error);
    throw error;
  }
}

/**
 * Validates a roster of students to ensure there are no duplicates
 * and all required fields are present.
 */
export async function validateRoster(students: Student[]): Promise<{ valid: boolean; error?: string }> {
  if (students.length === 0) {
    return { valid: false, error: 'Roster cannot be empty.' };
  }
  
  const emails = new Set<string>();
  for (const student of students) {
    if (emails.has(student.email)) {
      return { 
        valid: false, 
        error: `Duplicate student email found: ${student.email}. A roster cannot have duplicate students.` 
      };
    }
    emails.add(student.email);
    
    if (!student.name || !student.email) {
      return { 
        valid: false, 
        error: 'All students must have a name and email.' 
      };
    }

    if (!isValidEmail(student.email)) {
      return {
        valid: false,
        error: `Invalid student email format: ${student.email}. Please ensure all emails are valid.`
      };
    }

    if (student.parentEmail && !isValidEmail(student.parentEmail)) {
      return {
        valid: false,
        error: `Invalid parent email format: ${student.parentEmail}. Please ensure all emails are valid.`
      };
    }
  }
  
  for (const student of students) {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('email', '==', student.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingStudent = querySnapshot.docs[0].data();
      if (existingStudent.name !== student.name) {
        return {
          valid: false,
          error: `Cannot upload roster: Student with email ${student.email} already exists with a different name (${existingStudent.name} vs ${student.name}).`
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Creates a new user in the users collection if they don't exist,
 * or updates their properties if they do exist.
 */
async function createOrUpdateUser(
  email: string, 
  name: string | null, 
  isStudent: boolean, 
  isParent: boolean
): Promise<void> {
  try {
    const existingUser = await getUserByEmail(email);
    
    if (existingUser) {
      const userRef = doc(db, 'users', existingUser.uid);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};
      
      if (isStudent) updates.isStudent = true;
      if (isParent) updates.isParent = true;
      
      await setDoc(userRef, updates, { merge: true });
    } else {
      const uid = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      const userData = {
        uid,
        email,
        name,
        isCoach: false,
        isStudent,
        isParent,
        createdAt: new Date().toISOString()
      };
      
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, userData);
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

/**
 * Processes a roster of students, validating and adding each student to the database.
 * Returns the IDs of the students that were added or updated.
 */
export async function processRoster(students: Student[], user_uid: string, teamID: string): Promise<{ success: boolean; studentIds?: string[]; error?: string }> {
  const validation = await validateRoster(students);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const studentIds: string[] = [];
    for (const student of students) {
      const studentId = await addOrUpdateStudent(student, user_uid, teamID);
      studentIds.push(studentId);
      
      await createOrUpdateUser(student.email, student.name, true, false);
      
      if (student.parentEmail && student.parentEmail.trim() !== '') {
        await createOrUpdateUser(student.parentEmail, null, false, true);
      }
    }
    
    return { success: true, studentIds };
  } catch (error) {
    console.error('Error processing roster:', error);
    return { 
      success: false, 
      error: 'An error occurred while processing the roster. Please try again.' 
    };
  }
}
