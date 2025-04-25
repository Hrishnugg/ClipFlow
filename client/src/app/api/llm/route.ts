import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { studentNames, transcript } = await request.json();

    if (!studentNames || !transcript) {
      return NextResponse.json(
        { error: 'Missing required parameters: studentNames or transcript' },
        { status: 400 }
      );
    }

    const prompt = `
You are analyzing a transcript from an educational video to identify which student is being described or shown in the video.

Here is the transcript:
"""
${transcript}
"""

Here is the list of student names from the roster:
${studentNames.map((name: string) => `- ${name}`).join('\n')}

Your task:
1. Identify which student from the roster is being described or shown in this video.
2. Look for direct mentions of the student's name (first or last name).
3. Consider that the transcription might not be perfect - names might be slightly misspelled or unclear due to accents or audio quality.
4. Assign a confidence level from 0 to 1 (where 1 is 100% confident) based on how certain you are about the identification.
5. If you cannot identify any student with reasonable confidence, return an empty string for the student name and 0 for confidence.

Return your answer in this exact JSON format:
{
  "identifiedStudent": "Full Student Name",
  "confidence": 0.X,
  "reasoning": "Brief explanation of why you identified this student"
}
`;

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const content = response.content[0].text;
    let result;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract JSON from response');
      }
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return NextResponse.json(
        { identifiedStudent: "", confidence: 0, error: "Failed to parse LLM response" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in LLM API route:', error);
    return NextResponse.json(
      { identifiedStudent: "", confidence: 0, error: "Internal server error" },
      { status: 500 }
    );
  }
}
