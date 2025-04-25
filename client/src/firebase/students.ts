import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './config';

interface Student {
  id?: string;
  name: string;
  email: string;
  parentEmail: string;
}

/**
 * Adds a student to the students collection if they don't already exist,
 * or updates their parent email if they do exist.
 */
export async function addOrUpdateStudent(student: Student): Promise<string> {
  try {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('email', '==', student.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingStudentDoc = querySnapshot.docs[0];
      const existingStudent = existingStudentDoc.data();
      
      if (existingStudent.parentEmail !== student.parentEmail) {
        await setDoc(doc(db, 'students', existingStudentDoc.id), {
          ...existingStudent,
          parentEmail: student.parentEmail
        }, { merge: true });
      }
      
      return existingStudentDoc.id;
    } else {
      const newStudentRef = doc(collection(db, 'students'));
      await setDoc(newStudentRef, {
        name: student.name,
        email: student.email,
        parentEmail: student.parentEmail,
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
    
    if (!student.name || !student.email || !student.parentEmail) {
      return { 
        valid: false, 
        error: 'All students must have a name, email, and parent email.' 
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
 * Processes a roster of students, validating and adding each student to the database.
 * Returns the IDs of the students that were added or updated.
 */
export async function processRoster(students: Student[]): Promise<{ success: boolean; studentIds?: string[]; error?: string }> {
  const validation = await validateRoster(students);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const studentIds: string[] = [];
    for (const student of students) {
      const studentId = await addOrUpdateStudent(student);
      studentIds.push(studentId);
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
