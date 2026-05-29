import { ElevenLabsClient } from 'elevenlabs';

export const runtime = 'nodejs';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

// Charlotte — expressive multilingual voice with strong Bulgarian support
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa';

export async function POST(req: Request) {
  const body = await req.json() as { text?: string };
  const text = body.text;

  if (!text || typeof text !== 'string' || text.length === 0 || text.length > 2000) {
    return new Response('Invalid text', { status: 400 });
  }

  try {
    const audioStream = await client.textToSpeech.convert(VOICE_ID, {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
      output_format: 'mp3_44100_128',
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response('TTS failed', { status: 500 });
  }
}
