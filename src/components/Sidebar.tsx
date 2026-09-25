import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Bell,
  FileText,
  Users,
  MessageSquare,
  Brain,
  Zap,
  Smartphone,
  Activity,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';
import { UrsoLogo } from './UrsoLogo';
import { UserProfile } from '../types';

export type NavTab =
  | 'dashboard'
  | 'agenda'
  | 'tasks'
  | 'reminders'
  | 'notes'
  | 'contacts'
  | 'conversations'
  | 'memory'
  | 'automations'
  | 'whatsapp'
  | 'audit'
  | 'diagnostics'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  openSimulator: () => void;
  stats?: {
    pendingTasksCount: number;
    pendingRemindersCount: number;
  };
  profile?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openSimulator,
  stats,
  profile,
}) => {
  const operacaoItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda & Eventos', icon: Calendar },
    {
      id: 'tasks',
      label: 'Tarefas',
      icon: CheckSquare,
      badge: stats?.pendingTasksCount && stats.pendingTasksCount > 0 ? stats.pendingTasksCount : undefined,
    },
    {
      id: 'reminders',
      label: 'Lembretes WhatsApp',
      icon: Bell,
      badge: stats?.pendingRemindersCount && stats.pendingRemindersCount > 0 ? stats.pendingRemindersCount : undefined,
    },
    { id: 'notes', label: 'Notas Rápidas', icon: FileText },
    { id: 'contacts', label: 'Contatos', icon: Users },
  ];

  const copilotItems = [
    { id: 'conversations', label: 'Conversas WhatsApp', icon: MessageSquare },
    { id: 'memory', label: 'Memória da IA', icon: Brain },
    { id: 'automations', label: 'Resumo & Automações', icon: Zap },
  ];

  const sistemaItems = [
    { id: 'whatsapp', label: 'Conexão WhatsApp (b3r)', icon: Smartphone },
    { id: 'audit', label: 'Auditoria de Ações', icon: Activity },
    { id: 'diagnostics', label: 'Diagnóstico do Sistema', icon: ShieldCheck },
    { id: 'settings', label: 'Configurações & Família', icon: Settings },
  ];

  const renderNavGroup = (title: string, items: typeof operacaoItems) => (
    <div className="space-y-1">
      <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold tracking-wider text-[#9CA3AF]/60 uppercase">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all relative group cursor-pointer ${
                isActive
                  ? 'bg-[#1E232B] text-[#F5F7FA] shadow-xs'
                  : 'text-[#9CA3AF] hover:bg-[#181C22] hover:text-[#F5F7FA]'
              }`}
            >
              {/* Active left indicator pill */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#C7FF3D] rounded-r-full shadow-[0_0_8px_#C7FF3D]" />
              )}

              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#C7FF3D]' : 'text-[#9CA3AF] group-hover:text-[#F5F7FA]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#C7FF3D] text-[#0F1115]'
                      : 'bg-[#232832] text-[#9CA3AF] group-hover:text-[#F5F7FA]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const userName = profile?.full_name || 'João Gabriel';
  const userPhone = profile?.phone || '5538991246669';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="w-64 border-r border-[#262C36] bg-[#181C22] flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#262C36]">
        <UrsoLogo size="md" variant="full" showTagline={true} />
      </div>

      {/* Simulator Quick Action Banner */}
      <div className="p-3 border-b border-[#262C36]/50">
        <button
          onClick={openSimulator}
          className="w-full group flex items-center justify-between p-2.5 rounded-xl bg-[#0F1115] border border-[#262C36] hover:border-[#C7FF3D]/50 text-[#F5F7FA] transition-all text-left cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#C7FF3D]/10 border border-[#C7FF3D]/30 text-[#C7FF3D] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#C7FF3D] group-hover:text-[#0F1115] transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                Simulador IA
                <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF3D] animate-pulse" />
              </div>
              <div className="text-[10px] text-[#9CA3AF]">Testar comandos ao vivo</div>
            </div>
          </div>
          <span className="text-xs font-mono text-[#9CA3AF] group-hover:text-[#C7FF3D] group-hover:translate-x-0.5 transition-all">
            →
          </span>
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {renderNavGroup('Operação', operacaoItems)}
        {renderNavGroup('Inteligência & Copilot', copilotItems)}
        {renderNavGroup('Sistema & Conexões', sistemaItems)}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-[#262C36]">
        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-[#0F1115] border border-[#262C36] hover:border-[#343C4A] text-left transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#232832] border border-[#343C4A] text-[#C7FF3D] font-black text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F7FA] truncate group-hover:text-[#C7FF3D] transition-colors">
                {userName}
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#C7FF3D]/10 text-[#C7FF3D]">
                Titular
              </span>
            </div>
            <div className="text-[10px] text-[#9CA3AF] font-mono truncate">+{userPhone}</div>
          </div>
        </button>
      </div>
    </aside>
  );
};
