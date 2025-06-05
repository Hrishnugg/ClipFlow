import { GoogleAuth } from 'google-auth-library';



interface TranscodingJobResponse {
  success: boolean;
  jobName?: string;
  error?: string;
}

interface JobStatusResponse {
  success: boolean;
  state?: string;
  error?: string;
  progress?: number;
}

export async function createTranscodingJob(
  inputUri: string,
  outputUri: string,
  location: string = 'us-central1'
): Promise<TranscodingJobResponse> {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const projectNumber = await auth.getProjectId();

    const jobConfig = {
      parent: `projects/${projectNumber}/locations/${location}`,
      job: {
        inputUri: inputUri,
        outputUri: outputUri.replace(/\.[^/.]+$/, '.mp4'),
        config: {
          elementaryStreams: [
            {
              key: 'video-stream0',
              videoStream: {
                h264: {
                  heightPixels: 720,
                  widthPixels: 1280,
                  bitrateBps: 2500000,
                  frameRate: 30,
                  profile: 'high'
                }
              }
            },
            {
              key: 'audio-stream0',
              audioStream: {
                codec: 'aac',
                bitrateBps: 128000
              }
            }
          ],
          muxStreams: [
            {
              key: 'sd-mp4',
              container: 'mp4',
              elementaryStreams: ['video-stream0', 'audio-stream0'],
              segmentSettings: {
                segmentDuration: '6s'
              }
            }
          ],
          output: {
            uri: outputUri.replace(/\.[^/.]+$/, '.mp4')
          },
          adBreaks: [],
          manifests: [
            {
              fileName: 'manifest.m3u8',
              type: 'HLS',
              muxStreams: ['sd-mp4']
            }
          ]
        }
      }
    };

    const response = await authClient.request({
      url: `https://transcoder.googleapis.com/v1/projects/${projectNumber}/locations/${location}/jobs`,
      method: 'POST',
      data: jobConfig,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      success: true,
      jobName: (response.data as { name: string }).name
    };
  } catch (error) {
    console.error('Error creating transcoding job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getJobStatus(
  jobName: string
): Promise<JobStatusResponse> {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();

    const response = await authClient.request({
      url: `https://transcoder.googleapis.com/v1/${jobName}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const job = response.data as { state: string; progress?: { analyzed: number } };
    
    return {
      success: true,
      state: job.state,
      progress: job.progress?.analyzed || 0
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function waitForJobCompletion(
  jobName: string,
  maxWaitTimeMs: number = 300000,
  pollIntervalMs: number = 5000,
  onProgress?: (progress: number) => void
): Promise<JobStatusResponse> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    const status = await getJobStatus(jobName);
    
    if (!status.success) {
      return { success: false, error: `Failed to get job status: ${status.error}` };
    }
    
    if (onProgress && status.progress !== undefined) {
      onProgress(status.progress);
    }
    
    if (status.state === 'SUCCEEDED') {
      if (onProgress) onProgress(100);
      return { success: true, state: 'SUCCEEDED' };
    }
    
    if (status.state === 'FAILED') {
      return { success: false, error: 'Transcoding job failed - video format may not be supported or file may be corrupted' };
    }
    
    if (status.state === 'CANCELLED') {
      return { success: false, error: 'Transcoding job was cancelled' };
    }
    
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return { success: false, error: `Transcoding job timed out after ${maxWaitTimeMs / 1000} seconds` };
}
