import React, { useState, useEffect } from 'react';
import { Send, Sparkles, CheckCircle2, ArrowRight, Users, Smartphone } from 'lucide-react';
import { Modal } from './Modal';
import { VoiceButton } from './VoiceButton';
import { UserProfile } from '../types';
import { UrsoLogo } from './UrsoLogo';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

interface SimulatedMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCalled?: string;
  timestamp: string;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onActionComplete,
}) => {
  const [messages, setMessages] = useState<SimulatedMessage[]>([
    {
      id: 'init_1',
      sender: 'user',
      text: 'Me lembra depois do almoço de ligar para o eletricista Altair.',
      timestamp: '11:42',
    },
    {
      id: 'init_2',
      sender: 'assistant',
      text: '⏰ Perfeito! Agendei um lembrete para hoje às 14:00:\n\n"Ligar para o eletricista Altair"\n\nTe envio uma mensagem no seu WhatsApp quando der o horário!',
      toolCalled: 'create_reminder',
      timestamp: '11:42',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('user_default');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/profiles')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setProfiles(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const samplePrompts = [
    'O que eu tenho marcado para hoje?',
    'Me lembra amanhã às 8h de ligar para João',
    'Nova tarefa urgente: Cobrar o Marcos',
    'Concluí a tarefa de consertar o carro',
    'Anota que a senha do cofre é 4920#',
    'Quem é o meu contador?',
  ];

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: SimulatedMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          phone: activeProfile?.phone || '5538991246669',
          userId: activeProfile?.id || 'user_default',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantText = data?.agentResult?.response || 'Mensagem processada pelo URSO JR.';
      const toolCalled = data?.agentResult?.toolCalled;

      const aiMsg: SimulatedMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: assistantText,
        toolCalled: toolCalled !== 'none' ? toolCalled : undefined,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      onActionComplete();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Erro ao processar mensagem: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Simulador de Mensagens WhatsApp — URSO JR." maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Profile Selector for Multi-User Household Simulation */}
        {profiles.length > 0 && (
          <div className="p-3 rounded-xl bg-[#0F1115] border border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C7FF3D] shrink-0" />
              <div className="text-xs text-[#F5F7FA]">
                <span className="font-bold text-[#9CA3AF]">Simulando como:</span>{' '}
                <span className="font-semibold text-[#F5F7FA]">{activeProfile?.full_name}</span>{' '}
                <span className="font-mono text-[#9CA3AF] text-[11px]">({activeProfile?.phone})</span>
              </div>
            </div>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-[#262C36] bg-[#181C22] text-[#F5F7FA] font-medium focus:border-[#C7FF3D] focus:outline-none cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.id === 'user_default' ? '(Titular)' : '(Casa)'} - {p.phone}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick prompt suggestions */}
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
            Sugestões Rápidas de Teste:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] hover:text-[#C7FF3D] border border-[#262C36] hover:border-[#384152] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{p}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60 text-[#C7FF3D]" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat message container */}
        <div className="h-80 border border-[#262C36] rounded-xl bg-[#0F1115] p-4 overflow-y-auto space-y-3 font-sans">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-[#232832] text-[#F5F7FA] border border-[#343C4A] rounded-tr-none'
                    : 'bg-[#181C22] text-[#F5F7FA] border border-[#262C36] rounded-tl-none'
                }`}
              >
                {/* Assistant header with mini Urso icon */}
                {m.sender === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-[#262C36]">
                    <UrsoLogo variant="symbol" size="sm" className="w-4 h-4 scale-75 origin-left" />
                    <span className="font-extrabold text-[11px] text-[#C7FF3D]">URSO JR.</span>
                    <span className="text-[9px] text-[#9CA3AF]">· estagiário</span>
                  </div>
                )}

                {/* Tool called tag */}
                {m.toolCalled && (
                  <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C7FF3D]/10 text-[10px] font-mono font-bold text-[#C7FF3D] border border-[#C7FF3D]/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Tool: {m.toolCalled}()</span>
                  </div>
                )}

                <div className="whitespace-pre-line text-[#F5F7FA]">{m.text}</div>
                <div className="mt-1 text-[9px] text-right text-[#9CA3AF]">
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2.5 p-3 max-w-[65%] rounded-2xl rounded-tl-none bg-[#181C22] border border-[#262C36] text-xs text-[#9CA3AF]">
              <UrsoLogo variant="symbol" size="sm" className="animate-spin w-4 h-4" />
              <span>URSO JR. processando intenção e ferramentas...</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <VoiceButton
            onTranscript={(text) => {
              setInput(text);
            }}
            onAutoSubmit={(finalText) => {
              handleSend(finalText);
            }}
            autoSubmitOnStop={true}
            size="md"
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite ou envie áudio para o URSO JR..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] text-xs focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D] transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] disabled:opacity-40 text-[#0F1115] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </Modal>
  );
};
