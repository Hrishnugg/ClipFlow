import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface IdentificationResult {
  identifiedStudent: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, studentNames, studentNicknames } = await request.json();

    if (!transcript || !studentNames || !Array.isArray(studentNames)) {
      return NextResponse.json(
        { error: 'Invalid request. Transcript and studentNames array are required.' },
        { status: 400 }
      );
    }

    const studentRoster = studentNames.map((name, index) => {
      const nickname = studentNicknames && studentNicknames[index] && studentNicknames[index] !== ''
        ? studentNicknames[index]
        : null;

      return {
        name,
        nickname
      };
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY is not set. Using fallback identification method.');
      
      // Fallback: Try to find student names in transcript
      let bestMatch = '';
      let bestConfidence = 0;
      
      // Simple fallback logic - check if any student name appears in the transcript
      for (const student of studentRoster) {
        if (transcript.toLowerCase().includes(student.name.toLowerCase())) {
          bestMatch = student.name;
          bestConfidence = 90;
          break;
        } else if (student.nickname && transcript.toLowerCase().includes(student.nickname.toLowerCase())) {
          bestMatch = student.name;
          bestConfidence = 85;
          break;
        }
      }
      
      if (!bestMatch) {
        for (const student of studentRoster) {
          const nameParts = student.name.split(' ');
          if (nameParts.length > 1) {
            const lastName = nameParts[nameParts.length - 1];
            if (transcript.toLowerCase().includes(lastName.toLowerCase())) {
              bestMatch = student.name;
              bestConfidence = 75;
              break;
            }
          }
        }
      }
      
      console.log('Fallback identification result:', { identifiedStudent: bestMatch, confidence: bestConfidence });
      return NextResponse.json(
        { identifiedStudent: bestMatch, confidence: bestConfidence },
        { status: 200 }
      );
    }

    const nicknameToNameMapping = studentRoster
      .filter(student => student.nickname)
      .map(student => `"${student.nickname}" is the nickname for student with real name "${student.name}"`);
    
    const formattedRoster = studentRoster.map((student, index) => {
      if (student.nickname) {
        return `Student ${index + 1}: Name = "${student.name}", Nickname = "${student.nickname}"`;
      }
      return `Student ${index + 1}: Name = "${student.name}", Nickname = None`;
    });

    console.log('Calling Claude API for student identification with roster:', formattedRoster);
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `
      I'm analyzing a transcript from a ski instruction video. The instructor mentions students by name or nickname.

      TRANSCRIPT:
      ${transcript}

      STUDENT ROSTER (ONLY consider these students, no one else):
      ${formattedRoster.join('\n- ')}
      
      NICKNAME TO NAME MAPPING:
      ${nicknameToNameMapping.length > 0 ? nicknameToNameMapping.join('\n- ') : '- No nicknames in this roster'}

      Based on the transcript, which student from the roster is being filmed skiing?

      IMPORTANT INSTRUCTIONS:
      1. Each student has a real name and may have a nickname directly associated with them
      2. The roster above shows each student's real name and their associated nickname (if any)
      3. Search for BOTH real names AND nicknames in the transcript
      4. If you find a nickname in the transcript, map it back to the student's real name using the associations provided
      5. Always return the student's real name as the identifiedStudent, even if they were referenced by their nickname
      6. For example, if "Bobbie" is mentioned in the transcript, and there's a student with Name = "Bob Myers" and Nickname = "Bobbie", identify the student as "Bob Myers"
      7. Use fuzzy matching to account for audio quality issues, accents, or mispronunciations
      8. Only identify students from the provided roster list
      9. Students might also be referred to by just their last name (e.g., "Smith" for "John Smith")
      10. Consider context clues like "here comes [name]" or "[name] is doing great"
      11. If multiple students are mentioned, identify the one who appears to be the main subject

      Return your answer in JSON format with two fields:
      - identifiedStudent: The REAL NAME of the student you think is in the video (must be from the roster)
      - confidence: Your confidence level from 0-100 (as a number)

      IMPORTANT: Even if you identify a student by their nickname in the transcript, you must return their real name as the identifiedStudent.

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

        console.log('Claude API identification result:', identificationResult);
        return NextResponse.json(identificationResult, { status: 200 });
      } catch (parseError) {
        console.error('Error parsing JSON from Claude response:', parseError);
        return NextResponse.json(
          { identifiedStudent: '', confidence: 0 },
          { status: 200 }
        );
      }
    } catch (apiError) {
      console.error('Error calling Claude API:', apiError);
      
      let bestMatch = '';
      let bestConfidence = 0;
      
      // Simple fallback logic - check if any student name appears in the transcript
      for (const student of studentRoster) {
        if (transcript.toLowerCase().includes(student.name.toLowerCase())) {
          bestMatch = student.name;
          bestConfidence = 70;
          break;
        } else if (student.nickname && transcript.toLowerCase().includes(student.nickname.toLowerCase())) {
          bestMatch = student.name;
          bestConfidence = 65;
          break;
        }
      }
      
      console.log('API error fallback identification result:', { identifiedStudent: bestMatch, confidence: bestConfidence });
      return NextResponse.json(
        { identifiedStudent: bestMatch, confidence: bestConfidence },
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
