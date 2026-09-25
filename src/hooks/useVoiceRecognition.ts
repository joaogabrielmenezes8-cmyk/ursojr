import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { onResult, lang = 'pt-BR' } = options;
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const hasRecognitionResultRef = useRef(false);

  useEffect(() => {
    const hasSpeech = Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
    const hasMedia = Boolean(navigator?.mediaDevices?.getUserMedia);
    setIsSupported(hasSpeech || hasMedia);
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    setIsListening(false);
  }, []);

  const startListening = useCallback(
    async (onComplete?: (finalText: string) => void) => {
      setError(null);
      setTranscript('');
      hasRecognitionResultRef.current = false;
      audioChunksRef.current = [];

      let microphoneStream: MediaStream | null = null;

      // 1. Iniciar captura de áudio via microfone para fallback com Gemini Flash
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = microphoneStream;

          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/ogg';

          const mediaRecorder = new MediaRecorder(microphoneStream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mediaRecorder.onstop = async () => {
            cleanupStream();

            // Se o Web Speech API já obteve o texto com sucesso, não precisamos transcrever novamente
            if (hasRecognitionResultRef.current) {
              return;
            }

            // Se não houve reconhecimento via Speech API, transcrever o áudio gravado via Gemini Flash
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            if (audioBlob.size > 2000) {
              setIsProcessing(true);
              try {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                  const base64Audio = reader.result as string;
                  try {
                    const res = await fetch('/api/audio/transcribe-and-process', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        base64Audio,
                        mimeType,
                      }),
                    });

                    if (res.ok) {
                      const data = await res.json();
                      const recognized = (data.transcribedText || '').trim();
                      if (recognized) {
                        setTranscript(recognized);
                        if (onResult) onResult(recognized, true);
                        if (onComplete) onComplete(recognized);
                      }
                    }
                  } catch (fetchErr: any) {
                    console.warn('[Gemini Voice Fallback Error]', fetchErr);
                  } finally {
                    setIsProcessing(false);
                  }
                };
              } catch (blobErr) {
                setIsProcessing(false);
              }
            }
          };

          mediaRecorder.start(250);
        }
      } catch (micErr: any) {
        console.warn('[Microphone permission error]', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setError('Permissão de microfone negada pelo navegador.');
          setIsListening(false);
          return;
        }
      }

      // 2. Tentar Web Speech Recognition para transcrição instantânea em tempo real
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = lang;
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          let accumulatedFinal = '';

          recognition.onstart = () => {
            setIsListening(true);
          };

          recognition.onresult = (event: any) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const result = event.results[i];
              const transcriptPart = result[0].transcript;
              if (result.isFinal) {
                accumulatedFinal += (accumulatedFinal ? ' ' : '') + transcriptPart;
              } else {
                currentTranscript += transcriptPart;
              }
            }

            const combined = (accumulatedFinal + (currentTranscript ? ' ' + currentTranscript : '')).trim();
            if (combined) {
              hasRecognitionResultRef.current = true;
              setTranscript(combined);
              if (onResult) {
                onResult(combined, Boolean(accumulatedFinal && !currentTranscript));
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('[Voice Recognition Error]', event.error);
            // Se o Web Speech der erro, não abortar o MediaRecorder para permitir que o Gemini processe o áudio gravado
            if (event.error === 'not-allowed') {
              setError('Permissão de microfone negada no navegador.');
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            if (accumulatedFinal && onComplete) {
              onComplete(accumulatedFinal.trim());
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
          setIsListening(true);
          return;
        } catch (err: any) {
          console.warn('[Speech Recognition Start Error]', err);
        }
      }

      if (mediaRecorderRef.current) {
        setIsListening(true);
      } else {
        setError('Nenhum método de áudio disponível no navegador.');
      }
    },
    [cleanupStream, lang, onResult]
  );

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    setTranscript,
  };
}
