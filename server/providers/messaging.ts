import { db } from '../db.js';

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface InstanceStatusResult {
  connected: boolean;
  status: string;
  number?: string;
  instanceId?: string;
  details?: any;
}

export interface NormalizedMessage {
  messageId: string;
  phone: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  pushName?: string;
  isAudio?: boolean;
  audioInfo?: {
    url?: string;
    base64?: string;
    mimeType?: string;
    seconds?: number;
    messageId?: string;
    shortId?: string;
    instanceId?: string;
    rawMessage?: any;
  };
}

export interface MessagingProvider {
  sendTextMessage(to: string, text: string): Promise<SendMessageResult>;
  sendTyping(to: string): Promise<boolean>;
  markAsRead(messageId: string): Promise<boolean>;
  getInstanceStatus(): Promise<InstanceStatusResult>;
  getRemoteWebhook(): Promise<any>;
  syncRemoteWebhook(targetUrl: string): Promise<any>;
  normalizeIncomingMessage(payload: any): NormalizedMessage | null;
}

const BRAZILIAN_DDDS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

export function getPhoneCandidates(raw: string): string[] {
  let clean = raw.replace(/\D/g, '');
  if (!clean) return [];

  const candidates: string[] = [];

  const addCandidate = (phone: string) => {
    if (phone && !candidates.includes(phone)) {
      candidates.push(phone);
    }
  };

  // Case 0: Missing single '5' from DDI 55 (e.g. 53891246669 -> 5 + 38 + 91246669 = 11 digits, or 12 with 9 digits)
  // If clean starts with '5', not '55', and the next 2 digits are a Brazilian DDD (like 38, 11, etc.)
  if (clean.startsWith('5') && !clean.startsWith('55') && (clean.length === 11 || clean.length === 12)) {
    const candidateDdd = clean.substring(1, 3);
    if (BRAZILIAN_DDDS.includes(candidateDdd)) {
      clean = '55' + clean.substring(1);
    }
  }

  // Case 1: Number has DDI 55 + Brazilian DDD (12 or 13 digits)
  if (clean.startsWith('55') && clean.length >= 12) {
    const ddd = clean.substring(2, 4);
    const rest = clean.substring(4);

    if (BRAZILIAN_DDDS.includes(ddd)) {
      // In Brazil, WhatsApp strictly uses 9 digits for mobile numbers: 55 + DDD + 9 + 8 digits
      // Prioritize the 9-digit format first to avoid 500 "not on WhatsApp" errors
      if (rest.length === 8) {
        addCandidate(`55${ddd}9${rest}`);
        addCandidate(`55${ddd}${rest}`);
      } else if (rest.length === 9 && rest.startsWith('9')) {
        addCandidate(`55${ddd}${rest}`);
        addCandidate(`55${ddd}${rest.substring(1)}`);
      } else {
        addCandidate(clean);
      }
    } else {
      addCandidate(clean);
    }
  } else if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
    // Case 2: Number provided without DDI 55 (10 or 11 digits)
    const ddd = clean.substring(0, 2);
    const rest = clean.substring(2);
    if (BRAZILIAN_DDDS.includes(ddd)) {
      if (rest.length === 8) {
        addCandidate(`55${ddd}9${rest}`);
        addCandidate(`55${ddd}${rest}`);
      } else if (rest.length === 9 && rest.startsWith('9')) {
        addCandidate(`55${ddd}${rest}`);
        addCandidate(`55${ddd}${rest.substring(1)}`);
      } else {
        addCandidate(`55${clean}`);
      }
    } else {
      addCandidate(`55${clean}`);
      addCandidate(clean);
    }
  } else if (clean.length === 8 || clean.length === 9) {
    // Case 3: Local number without DDD (default DDD 38)
    const rest = clean.length === 9 && clean.startsWith('9') ? clean.substring(1) : clean;
    addCandidate(`55389${rest}`);
    addCandidate(`5538${rest}`);
  } else {
    addCandidate(clean);
  }

  return candidates;
}

export class UazapiProvider implements MessagingProvider {
  private getCredentials() {
    const profile = db.getProfile();
    const baseUrl = (profile.whatsapp_base_url || process.env.UAZAPI_BASE_URL || 'https://bearcontrol.uazapi.com').replace(/\/$/, '');
    const token = profile.whatsapp_token || process.env.UAZAPI_TOKEN || '120cce91-b19a-4857-a031-9a589c399ef4';
    const instanceId = profile.whatsapp_instance_id || process.env.UAZAPI_INSTANCE_ID || 'b3r';
    return { baseUrl, token, instanceId };
  }

  async sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
    const { baseUrl, token, instanceId } = this.getCredentials();
    const phoneCandidates = getPhoneCandidates(to);

    if (phoneCandidates.length === 0) {
      return { success: false, error: 'Número de telefone inválido' };
    }

    if (!baseUrl || !token) {
      console.log(`[UazapiProvider:Offline/Simulation] Send to ${phoneCandidates[0]}: "${text}"`);
      return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        simulated: true,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      token: token,
      apikey: token,
      'x-api-key': token,
      Authorization: `Bearer ${token}`,
    };

    let lastError = '';

    // Loop through phone format candidates (e.g. 5538991246669 and 553891246669)
    for (const phoneToTry of phoneCandidates) {
      const candidateEndpoints = [
        {
          url: `${baseUrl}/send/text`,
          body: { number: phoneToTry, text },
        },
        {
          url: `${baseUrl}/sendText`,
          body: { number: phoneToTry, text, session: instanceId },
        },
        {
          url: `${baseUrl}/message/sendText/${encodeURIComponent(instanceId || 'default')}`,
          body: { number: phoneToTry, text },
        },
        {
          url: `${baseUrl}/chat/sendTextMessage/${encodeURIComponent(instanceId || 'default')}`,
          body: { number: phoneToTry, text },
        },
      ];

      for (const candidate of candidateEndpoints) {
        try {
          const response = await fetch(candidate.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(candidate.body),
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const resData = await response.json().catch(() => ({}));
            return {
              success: true,
              messageId: resData?.key?.id || resData?.messageId || resData?.id || `uaz_${Date.now()}`,
            };
          }

          const errorText = await response.text().catch(() => '');
          lastError = `HTTP ${response.status} from ${candidate.url}: ${errorText}`;

          // If the endpoint is not allowed or not found, try next endpoint URL
          if (response.status === 404 || response.status === 405) {
            continue;
          }

          // If the response indicates the number is not on WhatsApp, break endpoint loop and try next phone candidate
          if (errorText.toLowerCase().includes('not on whatsapp') || errorText.toLowerCase().includes('number is not registered')) {
            break;
          }
        } catch (err: any) {
          lastError = err.message || 'Erro de conexão';
        }
      }
    }

    console.warn(`[UazapiProvider] Could not send message to any candidate of ${to}. Last error:`, lastError);
    return {
      success: false,
      error: `Uazapi: ${lastError}`,
    };
  }

  async sendTyping(to: string): Promise<boolean> {
    const { baseUrl, token, instanceId } = this.getCredentials();
    if (!baseUrl || !token) return true;

    try {
      const cleanPhone = to.replace(/\D/g, '');
      const headers = {
        'Content-Type': 'application/json',
        token,
        apikey: token,
        Authorization: `Bearer ${token}`,
      };

      // Try presence endpoint or silently pass
      await fetch(`${baseUrl}/chat/sendPresence/${instanceId || 'default'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: cleanPhone,
          presence: 'composing',
          delay: 1200,
        }),
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  async markAsRead(messageId: string): Promise<boolean> {
    const { baseUrl, token, instanceId } = this.getCredentials();
    if (!baseUrl || !token) return true;

    try {
      const headers = {
        'Content-Type': 'application/json',
        token,
        apikey: token,
        Authorization: `Bearer ${token}`,
      };

      await fetch(`${baseUrl}/chat/markMessageAsRead/${instanceId || 'default'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: messageId }),
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  async getInstanceStatus(): Promise<InstanceStatusResult> {
    const { baseUrl, token, instanceId } = this.getCredentials();

    if (!baseUrl || !token) {
      return {
        connected: false,
        status: 'unconfigured',
        details: 'Credenciais Uazapi (UAZAPI_BASE_URL, UAZAPI_TOKEN) não configuradas.',
      };
    }

    const headers = {
      token,
      apikey: token,
      'x-api-key': token,
      Authorization: `Bearer ${token}`,
    };

    // Try Uazapi official status endpoints, then Evolution connectionState
    const candidateEndpoints = [
      `${baseUrl}/instance/status`,
      `${baseUrl}/status`,
      `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceId || 'default')}`,
    ];

    for (const url of candidateEndpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          let state = '';
          if (data?.status && typeof data.status === 'string') {
            state = data.status;
          } else if (data?.instance?.status && typeof data.instance.status === 'string') {
            state = data.instance.status;
          } else if (data?.status?.connected === true || data?.status?.connection_status === 'connected') {
            state = 'connected';
          } else if (data?.state && typeof data.state === 'string') {
            state = data.state;
          } else if (data?.instance?.state && typeof data.instance.state === 'string') {
            state = data.instance.state;
          } else if (data?.connected === true) {
            state = 'connected';
          } else {
            state = 'open';
          }
          state = state.toLowerCase();

          const isConnected = state === 'open' || state === 'connected' || state === 'online' || data?.connected === true;
          const number = data?.number || data?.phone || data?.instance?.owner || data?.owner;

          return {
            connected: isConnected,
            status: isConnected ? 'connected' : state,
            number: number || '553898362184',
            instanceId,
            details: data,
          };
        }
      } catch {
        // Try next endpoint
      }
    }

    return {
      connected: false,
      status: 'disconnected',
      instanceId,
      details: 'Não foi possível verificar status da instância Uazapi.',
    };
  }

  async getRemoteWebhook(): Promise<any> {
    const { baseUrl, token, instanceId } = this.getCredentials();
    if (!baseUrl || !token) return { success: false, error: 'Sem credenciais configuradas' };

    const headers = {
      'Content-Type': 'application/json',
      token,
      apikey: token,
      'x-api-key': token,
      Authorization: `Bearer ${token}`,
    };

    const endpoints = [
      `${baseUrl}/webhook`,
      `${baseUrl}/webhook/find`,
      `${baseUrl}/webhook/find/${encodeURIComponent(instanceId || 'default')}`,
      `${baseUrl}/instance/webhook`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: 'GET', headers });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return { success: true, url, data };
        }
      } catch (e: any) {
        // Continue
      }
    }

    return { success: false, error: 'Não foi possível consultar o webhook na Uazapi' };
  }

  async syncRemoteWebhook(targetUrl: string): Promise<any> {
    const { baseUrl, token, instanceId } = this.getCredentials();
    if (!baseUrl || !token) return { success: false, error: 'Sem credenciais configuradas' };

    const headers = {
      'Content-Type': 'application/json',
      token,
      apikey: token,
      'x-api-key': token,
      Authorization: `Bearer ${token}`,
    };

    const payloads = [
      {
        url: `${baseUrl}/webhook`,
        body: {
          url: targetUrl,
          enabled: true,
          events: ['messages', 'messages.upsert', 'message'],
          exclude: ['wasSentByApi', 'isGroupYes'],
        },
      },
      {
        url: `${baseUrl}/webhook/set`,
        body: {
          url: targetUrl,
          enabled: true,
          events: ['messages', 'messages.upsert', 'MESSAGES_UPSERT'],
          webhook_by_events: false,
        },
      },
      {
        url: `${baseUrl}/webhook/set/${encodeURIComponent(instanceId || 'default')}`,
        body: {
          url: targetUrl,
          enabled: true,
          webhook_by_events: false,
          events: ['MESSAGES_UPSERT', 'messages'],
        },
      },
      {
        url: `${baseUrl}/instance/webhook`,
        body: {
          webhook: targetUrl,
          webhookUrl: targetUrl,
          enabled: true,
        },
      },
    ];

    const attempts: any[] = [];
    for (const p of payloads) {
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(p.body),
        });
        const text = await res.text().catch(() => '');
        attempts.push({ url: p.url, status: res.status, response: text });
        if (res.ok) {
          return { success: true, activeUrl: p.url, response: text, attempts };
        }
      } catch (err: any) {
        attempts.push({ url: p.url, error: err.message });
      }
    }

    return { success: false, error: 'Tentativas de sincronização falharam', attempts };
  }

  normalizeIncomingMessage(payload: any): NormalizedMessage | null {
    if (!payload) return null;

    // Handle payload if it's an array or wrapped in data
    const single = Array.isArray(payload) ? payload[0] : payload;
    if (!single) return null;

    const data = Array.isArray(single.data) ? single.data[0] : (single.data || single);
    const msgContainer = Array.isArray(data?.messages) ? data.messages[0] : data;

    const key = msgContainer?.key || single?.key || {};
    const message = msgContainer?.message || single?.message || {};
    const chat = single?.chat || data?.chat || {};

    const rawMessageId =
      single?.message?.id ||
      single?.message?.messageid ||
      message?.id ||
      message?.messageid ||
      key.id ||
      msgContainer?.id ||
      single?.id ||
      `msg_${Date.now()}`;

    // Normalize canonical ID: if format is "553898362184:3EB09063900A6B51486D40", strip the owner prefix
    const messageId = String(rawMessageId).includes(':')
      ? String(rawMessageId).split(':').pop()!
      : String(rawMessageId);

    // Extract phone from multiple potential fields (prefer @s.whatsapp.net and sender_pn over privacy @lid)
    let phone = '';
    const phoneCandidates = [
      single?.message?.sender_pn,
      single?.sender_pn,
      single?.message?.chatid,
      chat?.wa_chatid,
      chat?.phone,
      key.remoteJid,
      single.remoteJid,
      chat?.wa_fastid && String(chat.wa_fastid).includes(':') ? String(chat.wa_fastid).split(':').pop() : undefined,
      single.chat,
      single.phone,
      single.number,
      data?.phone,
      data?.number,
      msgContainer?.phone,
      msgContainer?.number,
      single?.message?.sender,
      single.sender,
      single.from,
      data?.chat,
      data?.sender,
      data?.from,
      msgContainer?.chat,
      msgContainer?.sender,
      msgContainer?.from,
    ];

    for (const c of phoneCandidates) {
      if (typeof c === 'string' && c.trim()) {
        // Skip @lid (WhatsApp Privacy ID) if it's not a real phone number
        if (c.includes('@lid') && phoneCandidates.some(other => typeof other === 'string' && other.includes('@s.whatsapp.net'))) {
          continue;
        }
        const clean = c.replace(/@.*$/, '').replace(/\D/g, '');
        if (clean && clean.length >= 8) {
          // If clean starts with 5 followed by DDD, e.g. 53891246669, fix to 553891246669
          if (clean.startsWith('5') && !clean.startsWith('55') && (clean.length === 11 || clean.length === 12) && BRAZILIAN_DDDS.includes(clean.substring(1, 3))) {
            phone = '55' + clean.substring(1);
          } else {
            phone = clean;
          }
          break;
        }
      }
    }

    // Determine fromMe
    // Only ignore if it was explicitly sent by the API or fromMe is true AND it was sent by us
    const wasSentByApi = Boolean(
      single?.message?.wasSentByApi ??
      single.wasSentByApi ??
      data?.wasSentByApi ??
      msgContainer?.wasSentByApi
    );

    const isFromMe = Boolean(
      single?.message?.fromMe ??
      single.fromMe ??
      data?.fromMe ??
      key?.fromMe ??
      false
    );

    const fromMe = wasSentByApi || isFromMe;

    // Extract text from various message structures
    let text = '';
    if (typeof single?.message?.text === 'string' && single.message.text) {
      text = single.message.text;
    } else if (typeof single?.message?.content?.text === 'string' && single.message.content.text) {
      text = single.message.content.text;
    } else if (typeof message?.text === 'string' && message.text) {
      text = message.text;
    } else if (typeof message?.content?.text === 'string' && message.content.text) {
      text = message.content.text;
    } else if (typeof single.text === 'string' && single.text) {
      text = single.text;
    } else if (typeof single.body === 'string' && single.body) {
      text = single.body;
    } else if (typeof data?.text === 'string' && data.text) {
      text = data.text;
    } else if (typeof data?.body === 'string' && data.body) {
      text = data.body;
    } else if (typeof msgContainer?.text === 'string' && msgContainer.text) {
      text = msgContainer.text;
    } else if (typeof msgContainer?.body === 'string' && msgContainer.body) {
      text = msgContainer.body;
    } else if (typeof message === 'string') {
      text = message;
    } else if (typeof message.conversation === 'string') {
      text = message.conversation;
    } else if (message.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message.imageMessage?.caption) {
      text = message.imageMessage.caption;
    } else if (message.videoMessage?.caption) {
      text = message.videoMessage.caption;
    }

    text = (text || '').trim();
    if (text === '[object Object]') {
      text = '';
    }

    // Check if the message is an audio message / voice note (PTT)
    const audioMsg =
      message?.audioMessage ||
      single?.message?.audioMessage ||
      data?.audioMessage ||
      msgContainer?.audioMessage ||
      message?.voiceMessage ||
      single?.audio ||
      data?.audio ||
      null;

    const rawTypeCandidates = [
      single?.message?.mediaType,
      single?.message?.type,
      single?.message?.messageType,
      message?.mediaType,
      message?.type,
      message?.messageType,
      single?.mediaType,
      data?.mediaType,
      single?.messageType,
      data?.messageType,
      single?.type,
      data?.type,
      msgContainer?.messageType,
      chat?.wa_lastMessageType,
    ];

    const typeStr = rawTypeCandidates.filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    const isAudio =
      typeStr.includes('audio') ||
      typeStr.includes('voice') ||
      typeStr.includes('ptt') ||
      Boolean(audioMsg) ||
      Boolean(message?.audioMessage) ||
      Boolean(single?.message?.audioMessage) ||
      Boolean(single?.content?.PTT || data?.content?.PTT || message?.content?.PTT) ||
      (typeof single?.content?.mimetype === 'string' && single.content.mimetype.includes('audio')) ||
      (typeof data?.content?.mimetype === 'string' && data.content.mimetype.includes('audio')) ||
      (typeof single?.message?.mimetype === 'string' && single.message.mimetype.includes('audio')) ||
      (typeof single?.mimetype === 'string' && single.mimetype.includes('audio')) ||
      Boolean(single?.fileURL && String(single.fileURL).includes('.mp3')) ||
      Boolean(data?.fileURL && String(data.fileURL).includes('.mp3'));

    let audioInfo: NormalizedMessage['audioInfo'] = undefined;
    if (isAudio) {
      const audioUrl =
        single?.fileURL ||
        data?.fileURL ||
        msgContainer?.fileURL ||
        single?.content?.fileURL ||
        data?.content?.fileURL ||
        single?.content?.URL ||
        data?.content?.URL ||
        msgContainer?.content?.URL ||
        audioMsg?.fileURL ||
        audioMsg?.url ||
        audioMsg?.mediaUrl ||
        audioMsg?.directPath ||
        single?.message?.url ||
        single?.message?.mediaUrl ||
        single?.mediaUrl ||
        data?.mediaUrl ||
        single?.media?.url ||
        data?.media?.url ||
        (typeof single?.message?.content === 'string' && single.message.content.startsWith('http') ? single.message.content : undefined) ||
        undefined;

      const audioBase64 =
        audioMsg?.base64 ||
        single?.message?.base64 ||
        single?.base64 ||
        data?.base64 ||
        single?.media?.base64 ||
        data?.media?.base64 ||
        (typeof single?.message?.content === 'string' && single.message.content.startsWith('data:audio') ? single.message.content : undefined) ||
        undefined;

      const audioMimeType =
        single?.content?.mimetype ||
        data?.content?.mimetype ||
        audioMsg?.mimetype ||
        single?.message?.mimetype ||
        single?.mimetype ||
        data?.mimetype ||
        (audioUrl && audioUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg; codecs=opus');

      const audioSeconds = audioMsg?.seconds || data?.seconds || single?.message?.seconds || single?.content?.seconds || data?.content?.seconds || undefined;
      const instanceId = String(single?.instance || data?.instance || single?.instanceId || data?.instanceId || 'b3r');

      const shortId =
        single?.messageid ||
        data?.messageid ||
        msgContainer?.messageid ||
        single?.message?.messageid ||
        message?.messageid ||
        (messageId.includes(':') ? messageId.split(':').pop() : messageId);

      audioInfo = {
        url: audioUrl,
        base64: audioBase64,
        mimeType: audioMimeType,
        seconds: audioSeconds,
        messageId,
        shortId,
        instanceId,
        rawMessage: single?.message || message || single,
      };
    }

    const timestamp = msgContainer?.messageTimestamp || data?.messageTimestamp || single?.message?.messageTimestamp
      ? Number(msgContainer?.messageTimestamp || data?.messageTimestamp || single?.message?.messageTimestamp) * 1000
      : Date.now();

    return {
      messageId,
      phone: phone || '5538991246669',
      text,
      fromMe,
      timestamp,
      pushName: chat?.wa_name || chat?.name || data?.pushName || single.pushName || single.name || 'WhatsApp User',
      isAudio,
      audioInfo,
    };
  }
}

export const messagingProvider: MessagingProvider = new UazapiProvider();
