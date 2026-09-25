import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { messagingProvider } from './server/providers/messaging.js';
import { assessorAgent } from './server/agent.js';
import { startScheduler } from './server/scheduler.js';
import { googleCalendarService } from './server/google/calendar.js';
import { googleTasksService } from './server/google/tasks.js';
import { uazapiSseListener, processIncomingWhatsAppMessage, isIgnoredWhatsAppEventType } from './server/services/uazapi-listener.js';
import { transcribeAudioBuffer } from './server/services/audio-transcription.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- Background Scheduler Worker ---
  startScheduler();

  // --- Uazapi SSE Real-Time WhatsApp Listener ---
  uazapiSseListener.start();

  // --- API ROUTES FIRST ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Google Workspace API Routes ---
  app.get('/api/google/status', (req, res) => {
    const config = db.getGoogleConfig();
    const isExpired = Boolean(config.token_expired);
    res.json({
      connected: Boolean(config.connected && !isExpired),
      email: config.email,
      hasToken: Boolean(config.access_token && !isExpired),
      tokenExpired: isExpired,
      lastError: config.last_error,
      scopes: config.scopes,
      lastSyncAt: config.last_sync_at,
      services: {
        calendar: true,
        tasks: true,
      },
      defaultDurations: config.default_durations,
    });
  });

  app.post('/api/google/sync-token', async (req, res) => {
    try {
      const { token, email } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }
      const updated = db.saveGoogleToken(token, email);

      // Trigger asynchronous initial sync in background
      Promise.allSettled([
        googleCalendarService.syncEvents(token, db.data, 30),
        googleTasksService.syncTasks(token, db.data),
      ]).then(() => {
        db.persist();
        db.updateGoogleSyncTimestamp();
      }).catch((e) => {
        console.warn('[Google] Initial sync warning:', e);
      });

      res.json({
        success: true,
        connected: true,
        email: updated.email,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/google/disconnect', (req, res) => {
    db.disconnectGoogle();
    res.json({ success: true, connected: false });
  });

  app.post('/api/google/sync', async (req, res) => {
    try {
      const config = db.getGoogleConfig();
      if (!config.connected || !config.access_token || config.token_expired) {
        return res.status(400).json({ error: 'Sua autorização Google expirou ou não está conectada. Por favor, clique em Reconectar Google.' });
      }

      const [calResult, taskResult] = await Promise.all([
        googleCalendarService.syncEvents(config.access_token, db.data, 30),
        googleTasksService.syncTasks(config.access_token, db.data),
      ]);

      db.persist();
      db.updateGoogleSyncTimestamp();

      res.json({
        success: true,
        lastSyncAt: new Date().toISOString(),
        calendar: calResult,
        tasks: taskResult,
      });
    } catch (err: any) {
      console.error('[Google Sync Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/google/durations', (req, res) => {
    try {
      const updated = db.updateGoogleDurations(req.body);
      res.json({ success: true, defaultDurations: updated.default_durations });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 1. Webhook Uazapi (supports all common webhook paths & methods)
  const webhookPaths = [
    '/api/webhooks/uazapi',
    '/api/webhook/uazapi',
    '/api/webhooks',
    '/api/webhook',
  ];

  app.get(webhookPaths, (req, res) => {
    res.json({
      status: 'ok',
      service: 'KUMA WhatsApp Webhook',
      timestamp: new Date().toISOString(),
    });
  });

  app.post(webhookPaths, async (req, res) => {
    try {
      const payload = req.body;
      const rawEventType = String(payload?.EventType || payload?.event || payload?.type || '').toLowerCase();
      if (isIgnoredWhatsAppEventType(rawEventType)) {
        return res.status(200).json({ status: 'ignored', reason: `Non-message event: ${rawEventType}` });
      }

      console.log(`[Webhook:Received HTTP POST] Event: "${rawEventType}", Body:`, JSON.stringify(payload).slice(0, 200));
      const result = await processIncomingWhatsAppMessage(payload, 'uazapi_webhook');
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[Webhook] Error processing Uazapi event:', err);
      db.recordWebhookEvent({
        provider: 'uazapi_webhook',
        event_type: 'error',
        message_id: req.body?.id || `err_${Date.now()}`,
        payload: req.body,
        processed: false,
        status: 'error',
        error: err.message,
      });
      return res.status(200).json({ error: err.message });
    }
  });

  // 2. Interactive Simulator Chat (for web preview testing)
  app.post('/api/simulator/chat', async (req, res) => {
    try {
      const { text, phone = '5511998765432', userId } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text prompt is required' });
      }

      const profile = (userId ? db.getProfile(userId) : null) || (phone ? db.getProfileByPhone(phone) : null) || db.getProfile();
      const conversation = db.getOrCreateConversation(profile.id, phone, profile.full_name);

      // Record simulated user message
      const userMsg = db.addMessage({
        conversation_id: conversation.id,
        direction: 'inbound',
        text,
        status: 'received',
      });

      // Process with Agent
      const agentResult = await assessorAgent.processMessage({
        userId: profile.id,
        phone,
        messageId: userMsg.id,
        userMessage: text,
      });

      // Record assistant response
      const assistantMsg = db.addMessage({
        conversation_id: conversation.id,
        direction: 'outbound',
        text: agentResult.response,
        status: 'sent',
        tool_called: agentResult.toolCalled,
      });

      return res.json({
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        agentResult,
      });
    } catch (err: any) {
      console.error('[Simulator] Error in chat simulator:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2.1 Multi-User Household Profiles CRUD
  app.get('/api/profiles', (req, res) => {
    try {
      res.json(db.getProfiles());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profiles', (req, res) => {
    try {
      const { full_name, phone, timezone, daily_summary_time, daily_summary_enabled } = req.body;
      if (!full_name || !phone) {
        return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
      }
      const newProf = db.createProfile({
        full_name: full_name.trim(),
        phone: phone.replace(/\D/g, ''),
        timezone: timezone || 'America/Sao_Paulo',
        daily_summary_time: daily_summary_time || '07:30',
        daily_summary_enabled: daily_summary_enabled !== false,
      });
      res.status(201).json(newProf);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/profiles/:id', (req, res) => {
    try {
      const updated = db.updateProfile(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/profiles/:id', (req, res) => {
    try {
      if (req.params.id === 'user_default') {
        return res.status(400).json({ error: 'Não é possível excluir o perfil principal da conta.' });
      }
      const success = db.deleteProfile(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- New User Registration Endpoint ---
  app.post('/api/register', async (req, res) => {
    try {
      const { full_name, phone, email, token } = req.body;
      if (!full_name || !phone || !email || !token) {
        return res.status(400).json({ error: 'Nome, WhatsApp, e-mail e token do Google são obrigatórios' });
      }

      const cleanPhone = phone.replace(/\D/g, '');

      // Create or update the profile
      const existing = db.getProfileByPhone(cleanPhone);
      let profile;
      if (existing) {
        profile = db.updateProfile(existing.id, {
          full_name,
          google_access_token: token,
          google_email: email,
          google_connected: true,
          google_token_expired: false,
          google_last_sync_at: new Date().toISOString(),
        });
      } else {
        profile = db.createProfile({
          full_name,
          phone: cleanPhone,
          timezone: 'America/Sao_Paulo',
          daily_summary_time: '07:30',
          daily_summary_enabled: true,
          google_access_token: token,
          google_email: email,
          google_connected: true,
          google_token_expired: false,
          google_last_sync_at: new Date().toISOString(),
        });
      }

      // Sync user events and tasks in background
      Promise.allSettled([
        googleCalendarService.syncEvents(token, db.data, 30, profile.id),
        googleTasksService.syncTasks(token, db.data, profile.id),
      ]).then(() => {
        db.persist();
        console.log(`[Google Sync] Initial sync completed for registered user: ${full_name}`);
      }).catch((e) => {
        console.warn(`[Google Sync] Sync warning for user ${full_name}:`, e);
      });

      res.status(201).json({
        success: true,
        message: 'Usuário cadastrado com sucesso!',
        profile,
      });
    } catch (err: any) {
      console.error('[Register Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Dashboard Summary
  app.get('/api/dashboard', (req, res) => {
    try {
      const data = db.getDashboardData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Tasks CRUD
  app.get('/api/tasks', (req, res) => {
    res.json(db.getTasks());
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const config = db.getGoogleConfig();
      let googleTaskId: string | undefined;

      if (config.connected && config.access_token) {
        try {
          const gTask = await googleTasksService.createTask(config.access_token, {
            title: req.body.title,
            notes: req.body.description || undefined,
            due: req.body.due_at || undefined,
          });
          googleTaskId = gTask.id;
        } catch (gErr) {
          console.warn('[Google Tasks API] Error creating remote task:', gErr);
        }
      }

      const task = db.createTask({
        user_id: 'user_default',
        title: req.body.title,
        description: req.body.description || '',
        priority: req.body.priority || 'normal',
        status: req.body.status || 'pending',
        due_at: req.body.due_at || null,
        completed_at: null,
        google_task_id: googleTaskId || null,
        synced_at: googleTaskId ? new Date().toISOString() : null,
      });
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    const existing = db.getTask(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const config = db.getGoogleConfig();
    if (config.connected && config.access_token && existing.google_task_id) {
      try {
        if (req.body.status === 'completed' && existing.status !== 'completed') {
          await googleTasksService.completeTask(config.access_token, existing.google_task_id);
        } else {
          await googleTasksService.updateTask(config.access_token, existing.google_task_id, {
            title: req.body.title || existing.title,
            notes: req.body.description !== undefined ? req.body.description : existing.description,
            due: req.body.due_at !== undefined ? req.body.due_at : existing.due_at,
          });
        }
      } catch (gErr) {
        console.warn('[Google Tasks API] Error updating remote task:', gErr);
      }
    }

    const updated = db.updateTask(req.params.id, req.body);
    res.json(updated);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const existing = db.getTask(req.params.id);
    if (existing) {
      const config = db.getGoogleConfig();
      if (config.connected && config.access_token && existing.google_task_id) {
        try {
          await googleTasksService.deleteTask(config.access_token, existing.google_task_id);
        } catch (gErr) {
          console.warn('[Google Tasks API] Error deleting remote task:', gErr);
        }
      }
    }
    const success = db.deleteTask(req.params.id);
    res.json({ success });
  });

  // 5. Reminders CRUD
  app.get('/api/reminders', (req, res) => {
    res.json(db.getReminders());
  });

  app.post('/api/reminders', (req, res) => {
    try {
      const rem = db.createReminder({
        user_id: 'user_default',
        title: req.body.title,
        message: req.body.message || req.body.title,
        scheduled_at: req.body.scheduled_at,
        recurrence_rule: req.body.recurrence_rule || 'none',
        status: 'pending',
        delivery_status: 'pending',
        sent_at: null,
      });
      res.status(201).json(rem);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/reminders/:id', (req, res) => {
    const updated = db.updateReminder(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Reminder not found' });
    res.json(updated);
  });

  app.delete('/api/reminders/:id', (req, res) => {
    const success = db.deleteReminder(req.params.id);
    res.json({ success });
  });

  // 6. Events CRUD
  app.get('/api/events', (req, res) => {
    res.json(db.getEvents());
  });

  app.post('/api/events', async (req, res) => {
    try {
      const config = db.getGoogleConfig();
      let googleEventId: string | undefined;
      let htmlLink: string | undefined;

      if (config.connected && config.access_token) {
        try {
          const gEvent = await googleCalendarService.createEvent(config.access_token, {
            summary: req.body.title,
            description: req.body.description || undefined,
            location: req.body.location || undefined,
            start: { dateTime: req.body.start_time, timeZone: 'America/Sao_Paulo' },
            end: { dateTime: req.body.end_time || req.body.start_time, timeZone: 'America/Sao_Paulo' },
          });
          googleEventId = gEvent.id;
          htmlLink = gEvent.htmlLink;
        } catch (gErr) {
          console.warn('[Google Calendar API] Error creating remote event:', gErr);
        }
      }

      const evt = db.createEvent({
        user_id: 'user_default',
        title: req.body.title,
        description: req.body.description || '',
        location: req.body.location || '',
        start_time: req.body.start_time,
        end_time: req.body.end_time || req.body.start_time,
        status: 'confirmed',
        google_event_id: googleEventId || null,
        html_link: htmlLink || null,
        synced_at: googleEventId ? new Date().toISOString() : null,
      });
      res.status(201).json(evt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    const existing = db.getEvents().find((e) => e.id === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const config = db.getGoogleConfig();
    if (config.connected && config.access_token && existing.google_event_id) {
      try {
        await googleCalendarService.updateEvent(config.access_token, existing.google_event_id, {
          summary: req.body.title || existing.title,
          description: req.body.description !== undefined ? req.body.description : existing.description,
          location: req.body.location !== undefined ? req.body.location : existing.location,
          start: req.body.start_time ? { dateTime: req.body.start_time, timeZone: 'America/Sao_Paulo' } : undefined,
          end: req.body.end_time ? { dateTime: req.body.end_time, timeZone: 'America/Sao_Paulo' } : undefined,
        });
      } catch (gErr) {
        console.warn('[Google Calendar API] Error updating remote event:', gErr);
      }
    }

    const updated = db.updateEvent(req.params.id, req.body);
    res.json(updated);
  });

  app.delete('/api/events/:id', async (req, res) => {
    const existing = db.getEvents().find((e) => e.id === req.params.id);
    if (existing) {
      const config = db.getGoogleConfig();
      if (config.connected && config.access_token && existing.google_event_id) {
        try {
          await googleCalendarService.deleteEvent(config.access_token, existing.google_event_id);
        } catch (gErr) {
          console.warn('[Google Calendar API] Error deleting remote event:', gErr);
        }
      }
    }
    const success = db.deleteEvent(req.params.id);
    res.json({ success });
  });

  // 7. Notes CRUD
  app.get('/api/notes', (req, res) => {
    res.json(db.getNotes());
  });

  app.post('/api/notes', (req, res) => {
    try {
      const note = db.createNote({
        user_id: 'user_default',
        title: req.body.title,
        content: req.body.content,
        tags: req.body.tags || [],
        is_memory: Boolean(req.body.is_memory),
        is_favorite: Boolean(req.body.is_favorite),
      });
      res.status(201).json(note);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/notes/:id', (req, res) => {
    const updated = db.updateNote(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  });

  app.delete('/api/notes/:id', (req, res) => {
    const success = db.deleteNote(req.params.id);
    res.json({ success });
  });

  // 7.1 Expenses CRUD
  app.get('/api/expenses', (req, res) => {
    res.json(db.getExpenses());
  });

  app.post('/api/expenses', (req, res) => {
    try {
      const expense = db.createExpense({
        user_id: req.body.user_id || 'user_default',
        description: req.body.description || 'Despesa',
        amount: Number(req.body.amount) || 0,
        category: req.body.category || 'outros',
        date: req.body.date || new Date().toISOString(),
      });
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/expenses/:id', (req, res) => {
    const updated = db.updateExpense(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  });

  app.delete('/api/expenses/:id', (req, res) => {
    const success = db.deleteExpense(req.params.id);
    res.json({ success });
  });

  // 8. Contacts CRUD
  app.get('/api/contacts', (req, res) => {
    res.json(db.getContacts());
  });

  app.post('/api/contacts', (req, res) => {
    try {
      const contact = db.createContact({
        user_id: 'user_default',
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email || '',
        company: req.body.company || '',
        role: req.body.role || '',
        notes: req.body.notes || '',
      });
      res.status(201).json(contact);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/contacts/:id', (req, res) => {
    const updated = db.updateContact(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Contact not found' });
    res.json(updated);
  });

  app.delete('/api/contacts/:id', (req, res) => {
    const success = db.deleteContact(req.params.id);
    res.json({ success });
  });

  // 9. Memories CRUD
  app.get('/api/memories', (req, res) => {
    res.json(db.getMemories());
  });

  app.post('/api/memories', (req, res) => {
    try {
      const mem = db.saveMemory('user_default', req.body.key, req.body.value, req.body.category || 'fact');
      res.status(201).json(mem);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/memories/:id', (req, res) => {
    const success = db.deleteMemory(req.params.id);
    res.json({ success });
  });

  // 10. Conversations & Messages
  app.get('/api/conversations', (req, res) => {
    res.json(db.getConversations());
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    res.json(db.getMessages(req.params.id));
  });

  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const { text } = req.body;
      const conversationId = req.params.id;
      const conv = db.getConversations().find((c) => c.id === conversationId);

      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Send via WhatsApp
      const sendRes = await messagingProvider.sendTextMessage(conv.contact_phone, text);

      // Save outbound message
      const msg = db.addMessage({
        conversation_id: conversationId,
        direction: 'outbound',
        text,
        status: sendRes.success ? 'sent' : 'failed',
        raw_payload: sendRes,
      });

      res.status(201).json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Agent Actions Audit Log
  app.get('/api/agent-actions', (req, res) => {
    res.json(db.getAgentActions());
  });

  // 12. WhatsApp Status & Test Send
  app.get('/api/webhooks/events', (req, res) => {
    try {
      res.json(db.getWebhookEvents());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/webhooks/test-incoming', async (req, res) => {
    try {
      const { text = 'Olá KUMA! O que eu tenho para hoje?', phone = '5538991246669' } = req.body;
      const fakePayload = {
        event: 'messages',
        instance: 'b3r',
        data: {
          key: {
            remoteJid: `${phone}@s.whatsapp.net`,
            fromMe: false,
            id: `test_inbound_${Date.now()}`,
          },
          message: {
            conversation: text,
          },
          pushName: 'João Gabriel',
        },
      };

      const normalized = messagingProvider.normalizeIncomingMessage(fakePayload);
      if (!normalized) {
        return res.status(400).json({ error: 'Failed to normalize payload' });
      }

      const profile = db.getProfile();
      const conversation = db.getOrCreateConversation(profile.id, normalized.phone);

      db.addMessage({
        conversation_id: conversation.id,
        direction: 'inbound',
        text: normalized.text,
        status: 'received',
        raw_payload: fakePayload,
      });

      const agentResult = await assessorAgent.processMessage({
        userId: profile.id,
        phone: normalized.phone,
        messageId: normalized.messageId,
        userMessage: normalized.text,
      });

      // Send actual WhatsApp message only if explicitly requested
      let sendResult: any = { success: true, simulated: true, messageId: `test_${Date.now()}` };
      if (req.body.dispatchToWhatsApp === true) {
        sendResult = await messagingProvider.sendTextMessage(normalized.phone, agentResult.response);
      }

      db.addMessage({
        conversation_id: conversation.id,
        direction: 'outbound',
        text: agentResult.response,
        status: sendResult.success ? 'sent' : 'failed',
        tool_called: agentResult.toolCalled,
        raw_payload: sendResult,
      });

      db.recordWebhookEvent({
        provider: 'uazapi',
        event_type: 'manual_test_incoming',
        message_id: normalized.messageId,
        payload: { text, phone, sendResult },
        processed: true,
        status: sendResult.success ? 'success' : 'failed_send',
      });

      return res.json({
        success: true,
        response: agentResult.response,
        toolCalled: agentResult.toolCalled,
        toolArgs: agentResult.toolArgs,
        actionResult: agentResult.actionResult,
        sendResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Transcrever áudio recebido e processar pelo Assessor IA
  app.post('/api/audio/transcribe-and-process', async (req, res) => {
    try {
      const { base64Audio, mimeType, phone, dispatchToWhatsApp } = req.body;
      if (!base64Audio) {
        return res.status(400).json({ error: 'base64Audio é obrigatório' });
      }

      const cleanBase64 = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'Buffer de áudio vazio' });
      }

      console.log(`[Audio API] Processing audio upload: ${buffer.length} bytes, mime=${mimeType || 'audio/ogg'}`);

      // 1. Transcrever com Gemini 2.5 Flash
      const transcribedText = await transcribeAudioBuffer(buffer, mimeType || 'audio/webm');
      console.log(`[Audio API] Transcribed text: "${transcribedText}"`);

      if (!transcribedText || !transcribedText.trim()) {
        return res.json({
          success: false,
          error: 'Não foi possível detectar fala no áudio',
          transcribedText: '',
        });
      }

      const userPhone = phone || '5538991246669';
      const profile = (userPhone ? db.getProfileByPhone(userPhone) : null) || db.getProfile();
      const conversation = db.getOrCreateConversation(profile.id, userPhone);

      // 2. Registrar no banco como mensagem de áudio
      db.addMessage({
        conversation_id: conversation.id,
        direction: 'inbound',
        text: `🎙️ [Áudio]: "${transcribedText}"`,
        status: 'received',
      });

      // 3. Processar pelo Assessor IA
      const agentResult = await assessorAgent.processMessage({
        userId: profile.id,
        phone: userPhone,
        messageId: `voice_${Date.now()}`,
        userMessage: transcribedText,
      });

      const finalReply = `🎙️ *Entendido do seu áudio:*\n_"${transcribedText}"_\n\n${agentResult.response}`;

      let sendResult: any = null;
      if (dispatchToWhatsApp !== false) {
        sendResult = await messagingProvider.sendTextMessage(userPhone, finalReply);
      }

      db.addMessage({
        conversation_id: conversation.id,
        direction: 'outbound',
        text: finalReply,
        status: sendResult?.success ? 'sent' : 'received',
        tool_called: agentResult.toolCalled,
        raw_payload: sendResult,
      });

      res.json({
        success: true,
        transcribedText,
        response: agentResult.response,
        finalReply,
        toolCalled: agentResult.toolCalled,
        toolArgs: agentResult.toolArgs,
        actionResult: agentResult.actionResult,
        sendResult,
      });
    } catch (err: any) {
      console.error('[Audio API] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/whatsapp/remote-webhook', async (req, res) => {
    try {
      const data = await messagingProvider.getRemoteWebhook();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/sync-webhook', async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      const target = webhookUrl || `${req.protocol}://${req.get('host')}/api/webhooks/uazapi`;
      const result = await messagingProvider.syncRemoteWebhook(target);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/whatsapp/sse-status', (req, res) => {
    res.json(uazapiSseListener.getStatus());
  });

  app.post('/api/whatsapp/sse-restart', (req, res) => {
    uazapiSseListener.restart();
    res.json({ success: true, status: uazapiSseListener.getStatus() });
  });

  app.get('/api/whatsapp/status', async (req, res) => {
    try {
      const status = await messagingProvider.getInstanceStatus();
      const profile = db.getProfile();
      res.json({
        ...status,
        profileInstance: profile.whatsapp_instance_id,
        configured: Boolean(profile.whatsapp_token || process.env.UAZAPI_TOKEN),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/test-send', async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone number and message text are required' });
      }
      const result = await messagingProvider.sendTextMessage(phone, message);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/config', (req, res) => {
    try {
      const { baseUrl, token, instanceId, phone } = req.body;
      const updated = db.updateProfile('user_default', {
        whatsapp_base_url: baseUrl,
        whatsapp_token: token,
        whatsapp_instance_id: instanceId,
        ...(phone ? { phone } : {}),
      });
      res.json({ success: true, profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. System Diagnostics
  app.get('/api/diagnostics', (req, res) => {
    res.json(db.getDiagnostics());
  });

  // 14. Settings
  app.get('/api/settings', (req, res) => {
    const prof = db.getProfile();
    // Return sanitized profile (mask token partially if present)
    const maskedToken = prof.whatsapp_token
      ? `${prof.whatsapp_token.substring(0, 4)}...${prof.whatsapp_token.substring(prof.whatsapp_token.length - 4)}`
      : '';
    res.json({
      ...prof,
      maskedToken,
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/settings', (req, res) => {
    try {
      const { full_name, phone, timezone, daily_summary_time, daily_summary_enabled, whatsapp_instance_id, whatsapp_token, whatsapp_base_url } = req.body;
      const updates: any = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (phone !== undefined) updates.phone = phone;
      if (timezone !== undefined) updates.timezone = timezone;
      if (daily_summary_time !== undefined) updates.daily_summary_time = daily_summary_time;
      if (daily_summary_enabled !== undefined) updates.daily_summary_enabled = Boolean(daily_summary_enabled);
      if (whatsapp_instance_id !== undefined) updates.whatsapp_instance_id = whatsapp_instance_id;
      if (whatsapp_token !== undefined && whatsapp_token !== '') updates.whatsapp_token = whatsapp_token;
      if (whatsapp_base_url !== undefined) updates.whatsapp_base_url = whatsapp_base_url;

      const updated = db.updateProfile('user_default', updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Middleware for development & production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Assessor IA] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
