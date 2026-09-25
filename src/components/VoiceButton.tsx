import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface VoiceButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoSubmitOnStop?: boolean;
  onAutoSubmit?: (finalText: string) => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  onListeningChange,
  className = '',
  size = 'md',
  autoSubmitOnStop = false,
  onAutoSubmit,
}) => {
  const { isListening, isProcessing, transcript, error, isSupported, startListening, stopListening } =
    useVoiceRecognition({
      onResult: (text, isFinal) => {
        onTranscript(text, isFinal);
      },
    });

  React.useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening || isProcessing);
    }
  }, [isListening, isProcessing, onListeningChange]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      stopListening();
    } else if (!isProcessing) {
      startListening((finalText) => {
        if (autoSubmitOnStop && onAutoSubmit && finalText.trim()) {
          onAutoSubmit(finalText.trim());
        }
      });
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        title={
          isProcessing
            ? 'Processando e transcrevendo áudio com IA...'
            : !isSupported
            ? 'Reconhecimento de voz não suportado neste navegador'
            : isListening
            ? 'Clique para parar de falar'
            : 'Falar comando por voz'
        }
        className={`rounded-xl transition-all flex items-center justify-center gap-1.5 font-medium select-none ${
          isProcessing
            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 cursor-wait'
            : isListening
            ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/30'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
        } ${sizeClasses} ${className}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className={`${iconSizes} animate-spin text-white`} />
            <span className="text-[11px] font-semibold pr-1">Transcrevendo...</span>
          </>
        ) : isListening ? (
          <>
            <Mic className={`${iconSizes} text-white animate-bounce`} />
            <span className="text-[11px] font-semibold pr-1">Gravando...</span>
          </>
        ) : (
          <Mic className={`${iconSizes}`} />
        )}
      </button>

      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 px-2 py-1 bg-rose-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};
