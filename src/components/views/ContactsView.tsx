import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Building, Briefcase, Trash2, MessageCircle } from 'lucide-react';
import { Contact } from '../../types';
import { Modal } from '../Modal';

interface ContactsViewProps {
  contacts: Contact[];
  onRefresh: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ contacts, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          company,
          role,
          notes,
        }),
      });
      setName('');
      setPhone('');
      setCompany('');
      setRole('');
      setNotes('');
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating contact:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este contato da base do URSO JR.?')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
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
            placeholder="Buscar por nome, telefone, empresa..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#181C22] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Novo Contato</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#262C36] bg-[#181C22]">
            <Users className="w-8 h-8 text-[#9CA3AF]/40 mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F5F7FA]">
              Nenhum contato encontrado.
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              Envie no WhatsApp: "Salva o contato do Marcelo Silva: 11988887777"
            </p>
          </div>
        ) : (
          filteredContacts.map((c) => {
            const cleanPhone = c.phone.replace(/\D/g, '');
            const waLink = `https://wa.me/${cleanPhone}`;

            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm hover:border-[#384152] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] font-bold text-xs flex items-center justify-center shrink-0">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#F5F7FA] truncate">
                          {c.name}
                        </h4>
                        {(c.role || c.company) && (
                          <div className="text-[11px] text-[#9CA3AF] truncate flex items-center gap-1">
                            {c.role && <span>{c.role}</span>}
                            {c.role && c.company && <span>•</span>}
                            {c.company && <span>{c.company}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 text-[#9CA3AF] hover:text-[#EF4444] rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-[#9CA3AF]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#C7FF3D] shrink-0" />
                      <span className="font-mono text-[11px] text-[#F5F7FA]">{c.phone}</span>
                    </div>

                    {c.notes && (
                      <p className="text-[11px] text-[#9CA3AF] bg-[#0F1115] p-2.5 rounded-xl border border-[#262C36] mt-2 line-clamp-2">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[#262C36] flex items-center justify-between">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#22C55E] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Conversar no WhatsApp</span>
                  </a>

                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Novo Contato */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Contato — URSO JR.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Roberto Vasconcelos"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Telefone / WhatsApp *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 5538991246669"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] font-mono focus:outline-none focus:border-[#C7FF3D] focus:ring-1 focus:ring-[#C7FF3D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Empresa
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex: Stark Industries"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Cargo / Função
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Diretor Financeiro"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Observações / Contexto
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais que ajudam o URSO JR. a lembrar deste contato..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#C7FF3D]"
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
              {isSubmitting ? 'Salvando...' : 'Salvar Contato'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
