import React from 'react';
import {
  Calendar,
  CheckSquare,
  Bell,
  Activity,
  Smartphone,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Send,
  Zap,
} from 'lucide-react';
import { DashboardSummary, CalendarEvent, Task, Reminder } from '../../types';
import { UrsoLogo } from '../UrsoLogo';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  onNavigateTab: (tab: any) => void;
  onCompleteTask: (taskId: string) => void;
  openSimulator: () => void;
  onQuickTask: () => void;
  onQuickReminder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  onNavigateTab,
  onCompleteTask,
  openSimulator,
  onQuickTask,
  onQuickReminder,
}) => {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-[#9CA3AF] text-xs gap-3">
        <UrsoLogo variant="symbol" size="md" className="animate-pulse" />
        <span>Sincronizando central de comando do URSO JR...</span>
      </div>
    );
  }

  const { stats, whatsapp, todayEvents, upcomingTasks, upcomingReminders, overdueTasks } = summary;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive WhatsApp Copilot Banner */}
      <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 w-72 h-full bg-gradient-to-l from-[#C7FF3D]/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                whatsapp.connected
                  ? 'bg-[#0F1115] text-[#22C55E] border-[#22C55E]/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                  : 'bg-[#0F1115] text-[#F59E0B] border-[#F59E0B]/30'
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#F5F7FA]">
                  {whatsapp.connected ? 'Instância WhatsApp Conectada' : 'WhatsApp Desconectado'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0F1115] text-[#C7FF3D] border border-[#262C36]">
                  instância: {whatsapp.instanceId || 'b3r'}
                </span>
                {whatsapp.connected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#22C55E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    escutando webhook
                  </span>
                )}
              </div>

              <p className="text-xs text-[#9CA3AF] flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Número vinculado:{' '}
                  <strong className="text-[#F5F7FA] font-mono font-medium">
                    {whatsapp.number || '+55 38 99124-6669'}
                  </strong>
                </span>
                <span className="text-[#262C36] hidden sm:inline">•</span>
                <span className="truncate max-w-md">
                  Última resposta IA:{' '}
                  <span className="text-[#F5F7FA] italic font-normal">
                    "{whatsapp.lastMessageText || 'Pronto para receber novos áudios e mensagens'}"
                  </span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => onNavigateTab('whatsapp')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] transition-colors cursor-pointer"
            >
              Gerenciar Instância
            </button>
            <button
              onClick={openSimulator}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simular Envio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tarefas */}
        <div
          onClick={() => onNavigateTab('tasks')}
          className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] hover:border-[#384152] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF]">Tarefas Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#F5F7FA] flex items-center justify-center group-hover:border-[#C7FF3D]/40 group-hover:text-[#C7FF3D] transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
              {stats.pendingTasksCount}
            </span>
            {overdueTasks.length > 0 ? (
              <span className="text-[11px] font-semibold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
                {overdueTasks.length} atrasadas
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#9CA3AF]">organizadas</span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] flex items-center justify-between">
            <span>Google Tasks sync</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#C7FF3D]" />
          </div>
        </div>

        {/* Metric 2: Compromissos */}
        <div
          onClick={() => onNavigateTab('agenda')}
          className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] hover:border-[#384152] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF]">Compromissos Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#8B5CF6] flex items-center justify-center group-hover:border-[#8B5CF6]/40 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
              {stats.todayEventsCount}
            </span>
            <span className="text-[11px] font-medium text-[#9CA3AF]">na sua agenda</span>
          </div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] flex items-center justify-between">
            <span>Google Calendar sync</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#8B5CF6]" />
          </div>
        </div>

        {/* Metric 3: Lembretes */}
        <div
          onClick={() => onNavigateTab('reminders')}
          className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] hover:border-[#384152] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF]">Lembretes Ativos</span>
            <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#F59E0B] flex items-center justify-center group-hover:border-[#F59E0B]/40 transition-colors">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
              {stats.pendingRemindersCount}
            </span>
            <span className="text-[11px] font-semibold text-[#22C55E]">programados</span>
          </div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] flex items-center justify-between">
            <span>Disparo via WhatsApp</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#F59E0B]" />
          </div>
        </div>

        {/* Metric 4: Interações IA */}
        <div
          onClick={() => onNavigateTab('audit')}
          className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] hover:border-[#384152] cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF]">Interações IA (24h)</span>
            <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center group-hover:border-[#C7FF3D]/40 transition-colors">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
              {stats.aiMessages24h}
            </span>
            <span className="text-[11px] font-medium text-[#9CA3AF]">ações do URSO</span>
          </div>
          <div className="mt-2 text-[10px] text-[#9CA3AF] flex items-center justify-between">
            <span>Tool Calling & Auditoria</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#C7FF3D]" />
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Agenda de Hoje + Tarefas Prioritárias */}
        <div className="space-y-6">
          {/* Agenda de Hoje */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262C36]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8B5CF6]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA]">
                  Agenda do Dia
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('agenda')}
                className="text-xs text-[#9CA3AF] hover:text-[#C7FF3D] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <span>Ver calendário</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#9CA3AF]">
                Nenhum compromisso agendado para o restante do dia.
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayEvents.map((evt: CalendarEvent) => {
                  const startTime = new Date(evt.start_time).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  });
                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36] flex items-start justify-between gap-3 hover:border-[#384152] transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-bold text-[#F5F7FA] truncate">{evt.title}</div>
                        <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                          <span className="flex items-center gap-1 font-semibold text-[#8B5CF6]">
                            <Clock className="w-3 h-3" />
                            {startTime}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                              {evt.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 shrink-0">
                        Confirmado
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tarefas Prioritárias */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262C36]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#C7FF3D]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA]">
                  Tarefas Prioritárias
                </h3>
              </div>
              <button
                onClick={onQuickTask}
                className="text-xs text-[#C7FF3D] hover:underline font-bold cursor-pointer"
              >
                + Adicionar
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#9CA3AF]">
                Tudo em dia! Nenhuma tarefa pendente no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((t: Task) => {
                  const priorityBadges: Record<string, string> = {
                    urgent: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
                    high: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
                    normal: 'bg-[#1E232B] text-[#9CA3AF] border-[#262C36]',
                    low: 'bg-[#1E232B] text-[#9CA3AF] border-[#262C36]',
                  };
                  return (
                    <div
                      key={t.id}
                      className="group p-3 rounded-xl bg-[#0F1115] border border-[#262C36] flex items-center justify-between gap-3 hover:border-[#384152] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onCompleteTask(t.id)}
                          title="Concluir tarefa"
                          className="w-4 h-4 rounded-md border border-[#343C4A] flex items-center justify-center text-transparent hover:text-[#C7FF3D] hover:border-[#C7FF3D] transition-all shrink-0 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#F5F7FA] truncate">
                            {t.title}
                          </div>
                          {t.description && (
                            <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                              {t.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                          priorityBadges[t.priority] || priorityBadges.normal
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2: Lembretes WhatsApp + Comandos de Voz & Texto */}
        <div className="space-y-6">
          {/* Lembretes WhatsApp */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262C36]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA]">
                  Próximos Lembretes WhatsApp
                </h3>
              </div>
              <button
                onClick={onQuickReminder}
                className="text-xs text-[#F59E0B] hover:underline font-bold cursor-pointer"
              >
                + Criar
              </button>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#9CA3AF]">
                Nenhum lembrete pendente programado para disparo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingReminders.map((rem: Reminder) => {
                  const dateStr = new Date(rem.scheduled_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  });
                  return (
                    <div
                      key={rem.id}
                      className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36] flex items-start justify-between gap-3 hover:border-[#384152] transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-bold text-[#F5F7FA] truncate">{rem.title}</div>
                        <div className="text-[11px] text-[#F59E0B] font-medium flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Disparo: {dateStr}</span>
                          {rem.recurrence_rule && rem.recurrence_rule !== 'none' && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#F59E0B]/20 text-[#F59E0B] rounded font-bold">
                              {rem.recurrence_rule}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 shrink-0">
                        Agendado
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick AI Simulation & Voice Card */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#262C36]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C7FF3D]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA]">
                  Comandos de Voz & Texto pelo WhatsApp
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#C7FF3D]/10 text-[#C7FF3D] border border-[#C7FF3D]/30">
                URSO JR. Copilot
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              O URSO JR. ouve áudios e compreende comandos naturais no seu WhatsApp. Clique em qualquer exemplo para testar no simulador agora:
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={openSimulator}
                className="w-full p-3 rounded-xl bg-[#0F1115] border border-[#262C36] hover:border-[#C7FF3D]/60 text-xs font-mono text-[#F5F7FA] transition-all flex items-center justify-between cursor-pointer group text-left"
              >
                <span className="truncate">"Me lembra amanhã às 8h de ligar para João"</span>
                <span className="text-[11px] text-[#C7FF3D] font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Testar →
                </span>
              </button>

              <button
                onClick={openSimulator}
                className="w-full p-3 rounded-xl bg-[#0F1115] border border-[#262C36] hover:border-[#C7FF3D]/60 text-xs font-mono text-[#F5F7FA] transition-all flex items-center justify-between cursor-pointer group text-left"
              >
                <span className="truncate">"O que eu tenho marcado para hoje na agenda?"</span>
                <span className="text-[11px] text-[#C7FF3D] font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Testar →
                </span>
              </button>

              <button
                onClick={openSimulator}
                className="w-full p-3 rounded-xl bg-[#0F1115] border border-[#262C36] hover:border-[#C7FF3D]/60 text-xs font-mono text-[#F5F7FA] transition-all flex items-center justify-between cursor-pointer group text-left"
              >
                <span className="truncate">"Gastei 45 no almoço e anota que a senha do cofre é 8821#"</span>
                <span className="text-[11px] text-[#C7FF3D] font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Testar →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
