import React, { useState } from 'react';
import { googleSignIn } from '../../services/googleAuth';
import { Sparkles, Calendar, CheckSquare, Smartphone, CheckCircle, AlertCircle, LogIn, ChevronRight, Check } from 'lucide-react';
import { UrsoLogo } from '../UrsoLogo';

export const RegisterView: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google account details
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; token: string } | null>(null);

  // Form inputs
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');

  // Bot's WhatsApp number to redirect after registration
  const botPhone = '5538991246669'; // Default fallback

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser({
          name: result.user.displayName || '',
          email: result.user.email || '',
          token: result.accessToken,
        });
        setFullName(result.user.displayName || '');
        setStep(2);
      }
    } catch (err: any) {
      console.error('Registration Google login failed:', err);
      setError(`Falha ao conectar com o Google: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim() || !googleUser) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, insira um número de WhatsApp válido com DDD.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: cleanPhone,
          email: googleUser.email,
          token: googleUser.token,
        }),
      });

      if (res.ok) {
        setStep(3);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao realizar o cadastro.');
      }
    } catch (err: any) {
      console.error('Registration endpoint failed:', err);
      setError(`Erro na comunicação com o servidor: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-[#C7FF3D]/30 selection:text-[#C7FF3D]">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#C7FF3D]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#181C22] border border-[#262C36] shadow-xl relative z-10 space-y-6">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <UrsoLogo size="lg" variant="full" />
          <h2 className="text-sm font-bold text-[#9CA3AF] tracking-wide uppercase mt-1">
            Seja bem-vindo ao URSO JR.!
          </h2>
          <p className="text-xs text-[#9CA3AF] max-w-xs">
            Seu estagiário de IA para organizar sua agenda, tarefas e rotina pelo WhatsApp de forma automática.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                step === s
                  ? 'w-8 bg-[#C7FF3D]'
                  : step > s
                  ? 'w-4 bg-[#C7FF3D]/40'
                  : 'w-4 bg-[#262C36]'
              }`}
            />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* -------------------- STEP 1: GOOGLE CONNECT -------------------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#0F1115] border border-[#262C36] flex items-center justify-center mx-auto text-[#C7FF3D]">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#F5F7FA]">Passo 1: Conecte sua Conta Google</h3>
                <p className="text-xs text-[#9CA3AF]">
                  Isso permite ao URSO JR. sincronizar sua agenda e tarefas automaticamente com seu celular.
                </p>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full gsi-material-button flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-gray-100 text-[#0F1115] font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isLoading ? 'Conectando...' : 'Conectar com E-mail Google'}</span>
            </button>

            <div className="flex flex-col gap-2 pt-2 text-[10px] text-[#9CA3AF] text-center border-t border-[#262C36]">
              <span className="font-semibold text-white uppercase tracking-wider">Por que o Google?</span>
              <p>Habilita a sincronização do Google Agenda e do Google Tasks em tempo real com os comandos de voz do WhatsApp.</p>
            </div>
          </div>
        )}

        {/* -------------------- STEP 2: PHONE & PROFILE DETAILS -------------------- */}
        {step === 2 && googleUser && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5 text-center">
              <h3 className="text-sm font-bold text-[#F5F7FA]">Passo 2: Perfil do WhatsApp</h3>
              <p className="text-xs text-[#9CA3AF]">
                Informe o número de telefone que você utilizará para mandar mensagens ao URSO JR.
              </p>
            </div>

            {/* Google Profile Badge */}
            <div className="p-3 rounded-xl bg-[#0F1115] border border-[#262C36] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C7FF3D]/10 text-[#C7FF3D] font-bold text-xs flex items-center justify-center">
                {googleUser.name ? googleUser.name.charAt(0).toUpperCase() : googleUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F5F7FA] truncate">{googleUser.name}</div>
                <div className="text-[10px] text-[#9CA3AF] font-mono truncate">{googleUser.email}</div>
              </div>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-[#22C55E] font-semibold">
                <Check className="w-3.5 h-3.5" />
                Conectado
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Seu Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome para a IA falar com você"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Número do seu WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 38 99124-6669 (apenas números)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
                />
                <span className="block text-[10px] text-[#9CA3AF] mt-1 leading-normal">
                  ⚠️ Importante: É por esse número que o URSO JR. irá reconhecer a sua voz e comandos. Não adicione o sinal de +.
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !phone.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-4"
            >
              <span>{isLoading ? 'Processando Cadastro...' : 'Concluir Cadastro'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* -------------------- STEP 3: REGISTRATION COMPLETED -------------------- */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center mx-auto text-[#22C55E]">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#F5F7FA]">Cadastro Realizado!</h3>
                <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto">
                  Sua conta foi vinculada e a sincronização com o Google Agenda e Google Tasks já está ativa.
                </p>
              </div>
            </div>

            {/* Steps on how to use */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] text-left space-y-3 text-xs leading-normal">
              <div className="font-bold text-[#F5F7FA] border-b border-[#262C36] pb-1.5 text-[11px] uppercase tracking-wide text-[#C7FF3D]">
                Próximos Passos:
              </div>
              <div className="flex gap-2.5">
                <span className="font-mono text-[#C7FF3D] font-black shrink-0">1.</span>
                <p className="text-[#9CA3AF]">
                  Clique no botão abaixo para abrir o chat do **URSO JR.** no seu WhatsApp.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-mono text-[#C7FF3D] font-black shrink-0">2.</span>
                <p className="text-[#9CA3AF]">
                  Mande uma mensagem dizendo: **"Olá! O que eu tenho para hoje?"** ou grave um áudio.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-mono text-[#C7FF3D] font-black shrink-0">3.</span>
                <p className="text-[#9CA3AF]">
                  O URSO JR. responderá chamando você pelo seu nome e lendo a sua agenda oficial do Google!
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${botPhone}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#22C55E] hover:bg-green-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Iniciar Conversa no WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
