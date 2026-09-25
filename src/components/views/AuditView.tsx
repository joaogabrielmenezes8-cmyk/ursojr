import React, { useState } from 'react';
import { Activity, Search, Code, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { AgentAction } from '../../types';
import { Modal } from '../Modal';

interface AuditViewProps {
  actions: AgentAction[];
  onRefresh: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ actions }) => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null);

  const filtered = actions.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.user_message.toLowerCase().includes(q) ||
      a.detected_intent.toLowerCase().includes(q) ||
      a.tool_called.toLowerCase().includes(q) ||
      a.assistant_response.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por comando, intenção, tool..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#181C22] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          <span>Total de auditorias:</span>
          <span className="font-mono font-bold text-[#F5F7FA] bg-[#181C22] border border-[#262C36] px-2.5 py-1 rounded-full">
            {actions.length} execuções
          </span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl border border-[#262C36] bg-[#181C22] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1115] border-b border-[#262C36] text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Comando Recebido</th>
                <th className="py-3 px-4">Tool URSO JR.</th>
                <th className="py-3 px-4">Modelo</th>
                <th className="py-3 px-4">Resposta Gerada</th>
                <th className="py-3 px-4 text-right">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262C36]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9CA3AF]">
                    Nenhum log de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const timeStr = new Date(item.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1E232B]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-[#9CA3AF] whitespace-nowrap">
                        {timeStr}
                      </td>

                      <td className="py-3 px-4 font-medium text-[#F5F7FA] max-w-xs truncate">
                        "{item.user_message}"
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#C7FF3D]/10 text-[#C7FF3D] border border-[#C7FF3D]/25">
                          <Sparkles className="w-2.5 h-2.5 text-[#C7FF3D]" />
                          {item.tool_called}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#9CA3AF] font-mono text-[10px]">
                        {item.model}
                      </td>

                      <td className="py-3 px-4 text-[#9CA3AF] max-w-sm truncate">
                        {item.assistant_response}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAction(item)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#0F1115] border border-[#262C36] hover:border-[#C7FF3D] text-[#F5F7FA] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Code className="w-3 h-3 text-[#C7FF3D]" />
                          <span>Inspecionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspector Modal */}
      {selectedAction && (
        <Modal
          isOpen={Boolean(selectedAction)}
          onClose={() => setSelectedAction(null)}
          title="Inspeção de Execução — URSO JR."
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-[#9CA3AF]">Mensagem Recebida do Usuário:</span>
              <div className="p-3 bg-[#0F1115] border border-[#262C36] rounded-xl mt-1 font-medium text-[#F5F7FA]">
                "{selectedAction.user_message}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-[#9CA3AF]">Intenção Detectada:</span>
                <div className="p-2.5 bg-[#0F1115] border border-[#262C36] rounded-lg mt-1 font-mono text-[#F5F7FA]">
                  {selectedAction.detected_intent}
                </div>
              </div>
              <div>
                <span className="font-semibold text-[#9CA3AF]">Tool Invocada:</span>
                <div className="p-2.5 bg-[#0F1115] border border-[#262C36] rounded-lg mt-1 font-mono text-[#C7FF3D] font-bold">
                  {selectedAction.tool_called}()
                </div>
              </div>
            </div>

            <div>
              <span className="font-semibold text-[#9CA3AF]">Parâmetros Extraídos:</span>
              <pre className="p-3 bg-[#0F1115] text-[#C7FF3D] border border-[#262C36] rounded-xl font-mono text-[11px] mt-1 overflow-x-auto">
                {JSON.stringify(selectedAction.tool_arguments, null, 2)}
              </pre>
            </div>

            <div>
              <span className="font-semibold text-[#9CA3AF]">Resultado de Retorno da Operação:</span>
              <pre className="p-3 bg-[#0F1115] text-[#F5F7FA] border border-[#262C36] rounded-xl font-mono text-[11px] mt-1 overflow-x-auto">
                {JSON.stringify(selectedAction.result, null, 2)}
              </pre>
            </div>

            <div>
              <span className="font-semibold text-[#9CA3AF]">Resposta Entregue no WhatsApp pelo URSO JR.:</span>
              <div className="p-3 bg-[#0F1115] text-[#F5F7FA] border border-[#262C36] rounded-xl mt-1 whitespace-pre-line leading-relaxed">
                {selectedAction.assistant_response}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
