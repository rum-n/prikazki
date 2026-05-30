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

  console.log(`TTS request: voiceId=${VOICE_ID} textLen=${text.length}`);

  try {
    // Minimal request — no output_format, no voice_settings — uses account defaults
    const audioStream = await client.textToSpeech.convert(VOICE_ID, {
      text,
      model_id: 'eleven_multilingual_v2',
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
    // Log the full error object so we can see all fields Railway gives us
    console.error('TTS error full:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`TTS failed: ${message}`, { status: 500 });
  }
}
