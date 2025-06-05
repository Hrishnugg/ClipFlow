import { NextResponse } from 'next/server';
import { createTranscodingJob, waitForJobCompletion } from '../../../firebase/transcoder';

export async function POST(request: Request) {
  try {
    const { videoUrl, storagePath } = await request.json();

    if (!videoUrl || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required parameters: videoUrl or storagePath' },
        { status: 400 }
      );
    }

    const inputUri = `gs://clipflow-app.appspot.com/${storagePath}`;
    const outputUri = inputUri.replace(/\.[^/.]+$/, '.mp4');

    const jobResult = await createTranscodingJob(inputUri, outputUri);
    
    if (!jobResult.success) {
      return NextResponse.json(
        { success: false, error: jobResult.error },
        { status: 500 }
      );
    }

    const completionResult = await waitForJobCompletion(jobResult.jobName!);
    
    if (!completionResult.success) {
      return NextResponse.json(
        { success: false, error: completionResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Video transcoded successfully',
      outputUri: outputUri
    });
  } catch (error) {
    console.error('Error in transcode API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
