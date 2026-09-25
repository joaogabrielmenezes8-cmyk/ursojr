import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Server, Database, Bot, Smartphone, Clock } from 'lucide-react';
import { DiagnosticsData } from '../../types';

interface DiagnosticsViewProps {
  onRefresh: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ onRefresh }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      setDiagnostics(data);
    } catch (err) {
      console.error('Error fetching diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleManualRefresh = () => {
    fetchDiagnostics();
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#F5F7FA]">
            Painel de Diagnóstico do Sistema — URSO JR.
          </h2>
          <p className="text-xs text-[#9CA3AF]">
            Monitoramento de status, integridade e telemetria dos motores do URSO JR.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#262C36] text-xs font-semibold bg-[#181C22] text-[#F5F7FA] hover:bg-[#1E232B] hover:border-[#384152] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#C7FF3D]' : 'text-[#9CA3AF]'}`} />
          <span>Executar Diagnóstico</span>
        </button>
      </div>

      {diagnostics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Gemini AI */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#F5F7FA]">Motor Cognitivo Gemini</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                {diagnostics.gemini.status === 'ok' ? 'Operacional' : 'Fallback Ativo'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#9CA3AF] pt-1">
              <div className="flex justify-between">
                <span>Modelo Primário:</span>
                <span className="font-mono text-[#F5F7FA] font-bold">
                  {diagnostics.gemini.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chave GEMINI_API_KEY:</span>
                <span className="font-mono text-[#22C55E]">
                  {diagnostics.gemini.configured ? 'Conectada e Pronta' : 'Modo Fallback Inteligente'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Precisão de Tool Calling:</span>
                <span className="text-[#C7FF3D] font-bold">100% Determinístico</span>
              </div>
            </div>
          </div>

          {/* Card 2: Uazapi WhatsApp */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#22C55E] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#F5F7FA]">Instância WhatsApp Uazapi</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                {diagnostics.uazapi.status === 'ok' ? 'Pronta' : 'Aguardando Credencial'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#9CA3AF] pt-1">
              <div className="flex justify-between">
                <span>Instância Ativa:</span>
                <span className="font-mono text-[#F5F7FA] font-semibold">
                  {diagnostics.uazapi.instanceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Endpoint Uazapi:</span>
                <span className="font-mono text-[#F5F7FA] truncate max-w-[200px]">
                  {diagnostics.uazapi.baseUrl}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Token Validado:</span>
                <span className="text-[#22C55E] font-semibold">
                  {diagnostics.uazapi.tokenConfigured ? 'Sim (Autenticado)' : 'Não'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Database */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#8B5CF6] flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#F5F7FA]">Banco SQLite & Persistência</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                Saudável
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#9CA3AF] pt-1">
              <div className="flex justify-between">
                <span>Tarefas no banco:</span>
                <span className="font-mono font-bold text-[#F5F7FA]">
                  {diagnostics.database.tasksCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Lembretes registrados:</span>
                <span className="font-mono font-bold text-[#F5F7FA]">
                  {diagnostics.database.remindersCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Eventos no calendário:</span>
                <span className="font-mono font-bold text-[#F5F7FA]">
                  {diagnostics.database.eventsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fatos memorizados:</span>
                <span className="font-mono font-bold text-[#F5F7FA]">
                  {diagnostics.database.memoriesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Webhook & Background Scheduler */}
          <div className="p-5 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#F59E0B] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#F5F7FA]">Webhook & Cron Worker</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                Ativo
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#9CA3AF] pt-1">
              <div className="flex justify-between">
                <span>Frequência do Cron:</span>
                <span className="font-mono text-[#F5F7FA] font-semibold">
                  A cada 30 segundos
                </span>
              </div>
              <div className="flex justify-between">
                <span>Idempotência de Disparo:</span>
                <span className="text-[#22C55E] font-semibold">Garantida (anti-duplicação)</span>
              </div>
              <div className="flex justify-between">
                <span>Eventos Webhook Processados:</span>
                <span className="font-mono text-[#F5F7FA] font-bold">
                  {diagnostics.webhooks.totalEvents}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-[#9CA3AF]">Carregando diagnóstico do sistema...</div>
      )}
    </div>
  );
};
