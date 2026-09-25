import React, { useState } from 'react';
import { Brain, Plus, Search, Trash2, KeyRound, Sparkles } from 'lucide-react';
import { Memory } from '../../types';
import { Modal } from '../Modal';

interface MemoryViewProps {
  memories: Memory[];
  onRefresh: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ memories, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<'preference' | 'fact' | 'rule' | 'work'>('preference');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMemories = memories.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category }),
      });
      setKey('');
      setValue('');
      setCategory('preference');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja apagar esta memória da base do URSO JR.?')) return;
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    preference: { label: 'Preferência', color: 'bg-[#C7FF3D]/10 text-[#C7FF3D] border-[#C7FF3D]/30' },
    fact: { label: 'Fato Pessoal', color: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30' },
    rule: { label: 'Regra de Comportamento', color: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30' },
    work: { label: 'Negócios / Empresa', color: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Intro Box */}
      <div className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#F5F7FA]">
            Base de Conhecimento e Memória do URSO JR.
          </h3>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">
            Aqui ficam salvos os fatos, preferências e regras que o URSO JR. absorve nas conversas de WhatsApp ou que você cadastra manualmente. Ele consulta essa base em todas as interações para responder com máxima contextualização.
          </p>
        </div>
      </div>

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fatos ou regras na memória..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#181C22] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Ensinar Fato ao URSO JR.</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMemories.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <Brain className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhuma memória cadastrada com esse critério.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Envie no WhatsApp: "URSO, lembra que eu prefiro reuniões pela manhã"
            </p>
          </div>
        ) : (
          filteredMemories.map((m) => {
            const catInfo = categoryLabels[m.category] || categoryLabels.preference;
            return (
              <div
                key={m.id}
                className="group p-4 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm hover:border-[#384152] flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="w-3.5 h-3.5 text-[#C7FF3D] shrink-0" />
                      <span className="text-xs font-bold font-mono text-[#F5F7FA] truncate">
                        {m.key}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#EF4444] rounded transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[#F5F7FA] font-medium my-2 bg-[#0F1115] p-3 rounded-xl border border-[#262C36] leading-relaxed">
                    "{m.value}"
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catInfo.color}`}
                  >
                    {catInfo.label}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {new Date(m.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Fato */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ensinar Fato ao URSO JR.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Chave Identificadora *
            </label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Ex: cafe_preferido ou esposa_aniversario"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Fato / Valor Memorizado *
            </label>
            <textarea
              rows={3}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: Expresso duplo sem açúcar com grão torra média"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D] cursor-pointer"
            >
              <option value="preference">Preferência Pessoal</option>
              <option value="fact">Fato Pessoal / Familiar</option>
              <option value="work">Trabalho / Negócios</option>
              <option value="rule">Regra de Comportamento</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !key.trim() || !value.trim()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Gravar na Memória
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
