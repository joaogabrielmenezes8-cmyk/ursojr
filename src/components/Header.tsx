import React from 'react';
import { Sparkles, Plus, RefreshCw, Smartphone, CheckSquare, Bell } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  whatsappConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  openSimulator: () => void;
  onQuickTask: () => void;
  onQuickReminder: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  whatsappConnected,
  onRefresh,
  isRefreshing,
  openSimulator,
  onQuickTask,
  onQuickReminder,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Visão Geral Executiva',
      subtitle: 'Painel de controle do URSO JR. com agenda, tarefas e status em tempo real',
    },
    agenda: {
      title: 'Agenda & Compromissos',
      subtitle: 'Eventos sincronizados via WhatsApp e integrados ao Google Calendar',
    },
    tasks: {
      title: 'Gestão de Tarefas',
      subtitle: 'Demandas operacionais organizadas por prioridade e prazo',
    },
    reminders: {
      title: 'Lembretes Ativos',
      subtitle: 'Disparos automáticos programados para o seu WhatsApp pessoal',
    },
    notes: {
      title: 'Notas & Ideias',
      subtitle: 'Anotações, dados sensíveis e memórias rápidas registradas pelo estagiário',
    },
    contacts: {
      title: 'Base de Contatos',
      subtitle: 'Pessoas-chave cadastradas para menções e follow-up rápido',
    },
    conversations: {
      title: 'Histórico do WhatsApp',
      subtitle: 'Registro das interações de voz e texto entre você e o URSO JR.',
    },
    memory: {
      title: 'Memória de Longo Prazo',
      subtitle: 'Regras, preferências e fatos absorvidos pelo seu estagiário com IA',
    },
    automations: {
      title: 'Automações & Resumo Diário',
      subtitle: 'Configuração do briefing matinal e rotinas inteligentes de acompanhamento',
    },
    whatsapp: {
      title: 'Conexão WhatsApp (Instância b3r)',
      subtitle: 'Status da conexão Uazapi, webhook em tempo real e testes de disparo',
    },
    audit: {
      title: 'Auditoria de Ações da IA',
      subtitle: 'Registro técnico de intenções, ferramentas (Tool Calling) e execuções',
    },
    diagnostics: {
      title: 'Diagnóstico do Sistema',
      subtitle: 'Monitoramento da saúde dos serviços de IA, banco de dados e APIs',
    },
    settings: {
      title: 'Configurações & Perfis da Casa',
      subtitle: 'Parâmetros de operação, fuso horário e gestão multi-usuário da casa',
    },
  };

  const current = titles[activeTab] || { title: 'URSO JR.', subtitle: 'Seu estagiário com IA' };

  return (
    <header className="h-16 border-b border-[#262C36] bg-[#181C22] px-6 lg:px-8 flex items-center justify-between shrink-0 select-none">
      {/* Title & Subtitle */}
      <div className="min-w-0 pr-4">
        <h1 className="text-base font-extrabold text-[#F5F7FA] tracking-tight truncate leading-tight">
          {current.title}
        </h1>
        <p className="text-xs text-[#9CA3AF] hidden sm:block truncate mt-0.5">
          {current.subtitle}
        </p>
      </div>

      {/* Actions and Status */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* WhatsApp Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            whatsappConnected
              ? 'bg-[#0F1115] text-[#22C55E] border-[#262C36]'
              : 'bg-[#0F1115] text-[#F59E0B] border-[#262C36]'
          }`}
          title={whatsappConnected ? 'Instância b3r online e escutando mensagens' : 'Instância desconectada'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              whatsappConnected ? 'bg-[#22C55E] animate-pulse shadow-[0_0_6px_#22C55E]' : 'bg-[#F59E0B]'
            }`}
          />
          <Smartphone className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="hidden md:inline font-medium">
            {whatsappConnected ? 'WhatsApp b3r Ativo' : 'WhatsApp Pendente'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Sincronizar dados agora"
          className="p-2 text-[#9CA3AF] hover:text-[#F5F7FA] rounded-xl hover:bg-[#1E232B] border border-[#262C36] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C7FF3D]' : ''}`} />
        </button>

        {/* Quick Task Button (Secondary) */}
        <button
          onClick={onQuickTask}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181C22] text-[#F5F7FA] hover:bg-[#1E232B] border border-[#262C36] transition-colors cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>+ Tarefa</span>
        </button>

        {/* Quick Reminder Button (Secondary) */}
        <button
          onClick={onQuickReminder}
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#181C22] text-[#F5F7FA] hover:bg-[#1E232B] border border-[#262C36] transition-colors cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>+ Lembrete</span>
        </button>

        {/* Simulator Button (Primary Accent) */}
        <button
          onClick={openSimulator}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] shadow-xs hover:shadow-[0_0_14px_rgba(199,255,61,0.25)] transition-all cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulador</span>
        </button>
      </div>
    </header>
  );
};
