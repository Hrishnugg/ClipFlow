import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, studentNames } = await request.json();
    
    if (!transcript || !studentNames || !Array.isArray(studentNames)) {
      return NextResponse.json(
        { error: 'Invalid request. Transcript and studentNames array are required.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
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
      3. Look for instances where the instructor refers to a student by name, nickname, or last name
      4. Consider that students might be called by nicknames (e.g., "Bob" for "Robert", "Liz" for "Elizabeth")
      5. Students might also be referred to by just their last name (e.g., "Smith" for "John Smith")
      6. Consider context clues like "here comes [name]" or "[name] is doing great"
      7. If multiple students are mentioned, identify the one who appears to be the main subject
      
      Return your answer in JSON format with two fields:
      - identifiedStudent: The name of the student you think is in the video (must be from the roster)
      - confidence: Your confidence level from 0-100 (as a number)
      
      If you cannot identify any student from the roster with reasonable confidence, set identifiedStudent to empty string and confidence to 0.
    `;

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
      return NextResponse.json(
        { identifiedStudent: '', confidence: 0 },
        { status: 200 }
      );
    }
    
    try {
      const result = JSON.parse(jsonMatch[0]);
      const identificationResult: IdentificationResult = {
        identifiedStudent: result.identifiedStudent || '',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0
      };
      
      return NextResponse.json(identificationResult, { status: 200 });
    } catch (parseError) {
      console.error('Error parsing JSON from Claude response:', parseError);
      return NextResponse.json(
        { identifiedStudent: '', confidence: 0 },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error identifying student:', error);
    return NextResponse.json(
      { error: 'Failed to process identification request' },
      { status: 500 }
    );
  }
}
