/**
 * Serviço de Integração Canônica com o Google Calendar v3 REST API
 */

import { db } from '../db.js';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
}

export class GoogleCalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  private async request(accessToken: string, endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsedErr: any;
      try {
        parsedErr = JSON.parse(errBody);
      } catch {
        parsedErr = { error: { message: errBody } };
      }
      const message = parsedErr?.error?.message || `Google Calendar API error ${res.status}`;
      if (res.status === 401 || message.toLowerCase().includes('authentication') || message.toLowerCase().includes('credential')) {
        try {
          db.markGoogleTokenExpired('Token Google Calendar expirado (401)');
        } catch (_) {}
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  /**
   * Lista os calendários acessíveis pelo usuário
   */
  async listCalendars(accessToken: string) {
    const data = await this.request(accessToken, '/users/me/calendarList');
    return data.items || [];
  }

  /**
   * Obtém metadados de um calendário específico
   */
  async getCalendar(accessToken: string, calendarId = 'primary') {
    return await this.request(accessToken, `/calendars/${encodeURIComponent(calendarId)}`);
  }

  /**
   * Lista eventos de um calendário com filtros de data e busca
   */
  async listEvents(
    accessToken: string,
    params: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      q?: string;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    } = {}
  ) {
    const calendarId = params.calendarId || 'primary';
    const query = new URLSearchParams();

    if (params.timeMin) query.set('timeMin', params.timeMin);
    if (params.timeMax) query.set('timeMax', params.timeMax);
    if (params.maxResults) query.set('maxResults', params.maxResults.toString());
    if (params.q) query.set('q', params.q);
    query.set('singleEvents', (params.singleEvents ?? true).toString());
    query.set('orderBy', params.orderBy || 'startTime');

    const data = await this.request(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`
    );
    return data.items || [];
  }

  /**
   * Busca um evento específico por ID
   */
  async getEvent(accessToken: string, eventId: string, calendarId = 'primary') {
    return await this.request(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
  }

  /**
   * Cria um novo evento no Google Calendar
   */
  async createEvent(accessToken: string, eventData: GoogleCalendarEvent, calendarId = 'primary') {
    return await this.request(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    );
  }

  /**
   * Atualiza um evento existente no Google Calendar
   */
  async updateEvent(
    accessToken: string,
    eventId: string,
    eventData: Partial<GoogleCalendarEvent>,
    calendarId = 'primary'
  ) {
    return await this.request(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(eventData),
      }
    );
  }

  /**
   * Remove / cancela um evento no Google Calendar
   */
  async deleteEvent(accessToken: string, eventId: string, calendarId = 'primary') {
    return await this.request(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Consulta disponibilidade / intervalos ocupados (FreeBusy)
   */
  async getFreeBusy(
    accessToken: string,
    params: {
      timeMin: string;
      timeMax: string;
      calendarId?: string;
    }
  ) {
    const calendarId = params.calendarId || 'primary';
    const body = {
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      items: [{ id: calendarId }],
    };

    const data = await this.request(accessToken, '/freeBusy', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const busySlots = data?.calendars?.[calendarId]?.busy || [];
    return busySlots as Array<{ start: string; end: string }>;
  }

  /**
   * Procura eventos por palavra-chave
   */
  async findEvents(accessToken: string, query: string, calendarId = 'primary') {
    return this.listEvents(accessToken, {
      calendarId,
      q: query,
      maxResults: 15,
    });
  }

  /**
   * Sincroniza eventos do Google Calendar para o banco de dados interno
   */
  async syncEvents(accessToken: string, db: any, daysAhead = 30, userId = 'user_default') {
    const now = new Date();
    const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias atrás
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const googleEvents = await this.listEvents(accessToken, {
      timeMin,
      timeMax,
      maxResults: 100,
    });

    let syncedCount = 0;
    for (const gEvent of googleEvents) {
      if (!gEvent.id || gEvent.status === 'cancelled') {
        // Se cancelado no Google, remove do banco local
        if (gEvent.id) {
          const existing = db.events.find((e: any) => e.google_event_id === gEvent.id);
          if (existing) {
            db.events = db.events.filter((e: any) => e.id !== existing.id);
          }
        }
        continue;
      }

      const startTime = gEvent.start?.dateTime || (gEvent.start?.date ? `${gEvent.start.date}T00:00:00Z` : new Date().toISOString());
      const endTime = gEvent.end?.dateTime || (gEvent.end?.date ? `${gEvent.end.date}T23:59:59Z` : startTime);

      const existingIndex = db.events.findIndex(
        (e: any) => e.google_event_id === gEvent.id || (e.title === gEvent.summary && e.start_time === startTime)
      );

      const eventPayload = {
        title: gEvent.summary || 'Compromisso',
        description: gEvent.description || '',
        location: gEvent.location || '',
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        google_event_id: gEvent.id,
        html_link: gEvent.htmlLink || '',
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        db.events[existingIndex] = {
          ...db.events[existingIndex],
          ...eventPayload,
          user_id: db.events[existingIndex].user_id || userId,
        };
      } else {
        db.events.push({
          id: `evt_g_${gEvent.id}`,
          user_id: userId,
          created_at: new Date().toISOString(),
          ...eventPayload,
        });
      }
      syncedCount++;
    }

    // Push unsynced local events to Google Calendar
    let pushedCount = 0;
    const eventsList = Array.isArray(db.events) ? db.events : db.data?.events || [];
    for (const localEvent of eventsList) {
      if (localEvent.user_id === userId && !localEvent.google_event_id && localEvent.status !== 'cancelled') {
        try {
          const gEvent = await this.createEvent(accessToken, {
            summary: localEvent.title,
            description: localEvent.description || 'Sincronizado via URSO JR.',
            location: localEvent.location || undefined,
            start: {
              dateTime: localEvent.start_time,
              timeZone: 'America/Sao_Paulo',
            },
            end: {
              dateTime: localEvent.end_time || localEvent.start_time,
              timeZone: 'America/Sao_Paulo',
            },
          });
          if (gEvent?.id) {
            localEvent.google_event_id = gEvent.id;
            localEvent.html_link = gEvent.htmlLink || '';
            localEvent.synced_at = new Date().toISOString();
            pushedCount++;
          }
        } catch (e: any) {
          console.warn(`[Google Calendar Sync] Could not push local event "${localEvent.title}":`, e.message);
        }
      }
    }

    return { totalFromGoogle: googleEvents.length, syncedCount, pushedCount };
  }
}

export const googleCalendarService = new GoogleCalendarService();
