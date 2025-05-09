import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';

interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
  error?: string;
}

/**
 * Identifies which student from a roster is being described in a video transcript
 * using an LLM (Claude Sonnet 3.7)
 */
export async function identifyStudentViaLLM(
  studentNames: string[],
  transcript: string
): Promise<IdentificationResult> {
  try {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentNames,
        transcript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to identify student');
    }

    const result = await response.json();
    
    const identifiedStudent = (result.confidence >= 70) ? result.identifiedStudent : '';
    
    return {
      identifiedStudent: identifiedStudent || '',
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('Error identifying student via LLM:', error);
    return {
      identifiedStudent: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetches student names from a roster
 */
export async function getStudentNamesFromRoster(rosterId: string): Promise<string[]> {
  try {
    const rosterRef = doc(db, 'rosters', rosterId);
    const rosterSnap = await getDoc(rosterRef);
    
    if (!rosterSnap.exists()) {
      throw new Error('Roster not found');
    }
    
    const data = rosterSnap.data();
    const students = data.students || [];
    
    return students.map((student: { name: string }) => student.name);
  } catch (error) {
    console.error('Error fetching student names from roster:', error);
    return [];
  }
}

/**
 * Finds a student's email by name from a roster
 */
export async function getStudentEmailByName(rosterId: string, studentName: string): Promise<string> {
  try {
    const rosterRef = doc(db, 'rosters', rosterId);
    const rosterSnap = await getDoc(rosterRef);
    
    if (!rosterSnap.exists()) {
      throw new Error('Roster not found');
    }
    
    const data = rosterSnap.data();
    const students = data.students || [];
    
    const student = students.find((student: { name: string; email: string }) => 
      student.name === studentName
    );
    
    return student ? student.email : '';
  } catch (error) {
    console.error('Error finding student email by name:', error);
    return '';
  }
}

/**
 * Checks if there are multiple students with the same name in a roster
 */
export async function hasStudentDuplicates(rosterId: string, studentName: string): Promise<boolean> {
  try {
    const rosterRef = doc(db, 'rosters', rosterId);
    const rosterSnap = await getDoc(rosterRef);
    
    if (!rosterSnap.exists()) {
      return false;
    }
    
    const data = rosterSnap.data();
    const students = data.students || [];
    
    const matchingStudents = students.filter((student: { name: string }) => 
      student.name === studentName
    );
    
    return matchingStudents.length > 1;
  } catch (error) {
    console.error('Error checking for student duplicates:', error);
    return false;
  }
}
