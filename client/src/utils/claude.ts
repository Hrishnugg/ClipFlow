import Anthropic from '@anthropic-ai/sdk';

interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
}

export async function identifyStudentFromTranscript(
  transcript: string,
  studentNames: string[]
): Promise<IdentificationResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  });

  const prompt = `
    I'm analyzing a transcript from a ski instruction video. The instructor mentions students by name.
    
    TRANSCRIPT:
    ${transcript}
    
    STUDENT ROSTER (ONLY consider these names, no one else):
    ${studentNames.join(', ')}
    
    Based on the transcript, which student from the roster is being filmed skiing?
    
    IMPORTANT INSTRUCTIONS:
    1. Use fuzzy matching to account for audio quality issues, accents, or mispronunciations
    2. Only identify students from the provided roster list
    3. Look for instances where the instructor refers to a student by name
    4. Consider context clues like "here comes [name]" or "[name] is doing great"
    5. If multiple students are mentioned, identify the one who appears to be the main subject
    
    Return your answer in JSON format with two fields:
    - identifiedStudent: The name of the student you think is in the video (must be from the roster)
    - confidence: Your confidence level from 0-100 (as a number)
    
    If you cannot identify any student from the roster with reasonable confidence, set identifiedStudent to empty string and confidence to 0.
  `;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let contentText = '';
    if (response.content[0] && typeof response.content[0] === 'object') {
      if ('text' in response.content[0]) {
        contentText = response.content[0].text as string;
      }
    }
    
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from Claude response');
      return { identifiedStudent: '', confidence: 0 };
    }
    
    try {
      const result = JSON.parse(jsonMatch[0]);
      return {
        identifiedStudent: result.identifiedStudent || '',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0
      };
    } catch (parseError) {
      console.error('Error parsing JSON from Claude response:', parseError);
      return { identifiedStudent: '', confidence: 0 };
    }
  } catch (error) {
    console.error('Error identifying student:', error);
    return { identifiedStudent: '', confidence: 0 };
  }
}
