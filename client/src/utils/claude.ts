interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
}

export async function identifyStudentFromTranscript(
  transcript: string,
  studentNames: string[]
): Promise<IdentificationResult> {
  try {
    const response = await fetch('/api/identify-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        studentNames,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      return { identifiedStudent: '', confidence: 0 };
    }

    const result = await response.json();
    return {
      identifiedStudent: result.identifiedStudent || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0
    };
  } catch (error) {
    console.error('Error identifying student:', error);
    return { identifiedStudent: '', confidence: 0 };
  }
}
