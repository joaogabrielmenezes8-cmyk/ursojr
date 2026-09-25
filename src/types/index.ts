export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at?: string | null;
  completed_at?: string | null;
  google_task_id?: string | null;
  synced_at?: string | null;
  reminder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReminderStatus = 'pending' | 'sent' | 'cancelled';
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  message: string;
  scheduled_at: string;
  recurrence_rule?: RecurrenceRule;
  status: ReminderStatus;
  task_id?: string | null;
  google_task_id?: string | null;
  sent_at?: string | null;
  delivery_status?: 'pending' | 'delivered' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  google_event_id?: string | null;
  html_link?: string | null;
  synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleWorkspaceConfig {
  connected: boolean;
  email?: string;
  hasToken: boolean;
  tokenExpired?: boolean;
  lastError?: string;
  scopes: string[];
  lastSyncAt?: string | null;
  services: {
    calendar: boolean;
    tasks: boolean;
  };
  defaultDurations: {
    meeting: number;
    consultation: number;
    call: number;
    workout: number;
    generic: number;
  };
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_memory: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  role?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export type MemoryCategory = 'preference' | 'fact' | 'rule' | 'contact_detail' | 'work';

export interface Memory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  contact_phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  avatar_color?: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  status: 'received' | 'sent' | 'failed';
  timestamp: string;
  tool_called?: string | null;
  action_id?: string | null;
  raw_payload?: any;
}

export interface AgentAction {
  id: string;
  user_id: string;
  message_id?: string;
  user_message: string;
  detected_intent: string;
  tool_called: string;
  tool_arguments: any;
  result: any;
  assistant_response: string;
  model: string;
  success: boolean;
  timestamp: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string;
  message_id: string;
  payload: any;
  processed: boolean;
  status: string;
  error?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  timezone: string;
  daily_summary_time: string;
  daily_summary_enabled: boolean;
  whatsapp_instance_id?: string;
  whatsapp_token?: string;
  whatsapp_base_url?: string;
  google_access_token?: string;
  google_email?: string;
  google_connected?: boolean;
  google_token_expired?: boolean;
  google_last_sync_at?: string;
  created_at: string;
}

export interface SystemDiagnostics {
  database: { status: 'ok' | 'error'; latencyMs: number; message: string; recordCount: number };
  gemini: { status: 'ok' | 'error' | 'unconfigured'; model: string; message: string };
  uazapi: { status: 'connected' | 'disconnected' | 'unconfigured'; instanceId?: string; message: string };
  webhook: { status: 'active'; endpoint: string; lastReceivedAt?: string; totalEvents: number };
  scheduler: { status: 'running'; intervalSeconds: number; lastRunAt?: string; pendingRemindersCount: number };
}

export interface DashboardSummary {
  todayEvents: CalendarEvent[];
  upcomingTasks: Task[];
  upcomingReminders: Reminder[];
  overdueTasks: Task[];
  stats: {
    pendingTasksCount: number;
    todayEventsCount: number;
    pendingRemindersCount: number;
    overdueTasksCount: number;
    totalNotesCount: number;
    totalContactsCount: number;
    aiMessages24h: number;
  };
  whatsapp: {
    connected: boolean;
    instanceId?: string;
    number?: string;
    lastEventAt?: string;
    lastMessageText?: string;
  };
}

export type UserProfile = Profile;
export type DiagnosticsData = any;

