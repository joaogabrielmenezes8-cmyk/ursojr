import React, { useState } from 'react';
import { FileText, Plus, Search, Star, Trash2, Tag } from 'lucide-react';
import { Note } from '../../types';
import { Modal } from '../Modal';

interface NotesViewProps {
  notes: Note[];
  onRefresh: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ notes, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredNotes = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          tags: tags.length ? tags : ['geral'],
          is_favorite: false,
        }),
      });
      setTitle('');
      setContent('');
      setTagsStr('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = async (note: Note) => {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !note.is_favorite }),
    });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta anotação do URSO JR.?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    onRefresh();
  };

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
            placeholder="Buscar notas por palavra-chave ou #tag..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#181C22] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nova Anotação</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <FileText className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhuma anotação cadastrada.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Envie no WhatsApp para o URSO JR.: "Anota aí: ideias para o projeto..."
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            return (
              <div
                key={note.id}
                className="group p-4 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm hover:border-[#384152] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xs font-bold text-[#F5F7FA] line-clamp-1">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleFavorite(note)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          note.is_favorite
                            ? 'text-[#F59E0B]'
                            : 'text-[#9CA3AF] hover:text-[#F59E0B]'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${note.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#EF4444] rounded transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#9CA3AF] line-clamp-4 leading-relaxed mb-4 whitespace-pre-line">
                    {note.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#262C36] flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {note.tags?.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9px] font-semibold bg-[#0F1115] text-[#C7FF3D] border border-[#262C36]"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {new Date(note.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova Nota */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Anotação — URSO JR.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Título da Nota *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ideias para o lançamento de produto"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Conteúdo da Nota *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva tudo o que quiser que o URSO JR. guarde..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Ex: trabalho, projeto, pessoal"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
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
              {isSubmitting ? 'Salvando...' : 'Salvar Anotação'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
