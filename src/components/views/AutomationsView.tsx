import React, { useState } from 'react';
import { Zap, Clock, Bell, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../types';

interface AutomationsViewProps {
  profile: UserProfile | null;
  onRefresh: () => void;
  openSimulator: () => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  profile,
  onRefresh,
}) => {
  const [dailyEnabled, setDailyEnabled] = useState(profile?.daily_summary_enabled ?? true);
  const [summaryTime, setSummaryTime] = useState(profile?.daily_summary_time ?? '07:00');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_summary_enabled: dailyEnabled,
          daily_summary_time: summaryTime,
        }),
      });
      alert('Automação do URSO JR. atualizada com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBriefing = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Gere o resumo diário de hoje com minha programação e tarefas',
        }),
      });
      const data = await res.json();
      setTestResult(data?.agentResult?.response || 'Resumo gerado com sucesso.');
      onRefresh();
    } catch (err: any) {
      setTestResult(`Erro ao gerar resumo: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Card 1: Briefing Diário Matinal */}
      <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F7FA]">
                Briefing Executivo Diário — URSO JR.
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                O URSO JR. compila sua agenda, compromissos prioritários e tarefas urgentes e envia um briefing estruturado toda manhã no seu WhatsApp.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dailyEnabled}
              onChange={(e) => setDailyEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#0F1115] border border-[#262C36] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#9CA3AF] after:border-[#262C36] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C7FF3D] peer-checked:after:bg-[#0F1115]"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Horário do Disparo Matinal
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="time"
                value={summaryTime}
                onChange={(e) => setSummaryTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
              />
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1 font-mono">Fuso Horário: America/Sao_Paulo (GMT-3)</p>
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2 px-4 rounded-xl bg-[#0F1115] border border-[#262C36] hover:bg-[#1E232B] text-[#F5F7FA] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Preferência'}
              </button>
              <button
                onClick={handleTestBriefing}
                disabled={isTesting}
                className="py-2 px-3 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTesting ? 'Gerando...' : 'Testar Briefing'}</span>
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-2">
            <div className="text-[11px] font-bold text-[#C7FF3D] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C7FF3D]" />
              <span>Simulação de Briefing do URSO JR.:</span>
            </div>
            <div className="p-3 bg-[#181C22] rounded-lg text-xs font-mono text-[#F5F7FA] whitespace-pre-line leading-relaxed border border-[#262C36]">
              {testResult}
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Lembretes & Follow-up Automático */}
      <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#22C55E] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F7FA]">
              Cron Worker do URSO JR. em Background
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              O agendador interno avalia os lembretes pendentes continuamente e despacha para o WhatsApp no exato minuto programado.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] text-xs text-[#9CA3AF] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#F5F7FA]">Status do Agendador:</span>
            <span className="text-[#22C55E] font-bold flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              Ativo (varredura a cada 30s)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#F5F7FA]">Recorrências Suportadas:</span>
            <span className="text-[#F5F7FA]">Diária, Dias Úteis, Semanal, Mensal</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#F5F7FA]">Prevenção de Spam / Duplicação:</span>
            <span className="text-[#22C55E] font-medium">Habilitada com Lock Idempotente</span>
          </div>
        </div>
      </div>
    </div>
  );
};
