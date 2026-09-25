import React, { useState } from 'react';
import { Smartphone, Copy, Check, Send, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';

interface WhatsAppViewProps {
  profile: UserProfile | null;
  onRefresh: () => void;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ profile, onRefresh }) => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState(profile?.whatsapp_base_url || 'https://api.uazapi.com');
  const [instanceId, setInstanceId] = useState(profile?.whatsapp_instance_id || 'instancia_principal');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '5511998765432');
  const [isSaving, setIsSaving] = useState(false);

  // Test send state
  const [testPhone, setTestPhone] = useState(profile?.phone || '5511998765432');
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste do URSO JR., seu estagiário com IA.');
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  const webhookUrl = `${window.location.origin}/api/webhooks/uazapi`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          instanceId,
          token: token.trim() || undefined,
          phone,
        }),
      });
      if (res.ok) {
        alert('Configurações da Uazapi salvas com sucesso!');
        onRefresh();
      }
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage || isTesting) return;

    setIsTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
        }),
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (err: any) {
      setTestResponse({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Webhook Configuration Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              URL do Webhook para a Instância Uazapi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Copie o endereço abaixo e cole nas configurações de Webhook da sua instância no painel da Uazapi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 select-all"
          />
          <button
            onClick={handleCopyWebhook}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200">Eventos recomendados na Uazapi:</div>
          <p className="text-[11px]">
            Habilite os eventos: <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-900 dark:text-white">messages.upsert</code> ou <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-900 dark:text-white">messages</code>.
            O backend possui sistema de deduplicação automática para evitar re-processamento.
          </p>
        </div>
      </div>

      {/* Instance Settings Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Credenciais da sua Instância Uazapi
        </h3>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base URL da Uazapi *
              </label>
              <input
                type="url"
                required
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.uazapi.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome / ID da Instância *
              </label>
              <input
                type="text"
                required
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="Ex: assessor-pessoal"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Token / API Key da Uazapi
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Deixe em branco para manter o token atual"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Seu Telefone / WhatsApp do Dono *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511998765432 (com DDI e DDD)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {isSaving ? 'Salvando...' : 'Atualizar Credenciais'}
            </button>
          </div>
        </form>
      </div>

      {/* Real Test Send Panel */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-emerald-600" />
          <span>Teste de Disparo Real de Mensagem</span>
        </h3>

        <form onSubmit={handleTestSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número de Destino
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511998765432"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Texto da Mensagem
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Envia uma chamada HTTP POST direta para o endpoint da sua instância Uazapi.
            </span>
            <button
              type="submit"
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Disparando...' : 'Enviar Mensagem Agora'}</span>
            </button>
          </div>
        </form>

        {testResponse && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Resposta do Provedor:
            </div>
            <pre className="p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-[11px] overflow-x-auto text-slate-800 dark:text-slate-200">
              {JSON.stringify(testResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
