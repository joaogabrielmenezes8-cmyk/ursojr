import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Trash2,
  Calendar,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, GoogleWorkspaceConfig } from '../../types';
import { Modal } from '../Modal';
import { reconnectGoogle } from '../../services/googleAuth';

interface TasksViewProps {
  tasks: Task[];
  onRefresh: () => void;
  googleConfig?: GoogleWorkspaceConfig | null;
  onNavigateTab?: (tab: any) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onRefresh,
  googleConfig,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'urgent'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isGoogleActive = Boolean(googleConfig?.connected && googleConfig?.hasToken);

  // Deletion confirmation modal
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending' && t.status !== 'pending') return false;
    if (filter === 'in_progress' && t.status !== 'in_progress') return false;
    if (filter === 'completed' && t.status !== 'completed') return false;
    if (filter === 'urgent' && t.priority !== 'urgent') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
    }
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          due_at: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('normal');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      }),
    });
    onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/tasks/${taskToDelete.id}`, { method: 'DELETE' });
      setTaskToDelete(null);
      onRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncTasks = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error syncing tasks:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const priorityStyles: Record<TaskPriority, string> = {
    urgent: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    high: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    normal: 'bg-[#1E232B] text-[#9CA3AF] border-[#262C36]',
    low: 'bg-[#1E232B] text-[#9CA3AF] border-[#262C36]',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Canonical Source Banner */}
      {isGoogleActive && !googleConfig?.tokenExpired ? (
        <div className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F5F7FA]">
                  Google Tasks como Fonte Canônica
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                  Google Conectado
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                Sincronização bidirecional ativa na conta <span className="text-[#F5F7FA] font-medium">{googleConfig?.email || 'Google'}</span>. Tarefas criadas no WhatsApp gravam diretamente no Google Tasks oficial.
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncTasks}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl border border-[#262C36] bg-[#0F1115] text-xs font-semibold text-[#F5F7FA] hover:bg-[#1E232B] transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C7FF3D]' : 'text-[#9CA3AF]'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Google Tasks'}</span>
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
                  Google Tasks: Sessão Expirada
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                  Reconexão Necessária
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                A autorização do Google Tasks expirou. Clique no botão ao lado para reconectar e enviar todas as tarefas criadas via WhatsApp para o seu Google Tasks oficial.
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
            <span>Reconectar Google Tasks</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#F59E0B] flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F5F7FA]">
                  Google Tasks Desconectado
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  Armazenamento Local
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                As tarefas estão sendo salvas no banco local. Conecte sua Conta Google oficial em Configurações para sincronizar com o Google Tasks.
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

      {/* Top Actions & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#181C22] border border-[#262C36] overflow-x-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'in_progress', label: 'Em Andamento' },
            { id: 'completed', label: 'Concluídas' },
            { id: 'urgent', label: '🚨 Urgentes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#1E232B] text-[#F5F7FA] shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Add */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#262C36] bg-[#181C22] text-xs text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <CheckSquare className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhuma tarefa encontrada neste filtro.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Envie no WhatsApp para o URSO JR.: "Comprar ração amanhã" ou "Cobrar relatório de vendas"
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`group p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                task.status === 'completed'
                  ? 'border-[#262C36]/50 bg-[#181C22]/60 opacity-60'
                  : 'bg-[#181C22] border-[#262C36] hover:border-[#384152] shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    task.status === 'completed'
                      ? 'bg-[#C7FF3D] border-[#C7FF3D] text-[#0F1115]'
                      : 'border-[#343C4A] hover:border-[#C7FF3D] text-transparent hover:text-[#C7FF3D]'
                  }`}
                  title={task.status === 'completed' ? 'Marcar como pendente' : 'Concluir tarefa'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold truncate ${
                        task.status === 'completed'
                          ? 'line-through text-[#9CA3AF]'
                          : 'text-[#F5F7FA]'
                      }`}
                    >
                      {task.title}
                    </span>

                    <span
                      className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${
                        priorityStyles[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>

                    {task.google_task_id && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[#C7FF3D]/10 text-[#C7FF3D] border border-[#C7FF3D]/20">
                        Google Tasks
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {task.due_at && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] pt-1">
                      <Calendar className="w-3 h-3 text-[#C7FF3D]" />
                      <span>
                        Prazo:{' '}
                        {new Date(task.due_at).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'America/Sao_Paulo',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTaskToDelete(task)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg transition-all cursor-pointer"
                  title="Excluir tarefa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nova Tarefa */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Tarefa — URSO JR.">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Título da Tarefa *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Comprar ração, Cobrar relatório financeiro..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Descrição / Notas
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto adicional da tarefa..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D] cursor-pointer"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">🚨 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
              />
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
              {isSubmitting ? 'Salvando...' : 'Salvar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Task Deletion */}
      <Modal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        title="Confirmar Exclusão de Tarefa"
      >
        {taskToDelete && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
              <div>
                <p className="font-bold">Aviso de Exclusão:</p>
                <p className="mt-1 text-[#F5F7FA]">
                  Você está prestes a excluir permanentemente a tarefa{' '}
                  <strong className="text-[#EF4444]">"{taskToDelete.title}"</strong>.
                </p>
                {taskToDelete.google_task_id && (
                  <p className="mt-1 text-[11px] text-[#EF4444] font-medium">
                    ✓ Ela será removida imediatamente da sua lista oficial no Google Tasks.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
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
