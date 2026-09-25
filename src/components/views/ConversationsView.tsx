import React, { useState, useEffect } from 'react';
import { Send, Check, CheckCheck, Phone, Sparkles } from 'lucide-react';
import { Conversation, Message } from '../../types';
import { VoiceButton } from '../VoiceButton';
import { UrsoLogo } from '../UrsoLogo';

interface ConversationsViewProps {
  conversations: Conversation[];
  onRefresh: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({ conversations, onRefresh }) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || ''
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  useEffect(() => {
    if (!selectedConvId) return;

    setIsLoadingMessages(true);
    fetch(`/api/conversations/${selectedConvId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data || []);
      })
      .catch((err) => console.error('Error fetching messages:', err))
      .finally(() => setIsLoadingMessages(false));
  }, [selectedConvId]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        onRefresh();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] max-w-7xl mx-auto rounded-2xl border border-[#262C36] bg-[#181C22] shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Left Pane: Conversations List */}
      <div className="w-full md:w-80 border-r border-[#262C36] flex flex-col shrink-0 bg-[#0F1115]">
        <div className="p-3.5 border-b border-[#262C36] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UrsoLogo variant="symbol" size="sm" className="w-4 h-4 scale-75 origin-left" />
            <span className="text-xs font-bold text-[#F5F7FA] uppercase tracking-wider">
              Conversas WhatsApp
            </span>
          </div>
          <span className="text-[10px] bg-[#181C22] text-[#9CA3AF] border border-[#262C36] px-2 py-0.5 rounded-full font-mono">
            {conversations.length} ativas
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#262C36]/50">
          {conversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            const timeStr = conv.last_message_at
              ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-[#181C22] border-r-2 border-[#C7FF3D]'
                    : 'hover:bg-[#181C22]/60'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#1E232B] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center font-bold text-xs shrink-0">
                  {conv.contact_name.substring(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#F5F7FA] truncate">
                      {conv.contact_name}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{timeStr}</span>
                  </div>

                  <div className="text-[11px] text-[#9CA3AF] font-mono truncate mt-0.5">
                    {conv.contact_phone}
                  </div>

                  <p className="text-[11px] text-[#9CA3AF] truncate mt-1">
                    {conv.last_message || 'Nova conversa iniciada'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Pane: Message Timeline */}
      <div className="flex-1 flex flex-col bg-[#181C22]">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-6 border-b border-[#262C36] bg-[#181C22] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] font-bold text-xs flex items-center justify-center">
                  {activeConversation.contact_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F5F7FA]">
                    {activeConversation.contact_name}
                  </h3>
                  <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1.5">
                    <Phone className="w-2.5 h-2.5 text-[#C7FF3D]" />
                    <span className="font-mono">{activeConversation.contact_phone}</span>
                    <span>•</span>
                    <span className="text-[#22C55E] font-semibold">Assistido por URSO JR.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#0F1115]/50">
              {isLoadingMessages ? (
                <div className="py-12 text-center text-xs text-[#9CA3AF]">
                  Carregando mensagens da conversa...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#9CA3AF]">
                  Nenhuma mensagem registrada nesta conversa ainda.
                </div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.direction === 'outbound';
                  const timeStr = new Date(m.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  });

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-sm ${
                          isOutbound
                            ? 'bg-[#232832] text-[#F5F7FA] border border-[#343C4A] rounded-tr-none'
                            : 'bg-[#181C22] text-[#F5F7FA] border border-[#262C36] rounded-tl-none'
                        }`}
                      >
                        {m.tool_called && (
                          <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#C7FF3D]/10 text-[10px] font-mono font-bold text-[#C7FF3D] border border-[#C7FF3D]/25">
                            <Sparkles className="w-3 h-3 text-[#C7FF3D]" />
                            <span>Tool: {m.tool_called}</span>
                          </div>
                        )}

                        <div className="whitespace-pre-line leading-relaxed text-[#F5F7FA]">{m.text}</div>

                        <div
                          className="mt-1.5 flex items-center justify-end gap-1 text-[9px] text-[#9CA3AF]"
                        >
                          <span>{timeStr}</span>
                          {isOutbound && (
                            <span>
                              {m.status === 'sent' ? (
                                <CheckCheck className="w-3 h-3 inline text-[#C7FF3D]" />
                              ) : (
                                <Check className="w-3 h-3 inline opacity-70 text-[#9CA3AF]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-[#262C36] bg-[#181C22] flex items-center gap-2 shrink-0"
            >
              <VoiceButton
                onTranscript={(text) => {
                  setInputText(text);
                }}
                size="md"
              />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enviar mensagem manual no WhatsApp ou dite por voz..."
                disabled={isSending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] text-xs focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] disabled:opacity-40 text-[#0F1115] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-[#9CA3AF]">
            Selecione uma conversa ao lado para visualizar a timeline.
          </div>
        )}
      </div>
    </div>
  );
};
