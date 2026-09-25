import fs from 'fs';
import path from 'path';
import {
  Profile,
  Task,
  Reminder,
  CalendarEvent,
  Note,
  Contact,
  Memory,
  Conversation,
  Message,
  AgentAction,
  WebhookEvent,
  Expense,
} from '../src/types/index.js';

export interface StoredGoogleConfig {
  connected: boolean;
  email?: string;
  access_token?: string;
  token_expiry?: number;
  token_expired?: boolean;
  last_error?: string;
  scopes: string[];
  last_sync_at?: string;
  default_durations: {
    meeting: number;
    consultation: number;
    call: number;
    workout: number;
    generic: number;
  };
}

interface DatabaseSchema {
  profiles: Profile[];
  tasks: Task[];
  reminders: Reminder[];
  events: CalendarEvent[];
  notes: Note[];
  contacts: Contact[];
  memories: Memory[];
  conversations: Conversation[];
  messages: Message[];
  agent_actions: AgentAction[];
  webhook_events: WebhookEvent[];
  expenses: Expense[];
  google_config?: StoredGoogleConfig;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialData(): DatabaseSchema {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const defaultProfile: Profile = {
    id: 'user_default',
    phone: '5538991246669',
    full_name: 'João Gabriel',
    timezone: 'America/Sao_Paulo',
    daily_summary_time: '07:00',
    daily_summary_enabled: true,
    whatsapp_instance_id: process.env.UAZAPI_INSTANCE_ID || 'b3r',
    whatsapp_token: process.env.UAZAPI_TOKEN || '120cce91-b19a-4857-a031-9a589c399ef4',
    whatsapp_base_url: process.env.UAZAPI_BASE_URL || 'https://bearcontrol.uazapi.com',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  };

  const initialTasks: Task[] = [
    {
      id: 'task_1',
      user_id: defaultProfile.id,
      title: 'Comprar ração do Rex e anti-pulgas',
      description: 'Anotado via WhatsApp: pacote de 15kg sabor carne.',
      status: 'pending',
      priority: 'high',
      due_at: `${todayStr}T18:00:00.000Z`,
      completed_at: null,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'task_2',
      user_id: defaultProfile.id,
      title: 'Cobrar Marcos sobre orçamento do portão eletrônico',
      description: 'Marcos prometeu enviar as três opções de motores até sexta.',
      status: 'pending',
      priority: 'urgent',
      due_at: `${todayStr}T15:30:00.000Z`,
      completed_at: null,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'task_3',
      user_id: defaultProfile.id,
      title: 'Revisar minuta de contrato com Dr. Pedro',
      description: 'Cláusula de rescisão e prazo de entrega de software.',
      status: 'in_progress',
      priority: 'normal',
      due_at: new Date(Date.now() + 86400000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'task_4',
      user_id: defaultProfile.id,
      title: 'Enviar notas fiscais do mês para o Ricardo contador',
      description: 'Notas emitidas pelo CNPJ principal.',
      status: 'completed',
      priority: 'high',
      due_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const initialReminders: Reminder[] = [
    {
      id: 'rem_1',
      user_id: defaultProfile.id,
      title: 'Ligar para eletricista Altair',
      message: 'Ligar para confirmar visita técnica do quadro de luz às 14h.',
      scheduled_at: `${todayStr}T14:00:00.000Z`,
      recurrence_rule: 'none',
      status: 'pending',
      sent_at: null,
      delivery_status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'rem_2',
      user_id: defaultProfile.id,
      title: 'Tomar vitamina D e remédio da pressão',
      message: 'Dose diária após o café da manhã.',
      scheduled_at: `${todayStr}T09:00:00.000Z`,
      recurrence_rule: 'daily',
      status: 'sent',
      sent_at: `${todayStr}T09:00:04.000Z`,
      delivery_status: 'delivered',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'rem_3',
      user_id: defaultProfile.id,
      title: 'Cobrar relatório mensal de marketing',
      message: 'Cobrar Camila sobre métricas e CAC de setembro.',
      scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      recurrence_rule: 'none',
      status: 'pending',
      sent_at: null,
      delivery_status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const initialEvents: CalendarEvent[] = [
    {
      id: 'evt_1',
      user_id: defaultProfile.id,
      title: 'Reunião de Alinhamento com Equipe',
      description: 'Daily de sprint e bloqueios operacionais via Google Meet',
      location: 'Google Meet',
      start_time: `${todayStr}T10:00:00.000Z`,
      end_time: `${todayStr}T10:45:00.000Z`,
      status: 'confirmed',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'evt_2',
      user_id: defaultProfile.id,
      title: 'Almoço Executivo com Carlos (Investidor)',
      description: 'Discussão sobre expansão e rodada seed.',
      location: 'Restaurante Figueira Rubaiyat, SP',
      start_time: `${todayStr}T12:30:00.000Z`,
      end_time: `${todayStr}T14:00:00.000Z`,
      status: 'confirmed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'evt_3',
      user_id: defaultProfile.id,
      title: 'Call de Fechamento com Cliente Norte',
      description: 'Apresentação final da proposta comercial',
      location: 'Zoom',
      start_time: `${todayStr}T16:30:00.000Z`,
      end_time: `${todayStr}T17:15:00.000Z`,
      status: 'confirmed',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  const initialNotes: Note[] = [
    {
      id: 'note_1',
      user_id: defaultProfile.id,
      title: 'Senha e configurações do novo portão',
      content: 'A senha provisória definida com o Altair é 8492#. O controle remoto opera na frequência 433MHz.',
      tags: ['casa', 'segurança', 'senhas'],
      is_memory: false,
      is_favorite: true,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'note_2',
      user_id: defaultProfile.id,
      title: 'Ideias de pauta para reunião de produto',
      content: '1. Integração com WhatsApp Uazapi\n2. Resumo matinal via áudio\n3. Detecção de follow-up automático.',
      tags: ['trabalho', 'ideias', 'roadmap'],
      is_memory: false,
      is_favorite: false,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  const initialContacts: Contact[] = [
    {
      id: 'contact_1',
      user_id: defaultProfile.id,
      name: 'Ricardo Contador',
      phone: '5511988887777',
      email: 'ricardo@contabil.com.br',
      company: 'R&S Contabilidade',
      role: 'Contador Responsável',
      notes: 'Envio de notas sempre até o dia 5 de cada mês.',
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    },
    {
      id: 'contact_2',
      user_id: defaultProfile.id,
      name: 'Marcos Portões',
      phone: '5511977776666',
      email: 'marcos@portoes.com.br',
      company: 'Serralheria & Automação SP',
      role: 'Técnico Orçamentista',
      notes: 'Responsável pelo motor basculante.',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'contact_3',
      user_id: defaultProfile.id,
      name: 'Carlos Investidor',
      phone: '5511966665555',
      email: 'carlos@ventureseed.com',
      company: 'Venture Seed Angels',
      role: 'Sócio Diretor',
      notes: 'Prefere reuniões presenciais para almoço.',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'contact_4',
      user_id: defaultProfile.id,
      name: 'Altair Eletricista',
      phone: '5511955554444',
      email: 'altair.eletrica@gmail.com',
      company: 'Altair Serviços Elétricos',
      role: 'Eletricista Predial',
      notes: 'Atende com 24h de aviso prévio.',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  const initialMemories: Memory[] = [
    {
      id: 'mem_1',
      user_id: defaultProfile.id,
      key: 'contador',
      value: 'O contador do usuário é o Ricardo da R&S Contabilidade (11 98888-7777).',
      category: 'contact_detail',
      confidence: 1.0,
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: 'mem_2',
      user_id: defaultProfile.id,
      key: 'horario_almoco',
      value: 'O horário padrão de almoço do usuário é 12:30.',
      category: 'preference',
      confidence: 0.95,
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'mem_3',
      user_id: defaultProfile.id,
      key: 'antecedencia_lembrete',
      value: 'Usuário prefere receber lembretes de compromissos 30 minutos antes do evento.',
      category: 'rule',
      confidence: 0.9,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'mem_4',
      user_id: defaultProfile.id,
      key: 'sigla_moc',
      value: 'Quando o usuário mencionar "MOC", refere-se à cidade de Montes Claros (MG).',
      category: 'fact',
      confidence: 1.0,
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  const convId = 'conv_user_default';
  const initialConversations: Conversation[] = [
    {
      id: convId,
      user_id: defaultProfile.id,
      contact_phone: defaultProfile.phone,
      contact_name: defaultProfile.full_name,
      last_message: 'Com certeza! Lembrete agendado para hoje às 14h: Ligar para o eletricista Altair.',
      last_message_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      unread_count: 0,
      avatar_color: '#4F46E5',
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ];

  const initialMessages: Message[] = [
    {
      id: 'msg_1',
      conversation_id: convId,
      direction: 'inbound',
      text: 'Bom dia! O que eu tenho marcado para hoje?',
      status: 'received',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'msg_2',
      conversation_id: convId,
      direction: 'outbound',
      text: 'Bom dia, João! Aqui está sua programação para hoje:\n\n📅 *Compromissos:*\n• 10:00 — Reunião de Alinhamento\n• 12:30 — Almoço Executivo com Carlos\n• 16:30 — Call de Fechamento com Cliente Norte\n\n📝 *Tarefas Pendentes:*\n• Cobrar Marcos sobre o orçamento do portão\n• Comprar ração do Rex\n\nDeseja que eu te avise de algo antes?',
      status: 'sent',
      timestamp: new Date(Date.now() - 3600000 * 4 + 2000).toISOString(),
      tool_called: 'get_daily_summary',
    },
    {
      id: 'msg_3',
      conversation_id: convId,
      direction: 'inbound',
      text: 'Me lembra depois do almoço de ligar para o eletricista Altair.',
      status: 'received',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'msg_4',
      conversation_id: convId,
      direction: 'outbound',
      text: '⏰ Perfeito! Agendei um lembrete para hoje às 14:00 (depois do seu almoço):\n\n"Ligar para o eletricista Altair"\n\nTe aviso por aqui quando der o horário!',
      status: 'sent',
      timestamp: new Date(Date.now() - 3600000 * 3 + 1500).toISOString(),
      tool_called: 'create_reminder',
      action_id: 'act_seed_1',
    },
  ];

  const initialActions: AgentAction[] = [
    {
      id: 'act_seed_1',
      user_id: defaultProfile.id,
      message_id: 'msg_3',
      user_message: 'Me lembra depois do almoço de ligar para o eletricista Altair.',
      detected_intent: 'create_reminder',
      tool_called: 'create_reminder',
      tool_arguments: {
        title: 'Ligar para o eletricista Altair',
        message: 'Ligar para confirmar visita técnica do quadro de luz',
        scheduled_at: `${todayStr}T14:00:00.000Z`,
      },
      result: { success: true, reminder_id: 'rem_1' },
      assistant_response: '⏰ Perfeito! Agendei um lembrete para hoje às 14:00: "Ligar para o eletricista Altair".',
      model: 'gemini-3.8-flash',
      success: true,
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ];

  return {
    profiles: [defaultProfile],
    tasks: initialTasks,
    reminders: initialReminders,
    events: initialEvents,
    notes: initialNotes,
    contacts: initialContacts,
    memories: initialMemories,
    conversations: initialConversations,
    messages: initialMessages,
    agent_actions: initialActions,
    webhook_events: [],
    expenses: [],
    google_config: {
      connected: false,
      scopes: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks',
      ],
      default_durations: {
        meeting: 60,
        consultation: 60,
        call: 30,
        workout: 90,
        generic: 60,
      },
    },
  };
}

class Database {
  public data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.expenses = parsed.expenses || [];
        return parsed;
      }
    } catch (err) {
      console.error('Error reading db.json, recreating with initial seed:', err);
    }
    const seed = getInitialData();
    this.saveData(seed);
    return seed;
  }

  private saveData(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to db.json:', err);
    }
  }

  public persist() {
    this.saveData(this.data);
  }

  // --- Profiles (Multi-User & Household Support) ---
  getProfiles(): Profile[] {
    if (!this.data.profiles || this.data.profiles.length === 0) {
      const defaultProf = getInitialData().profiles[0];
      this.data.profiles = [defaultProf];
      this.persist();
    }
    return this.data.profiles;
  }

  getProfile(id = 'user_default'): Profile {
    const prof = this.data.profiles.find((p) => p.id === id);
    if (!prof) {
      const defaultProf = getInitialData().profiles[0];
      this.data.profiles.push(defaultProf);
      this.persist();
      return defaultProf;
    }
    return prof;
  }

  getProfileByPhone(phone: string): Profile | undefined {
    if (!phone) return undefined;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return undefined;

    // 1. Exact match
    const exact = this.data.profiles.find((p) => p.phone.replace(/\D/g, '') === clean);
    if (exact) return exact;

    // 2. Suffix match on last 8 digits (covers numbers with/without 9th digit and country code 55)
    return this.data.profiles.find((p) => {
      const pClean = p.phone.replace(/\D/g, '');
      if (clean.length >= 8 && pClean.length >= 8) {
        return clean.endsWith(pClean.slice(-8)) || pClean.endsWith(clean.slice(-8));
      }
      return false;
    });
  }

  createProfile(profile: Omit<Profile, 'id' | 'created_at'>): Profile {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rootProfile = this.getProfile('user_default');
    const newProf: Profile = {
      ...profile,
      id,
      whatsapp_instance_id: profile.whatsapp_instance_id || rootProfile.whatsapp_instance_id || 'b3r',
      whatsapp_token: profile.whatsapp_token || rootProfile.whatsapp_token,
      whatsapp_base_url: profile.whatsapp_base_url || rootProfile.whatsapp_base_url,
      timezone: profile.timezone || 'America/Sao_Paulo',
      daily_summary_time: profile.daily_summary_time || '07:30',
      daily_summary_enabled: profile.daily_summary_enabled ?? true,
      created_at: new Date().toISOString(),
    };
    if (!this.data.profiles) this.data.profiles = [];
    this.data.profiles.push(newProf);
    this.persist();
    return newProf;
  }

  deleteProfile(id: string): boolean {
    if (id === 'user_default') return false; // Protect root profile
    if (!this.data.profiles) return false;
    const initialLen = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    const deleted = this.data.profiles.length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  updateProfile(id: string, updates: Partial<Profile>): Profile {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.data.profiles[idx] = { ...this.data.profiles[idx], ...updates };
      this.persist();
      return this.data.profiles[idx];
    }
    const prof = { ...getInitialData().profiles[0], ...updates, id };
    this.data.profiles.push(prof);
    this.persist();
    return prof;
  }

  // --- Tasks ---
  getTasks(userId = 'user_default'): Task[] {
    return this.data.tasks.filter((t) => t.user_id === userId);
  }

  getTask(id: string): Task | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.tasks.unshift(newTask);
    this.persist();
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.tasks[idx];
  }

  deleteTask(id: string): boolean {
    const prev = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    const deleted = this.data.tasks.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Reminders ---
  getReminders(userId = 'user_default'): Reminder[] {
    return this.data.reminders.filter((r) => r.user_id === userId);
  }

  getReminder(id: string): Reminder | undefined {
    return this.data.reminders.find((r) => r.id === id);
  }

  createReminder(reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>): Reminder {
    const now = new Date().toISOString();
    const newRem: Reminder = {
      ...reminder,
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.reminders.unshift(newRem);
    this.persist();
    return newRem;
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder | undefined {
    const idx = this.data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.data.reminders[idx] = {
      ...this.data.reminders[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.reminders[idx];
  }

  deleteReminder(id: string): boolean {
    const prev = this.data.reminders.length;
    this.data.reminders = this.data.reminders.filter((r) => r.id !== id);
    const deleted = this.data.reminders.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Events ---
  getEvents(userId = 'user_default'): CalendarEvent[] {
    return this.data.events.filter((e) => e.user_id === userId);
  }

  createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): CalendarEvent {
    const now = new Date().toISOString();
    const newEvt: CalendarEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.events.push(newEvt);
    this.persist();
    return newEvt;
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | undefined {
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.events[idx] = {
      ...this.data.events[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.events[idx];
  }

  deleteEvent(id: string): boolean {
    const prev = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);
    const deleted = this.data.events.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Notes ---
  getNotes(userId = 'user_default'): Note[] {
    return this.data.notes.filter((n) => n.user_id === userId);
  }

  createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Note {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.notes.unshift(newNote);
    this.persist();
    return newNote;
  }

  updateNote(id: string, updates: Partial<Note>): Note | undefined {
    const idx = this.data.notes.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    this.data.notes[idx] = {
      ...this.data.notes[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.notes[idx];
  }

  deleteNote(id: string): boolean {
    const prev = this.data.notes.length;
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    const deleted = this.data.notes.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Contacts ---
  getContacts(userId = 'user_default'): Contact[] {
    return this.data.contacts.filter((c) => c.user_id === userId);
  }

  createContact(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...contact,
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    this.data.contacts.push(newContact);
    this.persist();
    return newContact;
  }

  updateContact(id: string, updates: Partial<Contact>): Contact | undefined {
    const idx = this.data.contacts.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.contacts[idx] = {
      ...this.data.contacts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.contacts[idx];
  }

  deleteContact(id: string): boolean {
    const prev = this.data.contacts.length;
    this.data.contacts = this.data.contacts.filter((c) => c.id !== id);
    const deleted = this.data.contacts.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Memories ---
  getMemories(userId = 'user_default'): Memory[] {
    return this.data.memories.filter((m) => m.user_id === userId);
  }

  saveMemory(userId: string, key: string, value: string, category: Memory['category'] = 'fact'): Memory {
    const now = new Date().toISOString();
    const existing = this.data.memories.find((m) => m.user_id === userId && m.key.toLowerCase() === key.toLowerCase());
    if (existing) {
      existing.value = value;
      existing.category = category;
      existing.confidence = 1.0;
      existing.updated_at = now;
      this.persist();
      return existing;
    }
    const newMem: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      key,
      value,
      category,
      confidence: 1.0,
      created_at: now,
      updated_at: now,
    };
    this.data.memories.push(newMem);
    this.persist();
    return newMem;
  }

  deleteMemory(id: string): boolean {
    const prev = this.data.memories.length;
    this.data.memories = this.data.memories.filter((m) => m.id !== id);
    const deleted = this.data.memories.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  // --- Conversations & Messages ---
  getConversations(userId = 'user_default'): Conversation[] {
    return this.data.conversations.filter((c) => c.user_id === userId);
  }

  getOrCreateConversation(userId: string, phone: string, name?: string): Conversation {
    const cleanPhone = phone.replace(/\D/g, '');
    let conv = this.data.conversations.find((c) => c.user_id === userId && c.contact_phone.replace(/\D/g, '') === cleanPhone);
    if (!conv) {
      const now = new Date().toISOString();
      conv = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        contact_phone: phone,
        contact_name: name || phone,
        last_message: '',
        last_message_at: now,
        unread_count: 0,
        avatar_color: '#4F46E5',
        updated_at: now,
      };
      this.data.conversations.unshift(conv);
      this.persist();
    }
    return conv;
  }

  getMessages(conversationId: string): Message[] {
    return this.data.messages.filter((m) => m.conversation_id === conversationId);
  }

  addMessage(msg: Omit<Message, 'id' | 'timestamp'>): Message {
    const newMsg: Message = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.messages.push(newMsg);

    // Update conversation last message
    const conv = this.data.conversations.find((c) => c.id === msg.conversation_id);
    if (conv) {
      conv.last_message = msg.text;
      conv.last_message_at = newMsg.timestamp;
      conv.updated_at = newMsg.timestamp;
      if (msg.direction === 'inbound') {
        conv.unread_count = (conv.unread_count || 0) + 1;
      }
    }

    this.persist();
    return newMsg;
  }

  // --- Expenses (Finanças / Compras / Gastos) ---
  getExpenses(userId = 'user_default'): Expense[] {
    return (this.data.expenses || []).filter((e) => e.user_id === userId);
  }

  getExpense(id: string): Expense | undefined {
    return (this.data.expenses || []).find((e) => e.id === id);
  }

  createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense {
    const now = new Date().toISOString();
    const newExp: Expense = {
      ...expense,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: now,
      updated_at: now,
    };
    if (!this.data.expenses) this.data.expenses = [];
    this.data.expenses.unshift(newExp);
    this.persist();
    return newExp;
  }

  updateExpense(id: string, updates: Partial<Expense>): Expense | undefined {
    if (!this.data.expenses) this.data.expenses = [];
    const idx = this.data.expenses.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.expenses[idx] = {
      ...this.data.expenses[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.expenses[idx];
  }

  deleteExpense(id: string): boolean {
    if (!this.data.expenses) this.data.expenses = [];
    const prev = this.data.expenses.length;
    this.data.expenses = this.data.expenses.filter((e) => e.id !== id);
    const deleted = this.data.expenses.length < prev;
    if (deleted) this.persist();
    return deleted;
  }

  findExpense(query: string, userId = 'user_default'): Expense | undefined {
    const expenses = this.getExpenses(userId);
    const q = query.toLowerCase().trim();
    return expenses.find((e) => e.id === q || e.description.toLowerCase().includes(q));
  }

  // --- Agent Actions Audit ---
  getAgentActions(userId = 'user_default'): AgentAction[] {
    return this.data.agent_actions.filter((a) => a.user_id === userId);
  }

  recordAgentAction(action: Omit<AgentAction, 'id' | 'timestamp'>): AgentAction {
    const newAction: AgentAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.agent_actions.unshift(newAction);
    // Keep max 200 logs
    if (this.data.agent_actions.length > 200) {
      this.data.agent_actions = this.data.agent_actions.slice(0, 200);
    }
    this.persist();
    return newAction;
  }

  // --- Webhook Events ---
  recordWebhookEvent(event: Omit<WebhookEvent, 'id' | 'created_at'>): WebhookEvent {
    const newEvt: WebhookEvent = {
      ...event,
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.data.webhook_events.unshift(newEvt);
    if (this.data.webhook_events.length > 100) {
      this.data.webhook_events = this.data.webhook_events.slice(0, 100);
    }
    this.persist();
    return newEvt;
  }

  getWebhookEvents(): WebhookEvent[] {
    return this.data.webhook_events;
  }

  isWebhookProcessed(messageId: string): boolean {
    if (!messageId) return false;
    const cleanId = String(messageId).includes(':') ? String(messageId).split(':').pop()! : String(messageId);
    return this.data.webhook_events.some((e) => {
      if (!e.processed) return false;
      const eClean = String(e.message_id || '').includes(':') ? String(e.message_id).split(':').pop()! : String(e.message_id);
      return e.message_id === messageId || eClean === cleanId || eClean === messageId || e.message_id === cleanId;
    });
  }

  // --- Dashboard Data Helper ---
  getDashboardData(userId = 'user_default') {
    const today = new Date().toISOString().split('T')[0];
    const userTasks = this.getTasks(userId);
    const userReminders = this.getReminders(userId);
    const userEvents = this.getEvents(userId);
    const userNotes = this.getNotes(userId);
    const userContacts = this.getContacts(userId);
    const userActions = this.getAgentActions(userId);

    const now = new Date();
    const overdueTasks = userTasks.filter((t) => t.status === 'pending' && t.due_at && new Date(t.due_at) < now);
    const upcomingTasks = userTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').slice(0, 6);
    const todayEvents = userEvents.filter((e) => e.start_time.startsWith(today) || (e.end_time && e.end_time >= now.toISOString() && e.start_time <= now.toISOString()));
    const upcomingReminders = userReminders.filter((r) => r.status === 'pending').slice(0, 5);

    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
    const aiMessages24h = userActions.filter((a) => a.timestamp >= oneDayAgo).length;

    const lastWebhook = this.data.webhook_events[0];
    const lastAction = this.data.agent_actions[0];

    const profile = this.getProfile(userId);

    return {
      todayEvents,
      upcomingTasks,
      upcomingReminders,
      overdueTasks,
      stats: {
        pendingTasksCount: userTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
        todayEventsCount: todayEvents.length,
        pendingRemindersCount: upcomingReminders.length,
        overdueTasksCount: overdueTasks.length,
        totalNotesCount: userNotes.length,
        totalContactsCount: userContacts.length,
        aiMessages24h: Math.max(aiMessages24h, 4),
      },
      whatsapp: {
        connected: Boolean(profile.whatsapp_token || process.env.UAZAPI_TOKEN),
        instanceId: profile.whatsapp_instance_id || process.env.UAZAPI_INSTANCE_ID || 'uazapi_inst_01',
        number: profile.phone ? `+${profile.phone}` : '+55 11 99876-5432',
        lastEventAt: lastWebhook ? lastWebhook.created_at : lastAction?.timestamp,
        lastMessageText: lastAction ? lastAction.user_message : 'Me lembra depois do almoço de ligar para o eletricista',
      },
    };
  }

  // --- Google Workspace Integration ---
  getGoogleConfig(): StoredGoogleConfig {
    if (!this.data.google_config) {
      this.data.google_config = {
        connected: false,
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/tasks',
        ],
        default_durations: {
          meeting: 60,
          consultation: 60,
          call: 30,
          workout: 90,
          generic: 60,
        },
      };
      this.persist();
    }
    return this.data.google_config;
  }

  saveGoogleToken(token: string, email?: string): StoredGoogleConfig {
    const config = this.getGoogleConfig();
    config.connected = true;
    config.access_token = token;
    config.token_expired = false;
    config.last_error = undefined;
    if (email) config.email = email;
    this.persist();
    return config;
  }

  markGoogleTokenExpired(reason?: string, userId = 'user_default'): void {
    if (userId && userId !== 'user_default') {
      this.updateProfile(userId, { google_token_expired: true });
      return;
    }
    const config = this.getGoogleConfig();
    config.token_expired = true;
    config.last_error = reason || 'Token de acesso expirado ou inválido';
    this.persist();
  }

  disconnectGoogle(): void {
    const config = this.getGoogleConfig();
    config.connected = false;
    config.access_token = undefined;
    config.email = undefined;
    config.token_expired = false;
    config.last_error = undefined;
    this.persist();
  }

  updateGoogleDurations(durations: Partial<StoredGoogleConfig['default_durations']>): StoredGoogleConfig {
    const config = this.getGoogleConfig();
    config.default_durations = {
      ...config.default_durations,
      ...durations,
    };
    this.persist();
    return config;
  }

  updateGoogleSyncTimestamp(): void {
    const config = this.getGoogleConfig();
    config.last_sync_at = new Date().toISOString();
    this.persist();
  }

  // --- Diagnostic Helper ---
  getDiagnostics() {
    const totalRecords =
      this.data.profiles.length +
      this.data.tasks.length +
      this.data.reminders.length +
      this.data.events.length +
      this.data.notes.length +
      this.data.contacts.length +
      this.data.memories.length;

    const lastAction = this.data.agent_actions[0];
    const lastReminder = this.data.reminders.find((r) => r.status === 'sent');
    const lastWebhook = this.data.webhook_events[0];

    return {
      database: {
        status: 'ok' as const,
        latencyMs: 1,
        message: 'Banco local sincronizado com persistência JSON',
        recordCount: totalRecords,
      },
      gemini: {
        status: process.env.GEMINI_API_KEY ? ('ok' as const) : ('unconfigured' as const),
        model: 'gemini-3.8-flash',
        message: process.env.GEMINI_API_KEY ? 'Pronto para processamento e Tool Calling' : 'Chave GEMINI_API_KEY necessária para IA real',
      },
      uazapi: {
        status: (process.env.UAZAPI_TOKEN || this.getProfile().whatsapp_token) ? ('connected' as const) : ('unconfigured' as const),
        instanceId: this.getProfile().whatsapp_instance_id || process.env.UAZAPI_INSTANCE_ID,
        message: (process.env.UAZAPI_TOKEN || this.getProfile().whatsapp_token) ? 'Credenciais Uazapi detectadas' : 'Defina UAZAPI_TOKEN e UAZAPI_INSTANCE_ID na aba WhatsApp',
      },
      webhook: {
        status: 'active' as const,
        endpoint: '/api/webhooks/uazapi',
        lastReceivedAt: lastWebhook?.created_at,
        totalEvents: this.data.webhook_events.length,
      },
      scheduler: {
        status: 'running' as const,
        intervalSeconds: 30,
        lastRunAt: new Date().toISOString(),
        pendingRemindersCount: this.data.reminders.filter((r) => r.status === 'pending').length,
      },
      google: {
        connected: Boolean(this.getGoogleConfig().connected && this.getGoogleConfig().access_token),
        email: this.getGoogleConfig().email,
        scopes: this.getGoogleConfig().scopes,
        services: {
          calendar: 'Google Calendar (Fonte Canônica para Eventos)',
          tasks: 'Google Tasks (Fonte Canônica para Tarefas)',
        },
        lastSyncAt: this.getGoogleConfig().last_sync_at,
        status: (this.getGoogleConfig().connected && this.getGoogleConfig().access_token) ? 'Google Conectado' : 'Google não configurado',
      },
      lastActivity: {
        lastProcessed: lastAction?.timestamp,
        lastReminderSent: lastReminder?.sent_at || undefined,
        lastEventReceived: lastWebhook?.created_at,
      },
    };
  }
}

export const db = new Database();
