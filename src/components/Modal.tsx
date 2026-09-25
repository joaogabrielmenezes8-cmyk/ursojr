import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full ${maxWidth} bg-[#181C22] rounded-2xl border border-[#262C36] shadow-2xl overflow-hidden transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262C36] bg-[#181C22]">
          <h3 className="text-sm font-bold text-[#F5F7FA] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#F5F7FA] rounded-lg hover:bg-[#1E232B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto text-[#F5F7FA]">{children}</div>
      </div>
    </div>
  );
};
