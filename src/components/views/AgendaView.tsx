import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { CalendarEvent, GoogleWorkspaceConfig } from '../../types';
import { Modal } from '../Modal';
import { reconnectGoogle } from '../../services/googleAuth';

interface AgendaViewProps {
  events: CalendarEvent[];
  onRefresh: () => void;
  googleConfig?: GoogleWorkspaceConfig | null;
  onNavigateTab?: (tab: any) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onRefresh,
  googleConfig,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'today' | 'all'>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isGoogleActive = Boolean(googleConfig?.connected && googleConfig?.hasToken);

  // Deletion confirmation modal
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter((e) => {
    if (filter === 'today') {
      return e.start_time.startsWith(todayStr);
    }
    return true;
  });

  const handleApplyPreset = (minutes: number) => {
    setSelectedPreset(minutes);
    if (startTime) {
      const s = new Date(startTime);
      const e = new Date(s.getTime() + minutes * 60000);
      setEndTime(e.toISOString().slice(0, 16));
    }
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (val && selectedPreset) {
      const s = new Date(val);
      const e = new Date(s.getTime() + selectedPreset * 60000);
      setEndTime(e.toISOString().slice(0, 16));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          location,
          description,
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : new Date(startTime).toISOString(),
        }),
      });
      setTitle('');
      setLocation('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/events/${eventToDelete.id}`, { method: 'DELETE' });
      setEventToDelete(null);
      onRefresh();
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error syncing calendar:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Canonical Source Banner */}
      {isGoogleActive && !googleConfig?.tokenExpired ? (
        <div className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#8B5CF6] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F5F7FA]">
                  Google Calendar como Fonte Canônica
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                  Google Conectado
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Sincronização bidirecional na conta <span className="text-[#F5F7FA] font-medium">{googleConfig?.email || 'Google'}</span>. Agendamentos no WhatsApp gravam diretamente na sua agenda oficial.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncCalendar}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl border border-[#262C36] bg-[#0F1115] text-xs font-semibold text-[#F5F7FA] hover:bg-[#1E232B] transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C7FF3D]' : 'text-[#9CA3AF]'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Google Calendar'}</span>
          </button>
        </div>
      ) : googleConfig?.tokenExpired ? (
        <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F5F7FA]">
                  Google Calendar: Sessão Expirada
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                  Reconexão Necessária
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                A autorização do Google Calendar expirou. Clique no botão ao lado para reconectar e enviar todos os compromissos criados via WhatsApp para a sua agenda oficial do Google.
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                await reconnectGoogle();
                onRefresh();
              } catch (err: any) {
                alert(`Erro: ${err.message || err}`);
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          >
            <span>Reconectar Google Calendar</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#F59E0B] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F5F7FA]">
                  Google Calendar Desconectado
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  Banco Local
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Os compromissos estão salvos localmente. Conecte sua Conta Google oficial em Configurações para habilitar a agenda em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab?.('settings')}
            className="px-3.5 py-2 rounded-xl bg-[#0F1115] hover:bg-[#1E232B] border border-[#262C36] text-[#F5F7FA] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Configurar Google Workspace</span>
          </button>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-xl bg-[#181C22] border border-[#262C36]">
          <button
            onClick={() => setFilter('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'today'
                ? 'bg-[#1E232B] text-[#F5F7FA] shadow-xs'
                : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
            }`}
          >
            Compromissos de Hoje
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#1E232B] text-[#F5F7FA] shadow-xs'
                : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
            }`}
          >
            Todos os Eventos
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Novo Compromisso</span>
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <Calendar className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhum evento agendado para este período.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Peça pelo WhatsApp para o URSO JR.: "Marca dentista amanhã às 14h" ou "Reunião de negócios sexta às 10h"
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const startFmt = new Date(evt.start_time).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            });
            const endFmt = evt.end_time
              ? new Date(evt.end_time).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                })
              : null;

            return (
              <div
                key={evt.id}
                className="group p-4 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm hover:border-[#384152] flex items-start justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#0F1115] text-[#8B5CF6] flex flex-col items-center justify-center shrink-0 border border-[#262C36] font-mono text-[11px] font-bold">
                    <span>{new Date(evt.start_time).getDate()}</span>
                    <span className="text-[8px] uppercase text-[#9CA3AF]">
                      {new Date(evt.start_time).toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F5F7FA] truncate">{evt.title}</span>
                      {evt.google_event_id && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
                          Google Calendar
                        </span>
                      )}
                    </div>

                    {evt.description && (
                      <p className="text-[11px] text-[#9CA3AF] truncate">{evt.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-[#8B5CF6]">
                        <Clock className="w-3 h-3" />
                        {startFmt} {endFmt ? `até ${endFmt}` : ''}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                          {evt.location}
                        </span>
                      )}
                      {evt.html_link && (
                        <a
                          href={evt.html_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#C7FF3D] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Abrir no Google
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
                    Confirmado
                  </span>
                  <button
                    onClick={() => setEventToDelete(evt)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg transition-all cursor-pointer"
                    title="Excluir compromisso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Evento */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Compromisso — URSO JR.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Título do Compromisso *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com Diretor Comercial, Consulta Odontológica..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          {/* Duração Inteligente Pré-definida */}
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Duração Estimada
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Reunião (60 min)', min: 60 },
                { label: 'Consulta (60 min)', min: 60 },
                { label: 'Ligação (30 min)', min: 30 },
                { label: 'Treino (90 min)', min: 90 },
                { label: 'Rápido (15 min)', min: 15 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.min)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    selectedPreset === p.min
                      ? 'bg-[#C7FF3D]/10 border-[#C7FF3D]/30 text-[#C7FF3D]'
                      : 'bg-[#0F1115] border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Início *
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Término
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Localização ou Link da Sala
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Google Meet, Zoom, Av. Paulista 1000..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Pauta / Observações
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas importantes para o compromisso..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
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
              {isSubmitting ? 'Salvando...' : 'Salvar Compromisso'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Event Deletion */}
      <Modal
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        title="Confirmar Exclusão de Compromisso"
      >
        {eventToDelete && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
              <div>
                <p className="font-bold">Aviso de Exclusão:</p>
                <p className="mt-1 text-[#F5F7FA]">
                  Você está prestes a excluir permanentemente o compromisso{' '}
                  <strong className="text-[#EF4444]">"{eventToDelete.title}"</strong> agendado para{' '}
                  {new Date(eventToDelete.start_time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
                </p>
                {eventToDelete.google_event_id && (
                  <p className="mt-1 text-[11px] text-[#EF4444] font-medium">
                    ✓ Ele será removido imediatamente da sua agenda oficial do Google Calendar.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#262C36] text-xs font-semibold text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
