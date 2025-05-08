import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: audioFile.type });

    const transcription = await client.speechToText.convert({
      file: audioBlob,
      model_id: "scribe_v1", 
      tag_audio_events: true,
      language_code: "eng",
      diarize: true,
    });
    
    return NextResponse.json({ 
      text: transcription.text,
      fullTranscription: transcription
    });
    
  } catch (error) {
    console.error('Speech-to-text processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}