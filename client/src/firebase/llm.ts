import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';

interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
  reasoning?: string;
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
    return {
      identifiedStudent: result.identifiedStudent || '',
      confidence: result.confidence || 0,
      reasoning: result.reasoning,
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
