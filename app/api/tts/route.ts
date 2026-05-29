import { ElevenLabsClient } from 'elevenlabs';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json() as { text?: string };
  const text = body.text;

  if (!text || typeof text !== 'string' || text.length === 0 || text.length > 2000) {
    return new Response('Invalid text', { status: 400 });
  }

  // Instantiate inside the handler so env vars are read at request time, not build time
  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY!,
  });

  // Charlotte — expressive multilingual voice with strong Bulgarian support
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa';

  try {
    const audioStream = await client.textToSpeech.convert(VOICE_ID, {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.75,
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('TTS error:', message);
    return new Response(`TTS failed: ${message}`, { status: 500 });
  }
}
