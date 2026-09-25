import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { SimulatorModal } from './components/SimulatorModal';
import { DashboardView } from './components/views/DashboardView';
import { AgendaView } from './components/views/AgendaView';
import { TasksView } from './components/views/TasksView';
import { RemindersView } from './components/views/RemindersView';
import { NotesView } from './components/views/NotesView';
import { ContactsView } from './components/views/ContactsView';
import { ConversationsView } from './components/views/ConversationsView';
import { MemoryView } from './components/views/MemoryView';
import { AutomationsView } from './components/views/AutomationsView';
import { WhatsAppView } from './components/views/WhatsAppView';
import { AuditView } from './components/views/AuditView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { SettingsView } from './components/views/SettingsView';
import { RegisterView } from './components/views/RegisterView';
import { Modal } from './components/Modal';
import { AlertTriangle } from 'lucide-react';
import { reconnectGoogle } from './services/googleAuth';
import {
  DashboardSummary,
  Task,
  Reminder,
  CalendarEvent,
  Note,
  Contact,
  Memory,
  Conversation,
  AgentAction,
  UserProfile,
  GoogleWorkspaceConfig,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Entities state
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [googleConfig, setGoogleConfig] = useState<GoogleWorkspaceConfig | null>(null);

  // Quick Action modals
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isQuickReminderOpen, setIsQuickReminderOpen] = useState(false);
  const [quickReminderTitle, setQuickReminderTitle] = useState('');
  const [quickReminderTime, setQuickReminderTime] = useState('');

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        dashRes,
        tasksRes,
        remindersRes,
        eventsRes,
        notesRes,
        contactsRes,
        memoriesRes,
        conversationsRes,
        actionsRes,
        settingsRes,
        googleRes,
      ] = await Promise.all([
        fetch('/api/dashboard').then((r) => r.json()).catch(() => null),
        fetch('/api/tasks').then((r) => r.json()).catch(() => []),
        fetch('/api/reminders').then((r) => r.json()).catch(() => []),
        fetch('/api/events').then((r) => r.json()).catch(() => []),
        fetch('/api/notes').then((r) => r.json()).catch(() => []),
        fetch('/api/contacts').then((r) => r.json()).catch(() => []),
        fetch('/api/memories').then((r) => r.json()).catch(() => []),
        fetch('/api/conversations').then((r) => r.json()).catch(() => []),
        fetch('/api/agent-actions').then((r) => r.json()).catch(() => []),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
        fetch('/api/google/status').then((r) => r.json()).catch(() => null),
      ]);

      if (dashRes) setSummary(dashRes);
      if (Array.isArray(tasksRes)) setTasks(tasksRes);
      if (Array.isArray(remindersRes)) setReminders(remindersRes);
      if (Array.isArray(eventsRes)) setEvents(eventsRes);
      if (Array.isArray(notesRes)) setNotes(notesRes);
      if (Array.isArray(contactsRes)) setContacts(contactsRes);
      if (Array.isArray(memoriesRes)) setMemories(memoriesRes);
      if (Array.isArray(conversationsRes)) setConversations(conversationsRes);
      if (Array.isArray(actionsRes)) setAgentActions(actionsRes);
      if (settingsRes) setProfile(settingsRes);
      if (googleRes) setGoogleConfig(googleRes);
    } catch (err) {
      console.error('Error loading applet data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 10 seconds for real-time updates from WhatsApp
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCompleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }),
    });
    loadData();
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickTaskTitle }),
    });
    setQuickTaskTitle('');
    setIsQuickTaskOpen(false);
    loadData();
  };

  const handleCreateQuickReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReminderTitle.trim() || !quickReminderTime) return;
    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: quickReminderTitle,
        message: quickReminderTitle,
        scheduled_at: new Date(quickReminderTime).toISOString(),
      }),
    });
    setQuickReminderTitle('');
    setQuickReminderTime('');
    setIsQuickReminderOpen(false);
    loadData();
  };

  const isRegisterPage = window.location.pathname === '/register' || window.location.pathname === '/cadastro';

  if (isRegisterPage) {
    return <RegisterView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F1115] font-sans antialiased text-[#F5F7FA]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openSimulator={() => setIsSimulatorOpen(true)}
        stats={{
          pendingTasksCount: summary?.stats?.pendingTasksCount ?? 0,
          pendingRemindersCount: summary?.stats?.pendingRemindersCount ?? 0,
        }}
        profile={profile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F1115]">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          whatsappConnected={summary?.whatsapp?.connected ?? false}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          openSimulator={() => setIsSimulatorOpen(true)}
          onQuickTask={() => setIsQuickTaskOpen(true)}
          onQuickReminder={() => setIsQuickReminderOpen(true)}
        />

        {/* Google Workspace Expired Notification Banner */}
        {googleConfig?.tokenExpired && (
          <div className="bg-[#EF4444]/15 border-b border-[#EF4444]/30 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 text-xs text-[#F5F7FA]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>
                <strong className="text-[#EF4444]">Sincronização Pausada:</strong> A sua autorização com o <strong>Google Tasks</strong> e <strong>Google Calendar</strong> expirou. Tarefas e compromissos novos estão salvos localmente.
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  await reconnectGoogle();
                  await loadData();
                } catch (err: any) {
                  alert(`Erro ao reconectar Google: ${err.message || err}`);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Reconectar Google Agora</span>
            </button>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0F1115]">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onCompleteTask={handleCompleteTask}
              openSimulator={() => setIsSimulatorOpen(true)}
              onQuickTask={() => setIsQuickTaskOpen(true)}
              onQuickReminder={() => setIsQuickReminderOpen(true)}
            />
          )}

          {activeTab === 'agenda' && (
            <AgendaView
              events={events}
              onRefresh={loadData}
              googleConfig={googleConfig}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onRefresh={loadData}
              googleConfig={googleConfig}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersView reminders={reminders} onRefresh={loadData} />
          )}

          {activeTab === 'notes' && <NotesView notes={notes} onRefresh={loadData} />}

          {activeTab === 'contacts' && <ContactsView contacts={contacts} onRefresh={loadData} />}

          {activeTab === 'conversations' && (
            <ConversationsView conversations={conversations} onRefresh={loadData} />
          )}

          {activeTab === 'memory' && <MemoryView memories={memories} onRefresh={loadData} />}

          {activeTab === 'automations' && (
            <AutomationsView
              profile={profile}
              onRefresh={loadData}
              openSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppView profile={profile} onRefresh={loadData} />
          )}

          {activeTab === 'audit' && (
            <AuditView actions={agentActions} onRefresh={loadData} />
          )}

          {activeTab === 'diagnostics' && <DiagnosticsView onRefresh={loadData} />}

          {activeTab === 'settings' && (
            <SettingsView profile={profile} onRefresh={loadData} />
          )}
        </main>
      </div>

      {/* WhatsApp Message Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onActionComplete={loadData}
      />

      {/* Quick Task Modal */}
      <Modal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        title="Nova Tarefa Rápida — URSO JR."
      >
        <form onSubmit={handleCreateQuickTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              O que você precisa fazer? *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Ex: Pagar a guia do Simples Nacional"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickTaskOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!quickTaskTitle.trim()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Criar Tarefa
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Reminder Modal */}
      <Modal
        isOpen={isQuickReminderOpen}
        onClose={() => setIsQuickReminderOpen(false)}
        title="Novo Lembrete para WhatsApp — URSO JR."
      >
        <form onSubmit={handleCreateQuickReminder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Do que você quer ser lembrado? *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={quickReminderTitle}
              onChange={(e) => setQuickReminderTitle(e.target.value)}
              placeholder="Ex: Ligar para o cliente às 16h"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Quando? *
            </label>
            <input
              type="datetime-local"
              required
              value={quickReminderTime}
              onChange={(e) => setQuickReminderTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickReminderOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!quickReminderTitle.trim() || !quickReminderTime}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Criar Lembrete
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
