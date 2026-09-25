import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Database,
  Copy,
  Check,
  Calendar,
  CheckSquare,
  RefreshCw,
  LogOut,
  LogIn,
  AlertTriangle,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Smartphone,
  Send,
  Radio,
  CheckCircle2,
  Activity,
  Bot,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { UserProfile, GoogleWorkspaceConfig } from '../../types';
import { googleSignIn, reconnectGoogle, disconnectGoogle } from '../../services/googleAuth';
import { Modal } from '../Modal';
import { VoiceButton } from '../VoiceButton';

interface SettingsViewProps {
  profile: UserProfile | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'integrations' | 'household' | 'whatsapp' | 'durations' | 'profile' | 'sql'>('household');

  // Household / Multi-User state
  const [householdProfiles, setHouseholdProfiles] = useState<UserProfile[]>([]);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberTime, setNewMemberTime] = useState('07:30');
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [householdSimPhone, setHouseholdSimPhone] = useState('');
  const [householdSimText, setHouseholdSimText] = useState('O que eu tenho para hoje?');
  const [isTestingHouseholdSim, setIsTestingHouseholdSim] = useState(false);
  const [householdSimResult, setHouseholdSimResult] = useState<any>(null);

  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || 'João Gabriel');
  const [phone, setPhone] = useState(profile?.phone || '553898362184');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Sao_Paulo');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // WhatsApp / Uazapi state
  const [whatsappBaseUrl, setWhatsappBaseUrl] = useState(profile?.whatsapp_base_url || 'https://bearcontrol.uazapi.com');
  const [whatsappToken, setWhatsappToken] = useState(profile?.whatsapp_token || '120cce91-b19a-4857-a031-9a589c399ef4');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState(profile?.whatsapp_instance_id || 'b3r');
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testPhone, setTestPhone] = useState(profile?.phone || '553898362184');
  const [testMsgText, setTestMsgText] = useState('Olá! Esta é uma mensagem de teste do URSO JR.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<any>(null);

  // Webhook Events state
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [isLoadingWebhookEvents, setIsLoadingWebhookEvents] = useState(false);
  const [isTestingIncoming, setIsTestingIncoming] = useState(false);
  const [inboundTestPrompt, setInboundTestPrompt] = useState('Crie uma tarefa: Comprar pão de queijo amanhã de manhã');
  const [testIncomingResult, setTestIncomingResult] = useState<any>(null);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [syncWebhookResult, setSyncWebhookResult] = useState<any>(null);
  const [sseStatus, setSseStatus] = useState<any>(null);
  const [isRestartingSse, setIsRestartingSse] = useState(false);

  // Google state
  const [googleConfig, setGoogleConfig] = useState<GoogleWorkspaceConfig>({
    connected: false,
    hasToken: false,
    scopes: [],
    services: { calendar: true, tasks: true },
    defaultDurations: {
      meeting: 60,
      consultation: 60,
      call: 30,
      workout: 90,
      generic: 60,
    },
  });
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  // Durations form
  const [durations, setDurations] = useState({
    meeting: 60,
    consultation: 60,
    call: 30,
    workout: 90,
    generic: 60,
  });
  const [isSavingDurations, setIsSavingDurations] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRegisterLink, setCopiedRegisterLink] = useState(false);

  // Fetch Google Status
  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleConfig(data);
        if (data.defaultDurations) {
          setDurations(data.defaultDurations);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Google status:', err);
    }
  };

  // Fetch WhatsApp Status
  const fetchWhatsappStatus = async () => {
    setIsTestingWhatsapp(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch WhatsApp status:', err);
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  const fetchSseStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/sse-status');
      if (res.ok) {
        const data = await res.json();
        setSseStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch SSE status:', err);
    }
  };

  const handleRestartSse = async () => {
    setIsRestartingSse(true);
    try {
      const res = await fetch('/api/whatsapp/sse-restart', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSseStatus(data.status);
        alert('Conexão em tempo real (SSE) reiniciada com sucesso!');
      }
    } catch (err: any) {
      alert(`Erro ao reiniciar SSE: ${err.message}`);
    } finally {
      setIsRestartingSse(false);
    }
  };

  const fetchHouseholdProfiles = async () => {
    setIsLoadingHousehold(true);
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setHouseholdProfiles(data);
        if (data.length > 0 && !householdSimPhone) {
          setHouseholdSimPhone(data[0].phone);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch household profiles:', err);
    } finally {
      setIsLoadingHousehold(false);
    }
  };

  useEffect(() => {
    fetchGoogleStatus();
    fetchWhatsappStatus();
    fetchSseStatus();
    fetchWebhookEvents();
    fetchHouseholdProfiles();
    const timer = setInterval(() => {
      fetchSseStatus();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveWhatsappConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsapp(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: whatsappBaseUrl,
          token: whatsappToken,
          instanceId: whatsappInstanceId,
        }),
      });
      if (res.ok) {
        alert('Configurações do WhatsApp/Uazapi salvas com sucesso!');
        await fetchWhatsappStatus();
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error || 'Falha na requisição'}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const fetchWebhookEvents = async () => {
    setIsLoadingWebhookEvents(true);
    try {
      const res = await fetch('/api/webhooks/events');
      if (res.ok) {
        const data = await res.json();
        setWebhookEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch webhook events:', err);
    } finally {
      setIsLoadingWebhookEvents(false);
    }
  };

  const handleTestIncoming = async (customPrompt?: string) => {
    setIsTestingIncoming(true);
    setTestIncomingResult(null);
    const promptToSend = customPrompt || inboundTestPrompt || 'Crie uma tarefa: Comprar pão de queijo amanhã de manhã';
    try {
      const res = await fetch('/api/webhooks/test-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone || '5538991246669',
          text: promptToSend,
        }),
      });
      const data = await res.json();
      setTestIncomingResult(data);
      await fetchWebhookEvents();
      onRefresh();
    } catch (err: any) {
      setTestIncomingResult({ error: err.message });
    } finally {
      setIsTestingIncoming(false);
    }
  };

  const handleSyncWebhook = async () => {
    setIsSyncingWebhook(true);
    setSyncWebhookResult(null);
    try {
      const res = await fetch('/api/whatsapp/sync-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      setSyncWebhookResult(data);
      if (data.success) {
        alert('✓ Webhook registrado e ativado com sucesso na sua instância da Uazapi!');
      } else {
        alert(`Aviso: ${data.error || 'A Uazapi retornou erro ao registrar via API. Verifique a URL manualmente.'}`);
      }
    } catch (err: any) {
      alert(`Erro na sincronização: ${err.message}`);
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMsgText) return;
    setIsSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await fetch('/api/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMsgText,
        }),
      });
      const data = await res.json();
      setTestSendResult(data);
      if (data.success) {
        alert(data.simulated ? 'Disparo em modo simulação (defina Base URL e Token reais da Uazapi para entrega real).' : 'Mensagem enviada com sucesso para o WhatsApp!');
      } else {
        alert(`Erro no envio: ${data.error || 'Verifique as credenciais da instância'}`);
      }
    } catch (err: any) {
      alert(`Erro de conexão: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/uazapi`
    : 'https://sua-url.run.app/api/webhooks/uazapi';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleConnectGoogle = async () => {
    setIsLoadingGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        await fetchGoogleStatus();
        onRefresh();
      }
    } catch (err: any) {
      alert(`Falha na autenticação Google: ${err.message || err}`);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleReconnectGoogle = async () => {
    setIsLoadingGoogle(true);
    try {
      const result = await reconnectGoogle();
      if (result) {
        await fetchGoogleStatus();
        onRefresh();
      }
    } catch (err: any) {
      alert(`Falha ao reconectar Google: ${err.message || err}`);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsLoadingGoogle(true);
    try {
      await disconnectGoogle();
      setIsDisconnectModalOpen(false);
      await fetchGoogleStatus();
      onRefresh();
    } catch (err: any) {
      alert(`Falha ao desconectar Google: ${err.message || err}`);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await fetchGoogleStatus();
        onRefresh();
        alert('Sincronização bidirecional com Google Calendar e Google Tasks concluída com sucesso!');
      } else {
        alert(`Erro na sincronização: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Erro na sincronização: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDurations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDurations(true);
    try {
      const res = await fetch('/api/google/durations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(durations),
      });
      if (res.ok) {
        alert('Durações padrão da IA salvas com sucesso!');
        await fetchGoogleStatus();
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSavingDurations(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          timezone,
        }),
      });
      alert('Perfil atualizado com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      alert('Nome e número de WhatsApp são obrigatórios!');
      return;
    }
    setIsSavingMember(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newMemberName.trim(),
          phone: newMemberPhone.replace(/\D/g, ''),
          daily_summary_time: newMemberTime || '07:30',
        }),
      });
      if (res.ok) {
        setIsAddMemberModalOpen(false);
        setNewMemberName('');
        setNewMemberPhone('');
        await fetchHouseholdProfiles();
        alert('Membro da casa cadastrado com sucesso!');
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error || 'Falha ao cadastrar membro'}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o perfil de "${name}"? Suas tarefas e eventos não serão mais vinculados.`)) return;
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchHouseholdProfiles();
        alert(`Perfil de "${name}" removido.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao remover perfil');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleTestHouseholdSim = async () => {
    if (!householdSimPhone || !householdSimText.trim()) return;
    setIsTestingHouseholdSim(true);
    setHouseholdSimResult(null);
    try {
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: householdSimPhone,
          text: householdSimText,
        }),
      });
      const data = await res.json();
      setHouseholdSimResult(data);
    } catch (err: any) {
      setHouseholdSimResult({ error: err.message });
    } finally {
      setIsTestingHouseholdSim(false);
    }
  };

  const sqlSchema = `-- Schema PostgreSQL / Supabase com Google Workspace Canônico

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  whatsapp_instance_id VARCHAR(100),
  daily_summary_time VARCHAR(5) DEFAULT '07:00',
  daily_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Tasks como fonte canônica de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  google_task_id VARCHAR(255),
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Calendar como fonte canônica de compromissos
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'confirmed',
  google_event_id VARCHAR(255),
  html_link TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  recurrence_rule VARCHAR(50) DEFAULT 'none',
  status VARCHAR(20) DEFAULT 'pending',
  delivery_status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(100),
  role VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'preference',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Subtab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#181C22] border border-[#262C36] flex-wrap">
        <button
          onClick={() => setActiveSubTab('household')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'household'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#C7FF3D]" />
          <span>Perfis & Família</span>
          {householdProfiles.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-[#C7FF3D]/15 text-[#C7FF3D] border border-[#C7FF3D]/30">
              {householdProfiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('integrations')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'integrations'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#C7FF3D]" />
          <span>Integrações (Google)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'whatsapp'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>WhatsApp & Webhook</span>
        </button>

        <button
          onClick={() => setActiveSubTab('durations')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'durations'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Durações da Agenda</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span>Perfil & Fuso</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sql')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'sql'
              ? 'bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] shadow-xs'
              : 'text-[#9CA3AF] hover:text-[#F5F7FA]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>Schema SQL</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 0. PERFIS & FAMÍLIA (MULTI-USUÁRIO NA MESMA INSTÂNCIA) */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'household' && (
        <div className="space-y-6">
          {/* Header & Flow Explanation Card */}
          <div className="p-6 rounded-2xl bg-[#181C22] text-[#F5F7FA] shadow-md border border-[#262C36] relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F1115] border border-[#262C36] flex items-center justify-center text-[#C7FF3D]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5F7FA] flex items-center gap-2">
                      Multi-Usuário: Pessoas da Sua Casa
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#C7FF3D]/15 text-[#C7FF3D] border border-[#C7FF3D]/30">
                        Instância b3r
                      </span>
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Cada membro cadastrado pode mandar mensagem para o mesmo WhatsApp e ter o URSO JR. atendendo individualmente.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Adicionar Pessoa da Casa
                </button>
              </div>

              {/* Architecture Explanation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36]">
                  <div className="font-bold text-[#F5F7FA] flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#22C55E]" />
                    1. Envio Direto
                  </div>
                  <p className="mt-1 text-[#9CA3AF] text-[11px] leading-relaxed">
                    Você, sua família ou sócios mandam áudio ou texto do seu próprio WhatsApp para o número da instância b3r.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36]">
                  <div className="font-bold text-[#F5F7FA] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#C7FF3D]" />
                    2. Reconhecimento Automático
                  </div>
                  <p className="mt-1 text-[#9CA3AF] text-[11px] leading-relaxed">
                    O URSO JR. lê o número do remetente, identifica quem está falando e chama a pessoa pelo nome próprio em cada resposta.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36]">
                  <div className="font-bold text-[#F5F7FA] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                    3. Contexto 100% Isolado
                  </div>
                  <p className="mt-1 text-[#9CA3AF] text-[11px] leading-relaxed">
                    Tarefas, agenda, lembretes e notas ficam separados por pessoa. Suas pendências nunca se misturam com as dos outros!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Compartilhar Link de Cadastro Card */}
          <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F1115] border border-[#262C36] text-[#C7FF3D] flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#F5F7FA]">Link de Cadastro Rápido (Google + WhatsApp)</h4>
                <p className="text-xs text-[#9CA3AF]">
                  Compartilhe este link com familiares ou membros da equipe. Ao clicar, eles poderão se cadastrar e autorizar a sincronização com o Google Agenda e Google Tasks instantaneamente!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/cadastro` : 'https://ursojr.app/cadastro'}
                className="flex-1 text-xs font-mono p-2.5 rounded-xl border border-[#262C36] bg-[#0F1115] text-[#C7FF3D] focus:outline-none"
              />
              <button
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/cadastro` : 'https://ursojr.app/cadastro';
                  navigator.clipboard.writeText(url);
                  setCopiedRegisterLink(true);
                  setTimeout(() => setCopiedRegisterLink(false), 2000);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedRegisterLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262C36]">
              <div>
                <h4 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#C7FF3D]" />
                  Membros Cadastrados na Casa ({householdProfiles.length})
                </h4>
                <p className="text-xs text-[#9CA3AF]">
                  Números autorizados a interagir com o URSO JR. de forma personalizada
                </p>
              </div>

              <button
                onClick={fetchHouseholdProfiles}
                disabled={isLoadingHousehold}
                className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#0F1115] border border-transparent hover:border-[#262C36] transition-colors cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHousehold ? 'animate-spin text-[#C7FF3D]' : ''}`} />
              </button>
            </div>

            {householdProfiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF]">
                Nenhum membro carregado. Clique em atualizar ou adicione um novo perfil.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {householdProfiles.map((p) => {
                  const isRoot = p.id === 'user_default';
                  const initials = p.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-[#262C36] bg-[#0F1115] flex items-start justify-between gap-3 hover:border-[#384152] transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#181C22] border border-[#262C36] text-[#C7FF3D] font-bold text-sm flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#F5F7FA] text-xs">
                              {p.full_name}
                            </span>
                            {isRoot ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF3D]/15 text-[#C7FF3D] border border-[#C7FF3D]/30">
                                Titular
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#181C22] text-[#9CA3AF] border border-[#262C36]">
                                Membro
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 font-mono">
                            <Smartphone className="w-3 h-3 text-[#22C55E]" />
                            +{p.phone}
                          </div>

                          <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#F59E0B]" />
                            Resumo matinal: {p.daily_summary_time || '07:30'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setHouseholdSimPhone(p.phone);
                            setHouseholdSimText(`Olá URSO JR.! O que eu tenho para hoje?`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] text-[#C7FF3D] hover:bg-[#181C22] font-semibold transition-colors cursor-pointer"
                          title="Simular mensagem deste membro"
                        >
                          Simular
                        </button>

                        {!isRoot && (
                          <button
                            onClick={() => handleDeleteMember(p.id, p.full_name)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#181C22] transition-colors cursor-pointer"
                            title="Remover perfil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Household Simulator Box */}
          <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262C36]">
              <div>
                <h4 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7FF3D]" />
                  Testador de Identificação de Usuário — URSO JR.
                </h4>
                <p className="text-xs text-[#9CA3AF]">
                  Veja como o URSO JR. responde sob medida dependendo de qual pessoa da casa está falando
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Membro falando:
                </label>
                <select
                  value={householdSimPhone}
                  onChange={(e) => setHouseholdSimPhone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D] cursor-pointer"
                >
                  {householdProfiles.map((p) => (
                    <option key={p.id} value={p.phone}>
                      {p.full_name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Mensagem que ele(a) enviaria no WhatsApp:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={householdSimText}
                    onChange={(e) => setHouseholdSimText(e.target.value)}
                    placeholder="Ex: Anota comprar café / Marcar reunião amanhã às 14h"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
                  />
                  <button
                    onClick={handleTestHouseholdSim}
                    disabled={isTestingHouseholdSim}
                    className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTestingHouseholdSim ? 'animate-pulse' : ''}`} />
                    Testar
                  </button>
                </div>
              </div>
            </div>

            {householdSimResult && (
              <div className="mt-3 p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                  <span className="font-semibold text-[#C7FF3D]">
                    Resposta Gerada pelo URSO JR. para {householdProfiles.find((p) => p.phone.endsWith(householdSimPhone.slice(-8)))?.full_name || 'Usuário'}:
                  </span>
                  <span className="font-mono">Ferramenta: {householdSimResult.agentResult?.toolCalled || 'conversa'}</span>
                </div>
                <div className="p-3 bg-[#181C22] rounded-lg border border-[#262C36] text-[#F5F7FA] whitespace-pre-line leading-relaxed font-mono">
                  {householdSimResult.assistantMessage?.text || householdSimResult.error || JSON.stringify(householdSimResult)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. INTEGRAÇÕES: GOOGLE WORKSPACE (CALENDAR + TASKS) */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-6">
            {/* Header Google */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262C36]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0F1115] border border-[#262C36] flex items-center justify-center shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F7FA] flex items-center gap-2">
                    <span>Google Workspace</span>
                    {googleConfig.connected && googleConfig.hasToken && !googleConfig.tokenExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        Conectado
                      </span>
                    ) : googleConfig.tokenExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                        Token Expirado (Reconectar)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                        Não conectado
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    {googleConfig.tokenExpired
                      ? 'Sua sessão OAuth Google expirou. Clique em Reconectar para renovar o acesso ao Calendar e Tasks.'
                      : 'Fonte canônica para agendamentos e tarefas sincronizadas pelo URSO JR.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {googleConfig.connected && !googleConfig.tokenExpired ? (
                  <>
                    <button
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-xl border border-[#262C36] text-xs font-semibold bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C7FF3D]' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>

                    <button
                      onClick={handleReconnectGoogle}
                      disabled={isLoadingGoogle}
                      className="px-3 py-1.5 rounded-xl border border-[#262C36] text-xs font-semibold bg-[#0F1115] text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1E232B] transition-colors cursor-pointer"
                    >
                      Reconectar
                    </button>

                    <button
                      onClick={() => setIsDisconnectModalOpen(true)}
                      disabled={isLoadingGoogle}
                      className="px-3 py-1.5 rounded-xl border border-[#EF4444]/30 text-xs font-semibold bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReconnectGoogle}
                    disabled={isLoadingGoogle}
                    className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isLoadingGoogle ? 'Conectando...' : googleConfig.tokenExpired ? 'Reconectar Google' : 'Conectar Conta Google'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0F1115] border border-[#262C36] text-xs">
              <div>
                <span className="text-[#9CA3AF] block font-medium mb-0.5">Conta Google conectada:</span>
                <span className="font-semibold text-[#F5F7FA] font-mono text-[13px]">
                  {googleConfig.email || (googleConfig.connected ? 'Conta autenticada' : 'Nenhuma conta conectada')}
                </span>
              </div>

              <div>
                <span className="text-[#9CA3AF] block font-medium mb-0.5">Última sincronização:</span>
                <span className="text-[#F5F7FA] font-mono">
                  {googleConfig.lastSyncAt
                    ? new Date(googleConfig.lastSyncAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    : 'Aguardando sincronização inicial'}
                </span>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Serviços Habilitados
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Google Calendar */}
                <div className="p-3.5 rounded-xl border border-[#262C36] bg-[#0F1115] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#181C22] text-[#4285F4] flex items-center justify-center shrink-0 border border-[#262C36]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#F5F7FA]">Google Calendar</span>
                      <span className="text-[10px] font-mono font-bold text-[#22C55E]">✓ ATIVO</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Fonte canônica dos compromissos e agendamentos executivos com detecção de conflitos de horário.
                    </p>
                  </div>
                </div>

                {/* Google Tasks */}
                <div className="p-3.5 rounded-xl border border-[#262C36] bg-[#0F1115] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#181C22] text-[#22C55E] flex items-center justify-center shrink-0 border border-[#262C36]">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#F5F7FA]">Google Tasks</span>
                      <span className="text-[10px] font-mono font-bold text-[#22C55E]">✓ ATIVO</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Fonte canônica de afazeres, prazos e tarefas com sincronização bidirecional em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Real OAuth */}
            <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36] text-xs text-[#9CA3AF] flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#C7FF3D] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#F5F7FA]">Autorização OAuth 2.0 Segura:</span> Seus tokens são negociados de forma direta através da Google Cloud Platform e sincronizados com o motor da IA para que o URSO JR. execute comandos do WhatsApp diretamente na sua conta do Google.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. WHATSAPP & WEBHOOK UAZAPI */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-6">
            {/* Header WhatsApp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262C36]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0F1115] text-[#22C55E] border border-[#262C36] flex items-center justify-center shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F7FA] flex items-center gap-2">
                    <span>Instância WhatsApp (Uazapi / Evolution API)</span>
                    {whatsappStatus?.connected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                        Conectado ({whatsappStatus.number || whatsappStatus.instanceId || 'Ativo'})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                        {whatsappStatus?.configured ? 'Aguardando Leitura QR / Conexão' : 'Credenciais Pendentes'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Conexão que recebe seus áudios e mensagens de texto e envia as respostas do URSO JR.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchWhatsappStatus}
                  disabled={isTestingWhatsapp}
                  className="px-3.5 py-2 rounded-xl border border-[#262C36] text-xs font-semibold bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingWhatsapp ? 'animate-spin text-[#C7FF3D]' : ''}`} />
                  <span>{isTestingWhatsapp ? 'Checando...' : 'Testar Conexão'}</span>
                </button>
              </div>
            </div>

            {/* Checklist: O que falta para operar */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                Checklist para a Instância Operar no seu WhatsApp
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                    whatsappStatus?.configured ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  }`}>
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-[#F5F7FA]">Credenciais Uazapi Salvas: </span>
                    <span className="text-[#9CA3AF]">
                      Informe a Base URL, o Nome da Instância e o Token da API nos campos abaixo e clique em Salvar.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                    whatsappStatus?.connected ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#181C22] text-[#9CA3AF]'
                  }`}>
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-[#F5F7FA]">QR Code Conectado na Uazapi: </span>
                    <span className="text-[#9CA3AF]">
                      O número do WhatsApp da instância precisa estar com status <code className="font-mono text-[#22C55E] font-bold">open / connected</code> no painel da sua Uazapi.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 bg-[#C7FF3D]/20 text-[#C7FF3D]">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-[#F5F7FA]">Webhook Cadastrado na Uazapi: </span>
                    <span className="text-[#9CA3AF]">
                      No painel da Uazapi da sua instância, configure o Webhook apontando para a URL oficial abaixo com o evento <code className="font-mono font-bold text-[#F5F7FA]">messages.upsert</code> habilitado.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                    googleConfig.connected && googleConfig.hasToken ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  }`}>
                    4
                  </div>
                  <div>
                    <span className="font-semibold text-[#F5F7FA]">Google Workspace Conectado: </span>
                    <span className="text-[#9CA3AF]">
                      {googleConfig.connected ? '✓ Google Calendar e Tasks conectados.' : 'Conecte sua conta na aba "Integrações (Google)" para que os eventos e tarefas criados no WhatsApp sincronizem na sua agenda oficial.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SSE Real-Time Stream Status Box */}
            <div className={`p-4 rounded-xl border space-y-2 transition-all ${
              sseStatus?.isConnected
                ? 'bg-[#0F1115] border-[#22C55E]/40'
                : 'bg-[#0F1115] border-[#F59E0B]/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${sseStatus?.isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'}`} />
                  <span className="text-xs font-bold text-[#F5F7FA] flex items-center gap-1.5">
                    Stream Contínuo em Tempo Real (SSE):
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    sseStatus?.isConnected
                      ? 'bg-[#22C55E]/15 text-[#22C55E]'
                      : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  }`}>
                    {sseStatus?.isConnected ? 'Conectado e Ouvindo' : 'Reconectando...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRestartSse}
                  disabled={isRestartingSse}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#181C22] hover:bg-[#1E232B] text-[#F5F7FA] font-semibold text-xs border border-[#262C36] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestartingSse ? 'animate-spin text-[#C7FF3D]' : ''}`} />
                  <span>{isRestartingSse ? 'Reconectando...' : 'Reconectar Stream'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                O URSO JR. mantém uma conexão contínua direta com o servidor da sua Uazapi (<code className="font-mono text-xs text-[#F5F7FA]">{sseStatus?.endpoint || 'https://bearcontrol.uazapi.com/sse'}</code>). Cada mensagem que você envia para o robô é recebida instantaneamente em milissegundos sem depender de túneis ou portas abertas.
              </p>
              {sseStatus?.lastEventAt && (
                <div className="text-[10px] text-[#9CA3AF] flex items-center gap-3 pt-0.5 font-mono">
                  <span>Eventos recebidos: {sseStatus.eventCount}</span>
                  <span>Último pulso: {new Date(sseStatus.lastEventAt).toLocaleTimeString('pt-BR')}</span>
                </div>
              )}
            </div>

            {/* Webhook URL Box */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F5F7FA] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#C7FF3D]" />
                  URL do Webhook Oficial:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncWebhook}
                    disabled={isSyncingWebhook}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181C22] hover:bg-[#1E232B] text-[#F5F7FA] font-semibold text-xs border border-[#262C36] transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWebhook ? 'animate-spin text-[#C7FF3D]' : ''}`} />
                    <span>{isSyncingWebhook ? 'Configurando...' : 'Ativar na Uazapi'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#181C22] border border-[#262C36] font-mono text-xs text-[#F5F7FA] break-all select-all">
                {webhookUrl}
              </div>

              <p className="text-[11px] text-[#9CA3AF]">
                👉 No painel da Uazapi: acesse <strong>Webhooks</strong> da instância, insira esta URL no campo <strong>URL</strong>, marque o evento <strong>messages.upsert</strong> e deixe o status como <strong>Ativo</strong>.
              </p>
            </div>

            {/* Credenciais Form */}
            <form onSubmit={handleSaveWhatsappConfig} className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Credenciais da sua Instância Uazapi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                    Base URL da API Uazapi *
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.uazapi.com ou https://sua-vps.com"
                    value={whatsappBaseUrl}
                    onChange={(e) => setWhatsappBaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                  />
                  <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                    A URL base do seu servidor ou provedor da Uazapi (sem barra no final).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                    Nome / ID da Instância *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: ursojr_assessoria ou b3r"
                    value={whatsappInstanceId}
                    onChange={(e) => setWhatsappInstanceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                    Instance Token (Token da Instância) *
                  </label>
                  <input
                    type="password"
                    placeholder="ex: 120cce91-b19a-4857-a031-9a589c399ef4"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                  />
                  <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                    Utilize o <strong>Instance Token</strong> da instância (não o Admin Token geral).
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingWhatsapp}
                  className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingWhatsapp ? 'Salvando...' : 'Salvar Credenciais da Instância'}</span>
                </button>
              </div>
            </form>

            {/* Test Send Box */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA] flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-[#C7FF3D]" />
                Testar Envio de Mensagem para o seu Celular
              </h4>
              <p className="text-[11px] text-[#9CA3AF]">
                Dispare uma mensagem de teste agora para validar se a sua instância consegue entregar mensagens no seu WhatsApp.
              </p>

              <form onSubmit={handleSendTestMessage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seu Número WhatsApp (com DDI 55 + DDD)
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="5538991246669"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                  {(() => {
                    const clean = (testPhone || '').replace(/\D/g, '');
                    if (!clean) {
                      return (
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Formato: 55 + DDD + 9 dígitos (ex: 5538991246669)
                        </span>
                      );
                    }
                    if (clean.length === 13 && clean.startsWith('55')) {
                      return (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
                          ✓ Formatado: +55 ({clean.substring(2, 4)}) {clean.substring(4, 9)}-{clean.substring(9)}
                        </span>
                      );
                    }
                    if (clean.length === 11 && clean.startsWith('55') && clean.charAt(2) === '9') {
                      return (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">
                          ⚠️ Faltou o DDD! O sistema enviará automaticamente com DDD 38: +55 (38) {clean.substring(2, 7)}-{clean.substring(7)}
                        </span>
                      );
                    }
                    if (clean.length === 11) {
                      return (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 block">
                          ✓ DDI adicionado: +55 ({clean.substring(0, 2)}) {clean.substring(2, 7)}-{clean.substring(7)}
                        </span>
                      );
                    }
                    if (clean.length === 12 && clean.startsWith('538')) {
                      return (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 block">
                          ✓ DDI corrigido: +55 (38) {clean.substring(3, 8)}-{clean.substring(8)}
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Exemplo: 5538991246669 (55 + DDD + número)
                      </span>
                    );
                  })()}
                </div>

                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Texto da Mensagem
                    </label>
                    <input
                      type="text"
                      value={testMsgText}
                      onChange={(e) => setTestMsgText(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingTest}
                    className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
                    <span>{isSendingTest ? 'Enviando...' : 'Enviar Teste'}</span>
                  </button>
                </div>
              </form>

              {testSendResult && (
                <div className={`p-3 rounded-xl text-xs font-mono mt-2 ${
                  testSendResult.success ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30' : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                }`}>
                  Resultado: {JSON.stringify(testSendResult)}
                </div>
              )}
            </div>

            {/* Inbound Webhook Diagnostics & Test */}
            <div className="p-4 rounded-xl bg-[#0F1115] border border-[#262C36] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#C7FF3D]" />
                    Console de Teste da IA & Criação de Tarefas/Agenda
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    Digite qualquer comando ou pedido em linguagem natural para validar como o URSO JR. processa, executa a ação e responde no seu WhatsApp.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchWebhookEvents}
                    disabled={isLoadingWebhookEvents}
                    className="p-1.5 px-2.5 rounded-xl border border-[#262C36] hover:bg-[#181C22] text-[#9CA3AF] hover:text-[#F5F7FA] text-xs flex items-center gap-1 cursor-pointer"
                    title="Atualizar Logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhookEvents ? 'animate-spin text-[#C7FF3D]' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>

              {/* Interactive prompt input and quick suggestions */}
              <div className="p-4 rounded-xl bg-[#181C22] border border-[#262C36] space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1.5 flex items-center justify-between">
                    <span>Mensagem de Teste (o que você pediria no WhatsApp):</span>
                    <span className="text-[10px] text-[#C7FF3D] font-mono">Destino: {testPhone || '5538991246669'}</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <VoiceButton
                      onTranscript={(text) => {
                        setInboundTestPrompt(text);
                      }}
                      onAutoSubmit={(finalText) => {
                        setInboundTestPrompt(finalText);
                        handleTestIncoming(finalText);
                      }}
                      autoSubmitOnStop={true}
                      size="sm"
                    />
                    <input
                      type="text"
                      value={inboundTestPrompt}
                      onChange={(e) => setInboundTestPrompt(e.target.value)}
                      placeholder="Ex: Crie uma tarefa: Revisar contratos amanhã às 10h"
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestIncoming()}
                      disabled={isTestingIncoming || !inboundTestPrompt.trim()}
                      className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] disabled:opacity-50 text-[#0F1115] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Bot className={`w-3.5 h-3.5 ${isTestingIncoming ? 'animate-spin' : ''}`} />
                      <span>{isTestingIncoming ? 'Processando...' : 'Testar Pedido'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick chip buttons */}
                <div>
                  <span className="text-[10px] font-semibold text-[#9CA3AF] block mb-1.5">
                    Sugestões de teste rápido (clique para testar):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const txt = 'Crie uma tarefa: Comprar café torrado amanhã às 10h';
                        setInboundTestPrompt(txt);
                        handleTestIncoming(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>📝</span>
                      <span>Criar Tarefa (Tasks)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = 'Marca reunião com Carlos amanhã às 15h';
                        setInboundTestPrompt(txt);
                        handleTestIncoming(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>📅</span>
                      <span>Agendar Reunião</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = 'Me lembra de pagar a fatura hoje às 17h';
                        setInboundTestPrompt(txt);
                        handleTestIncoming(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>⏰</span>
                      <span>Criar Lembrete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = 'Quais tarefas eu tenho pendentes?';
                        setInboundTestPrompt(txt);
                        handleTestIncoming(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] border border-[#262C36] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>Listar Tarefas</span>
                    </button>
                  </div>
                </div>
              </div>

              {testIncomingResult && (
                <div className="p-4 rounded-xl bg-[#181C22] border border-[#262C36] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#C7FF3D]" />
                      Resultado do URSO JR.:
                    </div>
                    {testIncomingResult.toolCalled && (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#C7FF3D]/15 text-[#C7FF3D] border border-[#C7FF3D]/30">
                        Ferramenta: {testIncomingResult.toolCalled}
                      </span>
                    )}
                  </div>

                  {testIncomingResult.actionResult?.title && (
                    <div className="p-3 rounded-lg bg-[#0F1115] border border-[#262C36] space-y-1">
                      <div className="font-semibold text-[#22C55E] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span>Item Criado: <strong>{testIncomingResult.actionResult.title}</strong></span>
                      </div>
                      {testIncomingResult.actionResult.google_task_id && (
                        <div className="text-[11px] text-[#9CA3AF] font-mono">
                          ✓ Sincronizado no Google Tasks (ID: {testIncomingResult.actionResult.google_task_id})
                        </div>
                      )}
                      {testIncomingResult.actionResult.google_event_id && (
                        <div className="text-[11px] text-[#9CA3AF] font-mono">
                          ✓ Sincronizado no Google Calendar (ID: {testIncomingResult.actionResult.google_event_id})
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-semibold text-[#9CA3AF] block mb-1">
                      Mensagem entregue no WhatsApp:
                    </span>
                    <p className="text-[#F5F7FA] whitespace-pre-line bg-[#0F1115] p-3 rounded-lg border border-[#262C36] font-mono leading-relaxed">
                      {testIncomingResult.response || JSON.stringify(testIncomingResult)}
                    </p>
                  </div>

                  {testIncomingResult.sendResult && (
                    <div className="text-[11px] text-[#9CA3AF] font-mono pt-1 border-t border-[#262C36] flex items-center justify-between">
                      <span>Status de Envio ao Celular:</span>
                      <span className={testIncomingResult.sendResult.success ? 'text-[#22C55E] font-bold' : 'text-[#EF4444] font-bold'}>
                        {testIncomingResult.sendResult.success ? `✓ Entregue (ID: ${testIncomingResult.sendResult.messageId || 'ok'})` : `⚠️ Falha: ${testIncomingResult.sendResult.error}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Event list */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[#9CA3AF] block">
                  Últimos Eventos de Webhook Recebidos ({webhookEvents.length})
                </span>

                {webhookEvents.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-[#F59E0B]/40 bg-[#0F1115] text-[#F59E0B] text-xs space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      ⚠️ Nenhum evento de webhook recebido ainda da Uazapi.
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      Isto significa que quando você mandou mensagem no WhatsApp, a Uazapi ainda não chamou esta URL.
                    </p>
                    <div className="text-[11px] text-[#9CA3AF] space-y-0.5 pt-1">
                      <div><strong className="text-[#F5F7FA]">Configuração no painel da Uazapi:</strong></div>
                      <div>1. Abra a instância <strong>b3r</strong> e vá em <strong>Webhooks</strong>.</div>
                      <div>2. Cole a URL do topo desta página no campo <strong>URL</strong>.</div>
                      <div>3. Verifique se a chave <strong>Webhook Ativo</strong> está ligada.</div>
                      <div>4. Em <em>Escutar eventos</em>, marque <strong>messages</strong>.</div>
                      <div>5. Clique no botão de <strong>Salvar</strong> na Uazapi.</div>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {webhookEvents.slice(0, 5).map((evt: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#181C22] border border-[#262C36] flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${evt.status === 'success' ? 'bg-[#22C55E]' : 'bg-[#C7FF3D]'}`} />
                            {evt.event_type}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] block font-mono">
                            {evt.payload?.userMessage ? `"${evt.payload.userMessage}"` : (evt.message_id || 'payload')}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {new Date(evt.created_at || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeSubTab === 'durations' && (
        <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Durações Padrão de Compromissos (IA)
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Quando você disser no WhatsApp "Marca dentista amanhã às 14h" sem especificar horário final, o URSO JR. usará estas durações inteligentes automaticamente.
            </p>
          </div>

          <form onSubmit={handleSaveDurations} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Reunião / Call / Alinhamento (minutos)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={durations.meeting}
                  onChange={(e) => setDurations({ ...durations, meeting: parseInt(e.target.value) || 60 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Consulta Médica / Dentista / Exame (minutos)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={durations.consultation}
                  onChange={(e) => setDurations({ ...durations, consultation: parseInt(e.target.value) || 60 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Ligação Rápida / Telefonema (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={durations.call}
                  onChange={(e) => setDurations({ ...durations, call: parseInt(e.target.value) || 30 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Treino / Academia / Personal (minutos)
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  step="15"
                  value={durations.workout}
                  onChange={(e) => setDurations({ ...durations, workout: parseInt(e.target.value) || 90 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Duração Genérica Padrão (minutos)
                </label>
                <input
                  type="number"
                  min="15"
                  max="300"
                  step="15"
                  value={durations.generic}
                  onChange={(e) => setDurations({ ...durations, generic: parseInt(e.target.value) || 60 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingDurations}
                className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingDurations ? 'Salvando...' : 'Salvar Durações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. PERFIL & FUSO HORÁRIO */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
            Perfil do Usuário Titular
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                  Telefone / WhatsApp Principal *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
                Fuso Horário Padrão
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] focus:outline-none focus:border-[#C7FF3D] cursor-pointer"
              >
                <option value="America/Sao_Paulo">Brasília (America/Sao_Paulo - UTC-3)</option>
                <option value="America/Manaus">Manaus (America/Manaus - UTC-4)</option>
                <option value="America/Belem">Belém (America/Belem - UTC-3)</option>
                <option value="America/Fortaleza">Fortaleza (America/Fortaleza - UTC-3)</option>
                <option value="America/Cuiaba">Cuiabá (America/Cuiaba - UTC-4)</option>
                <option value="America/Rio_Branco">Rio Branco (America/Rio_Branco - UTC-5)</option>
                <option value="Europe/Lisbon">Lisboa (Europe/Lisbon - UTC+0)</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2.5 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. SCHEMA SQL (POSTGRESQL / SUPABASE) */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'sql' && (
        <div className="p-6 rounded-2xl bg-[#181C22] border border-[#262C36] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#C7FF3D]" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA]">
                  Schema SQL para Supabase / PostgreSQL
                </h3>
                <p className="text-[11px] text-[#9CA3AF]">
                  Pronto para copiar e colar no SQL Editor do Supabase ou Cloud SQL.
                </p>
              </div>
            </div>

            <button
              onClick={copySql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#262C36] text-xs font-semibold bg-[#0F1115] hover:bg-[#1E232B] text-[#F5F7FA] transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>

          <pre className="p-4 bg-[#0F1115] text-[#F5F7FA] border border-[#262C36] rounded-xl font-mono text-[11px] h-64 overflow-y-auto leading-relaxed">
            {sqlSchema}
          </pre>
        </div>
      )}

      {/* Confirmation Modal to Disconnect Google */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Desconectar Conta Google"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div>
              <p className="font-bold">Confirmação de Desconexão:</p>
              <p className="mt-1 text-[#9CA3AF]">
                Ao desconectar a conta <strong className="text-[#F5F7FA]">{googleConfig.email}</strong>, o URSO JR. deixará de sincronizar seus compromissos no Google Calendar e tarefas no Google Tasks.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsDisconnectModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA] text-xs font-semibold hover:bg-[#181C22] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDisconnectGoogle}
              className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#dc2626] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Confirmar Desconexão
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Adicionar Membro da Casa */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Cadastrar Pessoa da Casa (Multi-Usuário)"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#262C36] text-xs text-[#9CA3AF]">
            <p className="font-semibold text-[#F5F7FA] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#C7FF3D]" />
              Como funciona o cadastro?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Ao cadastrar o número de WhatsApp dessa pessoa, quando ela enviar áudio ou mensagem para o robô da casa (instância <strong>b3r</strong>), o URSO JR. automaticamente atenderá ela com a agenda e tarefas próprias dela!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Nome da Pessoa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Mariana Menezes / Lucas (Filho)"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Número de WhatsApp (com DDD) *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 5538999887766 ou 38999887766"
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#C7FF3D]"
            />
            <p className="text-[10px] text-[#9CA3AF] mt-1">
              Insira o número completo com DDD (apenas números ou com código do país 55).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">
              Horário do Resumo Matinal Diário
            </label>
            <input
              type="time"
              value={newMemberTime}
              onChange={(e) => setNewMemberTime(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#262C36] bg-[#0F1115] text-[#F5F7FA] font-mono focus:outline-none focus:border-[#C7FF3D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#262C36]">
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-[#262C36] text-[#9CA3AF] hover:text-[#F5F7FA] text-xs font-semibold hover:bg-[#181C22] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingMember}
              className="px-4 py-2 rounded-xl bg-[#C7FF3D] hover:bg-[#b8f72a] text-[#0F1115] font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingMember ? 'Cadastrando...' : 'Cadastrar Membro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
