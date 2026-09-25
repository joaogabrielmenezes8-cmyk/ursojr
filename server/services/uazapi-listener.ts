import https from 'https';
import http from 'http';
import { db } from '../db.js';
import { messagingProvider } from '../providers/messaging.js';
import { assessorAgent } from '../agent.js';
import { downloadAndTranscribeAudio } from './audio-transcription.js';

export class UazapiSseListener {
  private isRunning = false;
  private isConnected = false;
  private eventCount = 0;
  private lastEventAt: string | null = null;
  private lastError: string | null = null;
  private currentRequest: http.ClientRequest | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private buffer = '';
  private reconnectAttempts = 0;
  private isReconnecting = false;

  private httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 15000,
    maxSockets: 5,
    timeout: 60000,
  });

  private httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 15000,
    maxSockets: 5,
    timeout: 60000,
  });

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Uazapi SSE] Starting real-time WhatsApp listener...');
    this.connect();
  }

  stop() {
    this.isRunning = false;
    this.isConnected = false;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupConnection();
    console.log('[Uazapi SSE] Stopped listener.');
  }

  restart() {
    this.stop();
    this.start();
  }

  getStatus() {
    const creds = this.getCredentials();
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected,
      eventCount: this.eventCount,
      lastEventAt: this.lastEventAt,
      lastError: this.lastError,
      endpoint: `${creds.baseUrl}/sse`,
      hasToken: Boolean(creds.token),
    };
  }

  private getCredentials() {
    const profile = db.getProfile();
    const baseUrl = profile.whatsapp_base_url || process.env.UAZAPI_BASE_URL || 'https://bearcontrol.uazapi.com';
    const token = profile.whatsapp_token || process.env.UAZAPI_TOKEN || '';
    return { baseUrl, token };
  }

  private cleanupConnection() {
    if (this.currentRequest) {
      try {
        this.currentRequest.removeAllListeners();
        this.currentRequest.destroy();
      } catch {}
      this.currentRequest = null;
    }
  }

  private connect() {
    if (!this.isRunning) return;

    // Ensure any stale socket or connection is terminated before creating a new one
    this.cleanupConnection();
    this.isReconnecting = false;

    const { baseUrl, token } = this.getCredentials();
    if (!baseUrl || !token) {
      console.warn('[Uazapi SSE] Credentials not found, retrying in 10s...');
      this.scheduleReconnect(10000);
      return;
    }

    try {
      const sseUrl = `${baseUrl.replace(/\/+$/, '')}/sse`;
      const urlObj = new URL(sseUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      const agent = isHttps ? this.httpsAgent : this.httpAgent;

      console.log(`[Uazapi SSE] Connecting to ${sseUrl}...`);

      let connectionHandled = false;

      const req = client.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          agent,
          headers: {
            token: token,
            apikey: token,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            this.isConnected = false;
            this.lastError = `HTTP ${res.statusCode}`;
            console.warn(`[Uazapi SSE] Connection failed with status ${res.statusCode}. Reconnecting in 5s...`);
            this.handleDisconnection(`HTTP ${res.statusCode}`, false, 5000);
            return;
          }

          this.isConnected = true;
          this.lastError = null;
          this.reconnectAttempts = 0; // Reset backoff on successful connection
          console.log('[Uazapi SSE] Connected successfully! Listening for WhatsApp events in real-time.');
          this.buffer = '';

          res.on('data', (chunk: Buffer) => {
            this.eventCount++;
            this.lastEventAt = new Date().toISOString();
            this.buffer += chunk.toString('utf-8');
            this.processBuffer();
          });

          res.on('end', () => {
            if (!connectionHandled) {
              connectionHandled = true;
              this.handleDisconnection('Stream ended by remote peer', false);
            }
          });

          res.on('close', () => {
            if (!connectionHandled) {
              connectionHandled = true;
              this.handleDisconnection('Stream closed by remote peer', false);
            }
          });

          res.on('error', (err: any) => {
            if (!connectionHandled) {
              connectionHandled = true;
              const isCommonReset = err.message === 'aborted' || err.code === 'ECONNRESET';
              this.handleDisconnection(err.message, !isCommonReset);
            }
          });
        }
      );

      // Timeout detection to refresh connection before remote firewalls drop it silently
      req.setTimeout(65000, () => {
        if (!connectionHandled) {
          connectionHandled = true;
          this.handleDisconnection('Heartbeat timeout (65s), refreshing stream', false, 2000);
        }
      });

      req.on('error', (err: any) => {
        if (!connectionHandled) {
          connectionHandled = true;
          const isCommonReset =
            err.code === 'ECONNRESET' ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'EPIPE' ||
            err.message === 'aborted' ||
            err.message?.includes('ECONNRESET');

          this.handleDisconnection(err.message, !isCommonReset);
        }
      });

      this.currentRequest = req;
      req.end();
    } catch (err: any) {
      console.warn('[Uazapi SSE] Connection setup notice:', err.message);
      this.handleDisconnection(err.message, false);
    }
  }

  private handleDisconnection(reason: string, isUnexpected: boolean, customDelayMs?: number) {
    this.isConnected = false;
    this.lastError = reason;
    this.cleanupConnection();

    if (isUnexpected) {
      console.warn(`[Uazapi SSE] Connection closed: ${reason}`);
    } else {
      console.log(`[Uazapi SSE] Stream disconnected (${reason}). Will reconnect automatically.`);
    }

    if (customDelayMs !== undefined) {
      this.scheduleReconnect(customDelayMs);
      return;
    }

    // Exponential backoff with jitter: 3s, 6s, 12s, up to 30s
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, 5);
    const baseDelay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    const jitter = Math.floor(Math.random() * 1500);
    const delay = baseDelay + jitter;

    this.scheduleReconnect(delay);
  }

  private scheduleReconnect(delayMs: number) {
    if (!this.isRunning || this.isReconnecting) return;
    this.isReconnecting = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private processBuffer() {
    const lines = this.buffer.split(/\r?\n/);
    // Keep the last incomplete fragment in buffer
    this.buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('data:')) {
        const jsonStr = line.replace(/^data:\s*/, '').trim();
        if (!jsonStr) continue;

        try {
          const payload = JSON.parse(jsonStr);
          this.handlePayload(payload);
        } catch (err) {
          // Non-JSON or handshake line
        }
      }
    }
  }

  private async handlePayload(payload: any) {
    if (!payload || typeof payload !== 'object') return;

    // Ignore handshakes, updates or keep-alives
    if (payload.type === 'connection' || payload.type === 'ping' || payload.type === 'ReadReceipt' || payload.type === 'presence') {
      return;
    }

    const eventType = String(payload.EventType || payload.event || payload.type || '').toLowerCase();
    if (isIgnoredWhatsAppEventType(eventType)) {
      return;
    }

    // Ignore messages sent by us or by API
    if (
      payload.message?.wasSentByApi ||
      payload.wasSentByApi ||
      payload.data?.wasSentByApi ||
      payload.message?.fromMe ||
      payload.fromMe ||
      payload.data?.key?.fromMe
    ) {
      return;
    }

    const hasMessage = Boolean(payload.message || payload.data?.message || payload.data?.key || payload.key);

    // Accept message events or any payload containing a message object
    const isMessageEvent =
      hasMessage ||
      eventType.includes('message') ||
      eventType.includes('media') ||
      eventType.includes('audio') ||
      eventType.includes('upsert');

    if (!isMessageEvent && eventType) {
      return;
    }

    console.log(`[UAZAPI SSE Event] Event: "${eventType}", hasMessage: ${hasMessage}`);

    // Pass to core message processor
    await processIncomingWhatsAppMessage(payload, 'uazapi_sse');
  }
}

export function isIgnoredWhatsAppEventType(eventType?: string): boolean {
  if (!eventType) return false;
  const ev = String(eventType).toLowerCase().trim();
  return (
    ev.includes('update') || // messages.update, chats.update, presence.update, contacts.update
    ev.includes('presence') ||
    ev.includes('read') ||
    ev.includes('receipt') ||
    ev.includes('reaction') ||
    ev.includes('delete') ||
    ev.includes('ping') ||
    ev.includes('connection') ||
    ev.includes('status') ||
    ev.includes('ack') ||
    ev.includes('ticket') ||
    ev.includes('tag') ||
    ev.includes('typing')
  );
}

// In-flight locking and multi-layer deduplication across SSE and Webhooks
const inFlightMessageIds = new Set<string>();
const inFlightPhones = new Map<string, number>();
const recentProcessedMessageIds = new Map<string, number>();
const recentContentHashes = new Map<string, number>();

/**
 * Shared message processor for both SSE listener and Webhook HTTP endpoint
 */
export async function processIncomingWhatsAppMessage(payload: any, source: 'uazapi_sse' | 'uazapi_webhook') {
  try {
    const rawEventType = String(payload?.EventType || payload?.event || payload?.type || '').toLowerCase();
    if (isIgnoredWhatsAppEventType(rawEventType)) {
      return { status: 'ignored', reason: `Ignored event type: ${rawEventType}` };
    }

    const normalized = messagingProvider.normalizeIncomingMessage(payload);

    if (!normalized) {
      return { status: 'ignored', reason: 'Unrecognized payload structure' };
    }

    const { messageId, phone, text, fromMe } = normalized;

    // Ignore self messages or messages sent by API/bot
    const isSentByApi = Boolean(
      fromMe ||
      payload?.message?.wasSentByApi ||
      payload?.wasSentByApi ||
      payload?.data?.wasSentByApi ||
      payload?.message?.fromMe ||
      payload?.fromMe
    );

    if (isSentByApi) {
      return { status: 'ignored', reason: 'Self message from bot' };
    }

    const canonicalId = (messageId || '').includes(':') ? messageId.split(':').pop()! : messageId;
    const now = Date.now();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanText = (text || '').trim().toLowerCase();
    const contentKey = cleanText ? `${cleanPhone}:${cleanText}` : '';

    // 1. Check in-flight lock on message ID (prevents concurrent execution across SSE and Webhook simultaneously)
    if (inFlightMessageIds.has(canonicalId) || inFlightMessageIds.has(messageId)) {
      console.log(`[Deduplication:InFlight] Message ${canonicalId} is already being processed concurrently. Skipping duplicate.`);
      return { status: 'deduplicated', messageId: canonicalId, reason: 'in_flight' };
    }

    // 2. Check in-flight phone lock (prevents duplicate requests from the same user arriving at the same millisecond)
    if (cleanPhone) {
      const inFlightPhoneStart = inFlightPhones.get(cleanPhone);
      if (inFlightPhoneStart && now - inFlightPhoneStart < 20000) {
        // If content is also identical, skip duplicate
        if (contentKey && recentContentHashes.has(contentKey)) {
          console.log(`[Deduplication:PhoneInFlight] Phone ${cleanPhone} message "${cleanText}" already in-flight. Skipping duplicate.`);
          return { status: 'deduplicated', messageId: canonicalId, reason: 'phone_in_flight' };
        }
      }
    }

    // 3. Check recently processed message IDs (2 minute window)
    const lastIdTime = recentProcessedMessageIds.get(canonicalId) || recentProcessedMessageIds.get(messageId);
    if (lastIdTime && now - lastIdTime < 120000) {
      console.log(`[Deduplication:RecentId] Message ${canonicalId} already processed ${now - lastIdTime}ms ago. Skipping duplicate.`);
      return { status: 'deduplicated', messageId: canonicalId, reason: 'recently_processed' };
    }

    // 4. Content burst deduplication (for identical phone + text within 60 seconds)
    if (contentKey) {
      const lastContentTime = recentContentHashes.get(contentKey);
      if (lastContentTime && now - lastContentTime < 60000) {
        console.log(`[Deduplication:ContentBurst] Duplicate message from ${phone} within ${now - lastContentTime}ms: "${text}". Skipping duplicate.`);
        return { status: 'deduplicated', messageId: canonicalId, reason: 'content_burst' };
      }
    }

    // 5. Check persistent database deduplication
    if (db.isWebhookProcessed(canonicalId) || db.isWebhookProcessed(messageId)) {
      console.log(`[Deduplication:DB] Message ${canonicalId} already marked in DB. Skipping duplicate.`);
      return { status: 'deduplicated', messageId: canonicalId, reason: 'db_processed' };
    }

    // Claim and acquire locks immediately BEFORE any async operation
    inFlightMessageIds.add(canonicalId);
    inFlightMessageIds.add(messageId);
    if (cleanPhone) inFlightPhones.set(cleanPhone, now);
    recentProcessedMessageIds.set(canonicalId, now);
    recentProcessedMessageIds.set(messageId, now);
    if (contentKey) {
      recentContentHashes.set(contentKey, now);
    }

    // Mark as processed in DB early to prevent race conditions from lagging Webhooks
    db.recordWebhookEvent({
      provider: source,
      event_type: 'processing_inbound',
      message_id: canonicalId,
      payload: { userMessage: text, phone },
      processed: true,
      status: 'in_progress',
    });

    try {
      let effectiveText = text;
      let wasVoiceNote = false;

      // Handle voice note / audio message
      if (normalized.isAudio) {
        wasVoiceNote = true;
        console.log(`[WhatsApp Inbound Audio] Received voice note from ${phone} (ID: ${messageId}). Transcribing with Gemini...`);
        messagingProvider.sendTyping(phone).catch(() => {});

        const transcribed = await downloadAndTranscribeAudio(normalized.audioInfo || { messageId });
        if (transcribed && transcribed.trim()) {
          effectiveText = transcribed.trim();
          console.log(`[WhatsApp Inbound Audio] Successfully transcribed voice note: "${effectiveText}"`);
        } else {
          console.warn(`[WhatsApp Inbound Audio] Could not extract audio from message ${messageId}`);
          const fallbackMsg = '🎙️ Recebi sua mensagem de voz, mas não consegui decodificar o áudio. Você pode falar mais próximo ao microfone ou me enviar em texto?';
          await messagingProvider.sendTextMessage(phone, fallbackMsg);
          return { status: 'audio_transcription_failed', messageId };
        }
      }

      if (!effectiveText) {
        return { status: 'skipped', reason: 'No text content' };
      }

      console.log(`[WhatsApp Inbound via ${source}] From ${phone}: "${effectiveText}" (ID: ${messageId}, Voice: ${wasVoiceNote})`);

      // Dynamic Multi-User Resolution: Resolve which household/team member sent this message
      let profile = db.getProfileByPhone(phone);
      if (!profile) {
        const defaultProf = db.getProfile('user_default');
        const cleanSender = phone.replace(/\D/g, '');
        const defaultClean = defaultProf.phone.replace(/\D/g, '');
        if (defaultClean.endsWith(cleanSender.slice(-8)) || cleanSender.endsWith(defaultClean.slice(-8))) {
          profile = defaultProf;
        } else {
          // Auto-provision a new household/member profile so this person gets their own isolated assistant immediately
          const pushName = normalized.pushName || payload.data?.pushName || payload.pushName;
          profile = db.createProfile({
            phone: cleanSender,
            full_name: pushName ? pushName.trim() : `Membro (${phone.slice(-4)})`,
            timezone: 'America/Sao_Paulo',
            daily_summary_time: '07:30',
            daily_summary_enabled: true,
            whatsapp_instance_id: defaultProf.whatsapp_instance_id || 'b3r',
            whatsapp_token: defaultProf.whatsapp_token,
            whatsapp_base_url: defaultProf.whatsapp_base_url,
          });
          console.log(`[Multi-User WhatsApp] New household/team member detected from phone ${phone}. Created profile: "${profile.full_name}" (ID: ${profile.id})`);
        }
      }

      const conversation = db.getOrCreateConversation(profile.id, phone);

      // Save inbound message
      db.addMessage({
        conversation_id: conversation.id,
        direction: 'inbound',
        text: wasVoiceNote ? `🎙️ [Áudio]: "${effectiveText}"` : effectiveText,
        status: 'received',
        raw_payload: payload,
      });

      // Send typing presence
      messagingProvider.sendTyping(phone).catch(() => {});

      // Process with AI agent
      const agentResult = await assessorAgent.processMessage({
        userId: profile.id,
        phone,
        messageId,
        userMessage: effectiveText,
      });

      console.log(`[WhatsApp AI Response] Generated response: "${agentResult.response.slice(0, 80)}..."`);

      // If it was a voice note, format friendly transcription confirmation
      const finalReply = wasVoiceNote
        ? `🎙️ *Entendido do seu áudio:*\n_"${effectiveText}"_\n\n${agentResult.response}`
        : agentResult.response;

      // Send reply via WhatsApp
      const sendResult = await messagingProvider.sendTextMessage(phone, finalReply);
      console.log(`[WhatsApp Outbound] Sent to ${phone}: success=${sendResult.success}, messageId=${sendResult.messageId}`);

      // Save outbound message
      db.addMessage({
        conversation_id: conversation.id,
        direction: 'outbound',
        text: finalReply,
        status: sendResult.success ? 'sent' : 'failed',
        tool_called: agentResult.toolCalled,
        raw_payload: sendResult,
      });

      // Mark as read
      messagingProvider.markAsRead(messageId).catch(() => {});

      // Record webhook event for visibility
      db.recordWebhookEvent({
        provider: source,
        event_type: wasVoiceNote ? 'voice_message_processed' : 'message_processed',
        message_id: messageId,
        payload: {
          userMessage: effectiveText,
          isVoiceNote: wasVoiceNote,
          assistantResponse: finalReply,
          sendResult,
        },
        processed: true,
        status: sendResult.success ? 'success' : 'failed_send',
      });

      return {
        success: true,
        messageId,
        response: agentResult.response,
        toolCalled: agentResult.toolCalled,
      };
    } finally {
      inFlightMessageIds.delete(canonicalId);
      inFlightMessageIds.delete(messageId);
      if (cleanPhone) {
        inFlightPhones.delete(cleanPhone);
      }
      if (recentProcessedMessageIds.size > 200) {
        for (const [id, ts] of recentProcessedMessageIds) {
          if (now - ts > 120000) recentProcessedMessageIds.delete(id);
        }
      }
      if (recentContentHashes.size > 200) {
        for (const [k, ts] of recentContentHashes) {
          if (now - ts > 60000) recentContentHashes.delete(k);
        }
      }
    }
  } catch (err: any) {
    console.error(`[WhatsApp Inbound Error via ${source}]:`, err);
    db.recordWebhookEvent({
      provider: source,
      event_type: 'error',
      message_id: payload?.message?.id || payload?.id || `err_${Date.now()}`,
      payload,
      processed: false,
      status: 'error',
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

export const uazapiSseListener = new UazapiSseListener();
