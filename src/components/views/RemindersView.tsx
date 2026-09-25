import React, { useState } from 'react';
import { Bell, Plus, Clock, Repeat, Trash2, Send, CheckCircle2, Zap } from 'lucide-react';
import { Reminder, RecurrenceRule } from '../../types';
import { Modal } from '../Modal';

interface RemindersViewProps {
  reminders: Reminder[];
  onRefresh: () => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({ reminders, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'sent') return r.status === 'sent';
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: message || title,
          scheduled_at: new Date(scheduledAt).toISOString(),
          recurrence_rule: recurrence,
        }),
      });
      setTitle('');
      setMessage('');
      setScheduledAt('');
      setRecurrence('none');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating reminder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este lembrete do URSO JR.?')) return;
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleTriggerNow = async (rem: Reminder) => {
    try {
      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '5538991246669',
          message: `⏰ *URSO JR. — LEMBRETE ATIVO:*\n\n*${rem.title}*\n${rem.message}\n\n(Disparado pelo motor do URSO JR.)`,
        }),
      });
      if (res.ok) {
        alert('Lembrete disparado para o seu WhatsApp com sucesso!');
        onRefresh();
      }
    } catch (err: any) {
      alert(`Erro ao disparar: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-xl bg-[#181C22] border border-[#262C36]">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendentes / Agendados' },
            { id: 'sent', label: 'Já Disparados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1E232B] text-[#F5F7FA] shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Novo Lembrete</span>
        </button>
      </div>

      {/* Reminders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReminders.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <Bell className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhum lembrete cadastrado neste status.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Envie no WhatsApp para o URSO JR.: "Me lembra amanhã às 14h de ligar para o Ricardo"
            </p>
          </div>
        ) : (
          filteredReminders.map((rem) => {
            const isSent = rem.status === 'sent';
            const scheduledDate = new Date(rem.scheduled_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            });

            return (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSent
                    ? 'bg-[#181C22]/50 border-[#262C36]/50 opacity-60'
                    : 'bg-[#181C22] border-[#262C36] hover:border-[#384152] shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSent
                            ? 'bg-[#0F1115] text-[#9CA3AF] border-[#262C36]'
                            : 'bg-[#0F1115] text-[#F59E0B] border-[#F59E0B]/30'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#F5F7FA] truncate">
                        {rem.title}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        isSent
                          ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                          : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                      }`}
                    >
                      {isSent ? 'Disparado' : 'Agendado'}
                    </span>
                  </div>

                  {rem.message && rem.message !== rem.title && (
                    <p className="text-[11px] text-[#9CA3AF] mb-3 line-clamp-2 pl-10.5">
                      {rem.message}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#262C36] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-[#9CA3AF]">
                    <span className="flex items-center gap-1 font-semibold text-[#F59E0B]">
                      <Clock className="w-3 h-3" />
                      {scheduledDate}
                    </span>
                    {rem.recurrence_rule && rem.recurrence_rule !== 'none' && (
                      <span className="flex items-center gap-1 text-[10px] bg-[#0F1115] border border-[#262C36] px-1.5 py-0.5 rounded font-mono text-[#F5F7FA]">
                        <Repeat className="w-2.5 h-2.5 text-[#C7FF3D]" />
                        {rem.recurrence_rule}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTriggerNow(rem)}
                      title="Testar disparo agora no WhatsApp"
                      className="p-1.5 text-[#9CA3AF] hover:text-[#C7FF3D] rounded-lg hover:bg-[#0F1115] transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rem.id)}
                      title="Excluir lembrete"
                      className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg hover:bg-[#0F1115] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Lembrete */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lembrete para WhatsApp — URSO JR.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Do que você quer ser lembrado? *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Tomar remédio, Ligar para o contador..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Mensagem a Enviar no WhatsApp
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Texto completo que o robô enviará no seu celular..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Data e Horário do Disparo *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D] cursor-pointer"
              >
                <option value="none">Único (Sem repetição)</option>
                <option value="daily">Diário (Todos os dias)</option>
                <option value="weekly">Semanal (Toda semana)</option>
                <option value="monthly">Mensal (Todo mês)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#262C36] text-xs font-semibold text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Agendando...' : 'Programar Lembrete'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
