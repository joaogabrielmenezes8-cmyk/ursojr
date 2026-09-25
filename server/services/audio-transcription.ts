import { GoogleGenAI } from '@google/genai';
import { db } from '../db.js';

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined');
    }
    genAIInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIInstance;
}

export interface AudioMediaInfo {
  url?: string;
  base64?: string;
  mimeType?: string;
  seconds?: number;
  messageId?: string;
  shortId?: string;
  instanceId?: string;
  rawMessage?: any;
}

/**
 * Transcreve um buffer de áudio (ogg/opus, mp3, mp4, wav, etc.) usando o Gemini Flash com fallback
 */
export async function transcribeAudioBuffer(buffer: Buffer, mimeType: string = 'audio/ogg'): Promise<string> {
  const ai = getGenAI();
  const base64Data = buffer.toString('base64');

  // Mime types suportados pelo Gemini: audio/ogg, audio/mp3, audio/wav, audio/m4a, audio/mp4, audio/aac, audio/webm
  let cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) {
    cleanMime = 'audio/mp3';
  } else if (cleanMime.includes('ogg') || cleanMime.includes('opus')) {
    cleanMime = 'audio/ogg';
  } else if (!cleanMime.startsWith('audio/')) {
    cleanMime = 'audio/ogg';
  }

  console.log(`[Gemini Audio Transcription] Sending ${buffer.length} bytes (${cleanMime}) to Gemini...`);

  // Model cascade: gemini-3.5-transcribe -> gemini-3.8-flash -> gemini-3.6-flash
  const modelsToTry = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-3.6-flash'];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Audio Transcription] Attempting model "${model}"...`);
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
            {
              text: 'Você é um assistente pessoal e transcritor de notas de voz do WhatsApp em português do Brasil. Transcreva o áudio com fidelidade total à fala do usuário, capturando comandos, tarefas, lembretes, nomes de pessoas, horários e datas. Retorne EXCLUSIVAMENTE o texto transcrito da fala, sem comentários, sem pontuação artificial e sem aspas.',
            },
          ],
        },
      });

      const text = (response.text || '').trim();
      if (text) {
        console.log(`[Gemini Audio Transcription] Success with ${model}: "${text}"`);
        return text;
      }
    } catch (err: any) {
      console.warn(`[Gemini Audio Transcription] Model ${model} failed (${err.status || err.code || err.message}).`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini transcription models failed');
}

/**
 * Baixa mídia de áudio da Uazapi ou URL externa e transcreve para texto
 */
export async function downloadAndTranscribeAudio(audioInfo: AudioMediaInfo): Promise<string | null> {
  try {
    const profile = db.getProfile();
    const baseUrl = (profile?.whatsapp_base_url || 'https://bearcontrol.uazapi.com').replace(/\/+$/, '');
    const token = profile?.whatsapp_token || process.env.UAZAPI_TOKEN || '';

    console.log(`[AudioTranscription] Processing audio: messageId=${audioInfo.messageId}, shortId=${audioInfo.shortId}, url=${audioInfo.url ? 'present' : 'none'}, base64=${audioInfo.base64 ? 'present' : 'none'}`);

    // 1. Se já recebemos o base64 diretamente
    if (audioInfo.base64 && typeof audioInfo.base64 === 'string') {
      const cleanBase64 = audioInfo.base64.replace(/^data:audio\/[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 0) {
        try {
          return await transcribeAudioBuffer(buffer, audioInfo.mimeType || 'audio/ogg');
        } catch (e: any) {
          console.warn('[AudioTranscription] Direct base64 transcription failed:', e.message);
        }
      }
    }

    // 2. Se temos uma URL pública (ex: fileURL na Uazapi ou S3 ou mmg.whatsapp.net)
    if (audioInfo.url && typeof audioInfo.url === 'string') {
      let fetchUrl = audioInfo.url;
      if (fetchUrl.startsWith('/')) {
        fetchUrl = `${baseUrl}${fetchUrl}`;
      }

      if (fetchUrl.startsWith('http')) {
        console.log(`[AudioTranscription] Downloading audio from direct URL: ${fetchUrl}`);
        try {
          const res = await fetch(fetchUrl, {
            headers: fetchUrl.includes('uazapi') ? { 'token': token, 'apikey': token } : undefined,
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            if (buffer.length > 0) {
              const fetchedMime = res.headers.get('content-type') || audioInfo.mimeType || (fetchUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg');
              return await transcribeAudioBuffer(buffer, fetchedMime);
            }
          } else {
            console.warn(`[AudioTranscription] Direct URL fetch failed with HTTP ${res.status}`);
          }
        } catch (fetchErr: any) {
          console.warn('[AudioTranscription] Direct URL fetch failed:', fetchErr.message);
        }
      }
    }

    // 3. IDs candidatos para consulta na Uazapi
    const idsToTry = [
      audioInfo.messageId,
      audioInfo.shortId,
      audioInfo.messageId && audioInfo.messageId.includes(':') ? audioInfo.messageId.split(':').pop() : null,
    ].filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim()));

    const uniqueIds = Array.from(new Set(idsToTry));

    // 4. Tentar baixar via endpoint oficial da Uazapi POST /message/download
    for (let attempt = 1; attempt <= 2; attempt++) {
      for (const targetId of uniqueIds) {
        console.log(`[AudioTranscription] Attempt ${attempt}: requesting /message/download for ID "${targetId}"`);
        try {
          const res = await fetch(`${baseUrl}/message/download`, {
            method: 'POST',
            headers: {
              'token': token,
              'apikey': token,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: targetId,
              return_base64: true,
              return_link: true,
              generate_mp3: true,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (res.ok) {
            const json: any = await res.json().catch(() => null);
            if (json) {
              // Se a Uazapi já transcreveu
              if (json.transcription && typeof json.transcription === 'string' && json.transcription.trim()) {
                console.log(`[AudioTranscription] Got instant transcription from Uazapi: "${json.transcription}"`);
                return json.transcription.trim();
              }

              // Se retornou base64Data ou base64
              const rawBase64 = json.base64Data || json.base64 || json.data?.base64 || json.media;
              if (rawBase64 && typeof rawBase64 === 'string') {
                const clean = rawBase64.replace(/^data:audio\/[^;]+;base64,/, '');
                const buffer = Buffer.from(clean, 'base64');
                if (buffer.length > 0) {
                  return await transcribeAudioBuffer(buffer, json.mimetype || 'audio/mp3');
                }
              }

              // Se retornou fileURL ou url
              const fileUrl = json.fileURL || json.url;
              if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('http')) {
                const fileRes = await fetch(fileUrl, { signal: AbortSignal.timeout(10000) });
                if (fileRes.ok) {
                  const arrayBuf = await fileRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuf);
                  if (buffer.length > 0) {
                    return await transcribeAudioBuffer(buffer, json.mimetype || fileRes.headers.get('content-type') || 'audio/mp3');
                  }
                }
              }
            }
          }
        } catch (reqErr: any) {
          console.warn(`[AudioTranscription] /message/download error for ${targetId}:`, reqErr.message);
        }
      }

      // 5. Tentar buscar a mensagem via POST /message/find para obter o fileURL gerado pela Uazapi
      for (const targetId of uniqueIds) {
        try {
          const findRes = await fetch(`${baseUrl}/message/find`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': token,
            },
            body: JSON.stringify({ id: targetId }),
            signal: AbortSignal.timeout(8000),
          });

          if (findRes.ok) {
            const findData: any = await findRes.json().catch(() => null);
            const foundMsg = findData?.messages?.[0] || findData;
            const foundUrl = foundMsg?.fileURL || foundMsg?.content?.URL || foundMsg?.url;
            if (foundUrl && typeof foundUrl === 'string' && foundUrl.startsWith('http')) {
              console.log(`[AudioTranscription] Located fileURL via /message/find: ${foundUrl}`);
              const dlRes = await fetch(foundUrl, { signal: AbortSignal.timeout(10000) });
              if (dlRes.ok) {
                const arrayBuf = await dlRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                if (buffer.length > 0) {
                  return await transcribeAudioBuffer(buffer, foundUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg');
                }
              }
            }
          }
        } catch (findErr: any) {
          console.warn(`[AudioTranscription] /message/find check error for ${targetId}:`, findErr.message);
        }
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    return null;
  } catch (err: any) {
    console.error('[AudioTranscription] Failed to process audio message:', err);
    return null;
  }
}
