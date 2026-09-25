# URSO JR. — Seu estagiário com IA
## 10-ROUTES.md — Roteamento do Sistema (Frontend e Backend)

Este documento mapeia todas as rotas e navegações existentes na aplicação, cobrindo frontend, APIs de backend e webhooks.

---

### 1. Rotas do Frontend (Vite Single Page Application)

Como o frontend é uma Single Page Application (SPA), a troca de telas é controlada via estado reativo (`activeTab`) no arquivo principal `/src/App.tsx`. Exceções de rota física de roteador de navegador são tratadas condicionalmente (como `/register` ou `/cadastro`).

| Rota Física / Tab | Nome da Tela | Componente / Arquivo | Autenticação | Dados Consumidos | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Painel Web Mestre | `App.tsx` (Root) | Nenhuma (Acesso Aberto) | Estatísticas e dados de perfil unificados | ✅ FUNCIONAL |
| Tab: `dashboard` | Dashboard Inicial | `views/DashboardView.tsx` | Nenhuma | `/api/dashboard` (Resumos) | ✅ FUNCIONAL |
| Tab: `agenda` | Calendário / Agenda | `views/AgendaView.tsx` | Google Conectado (OAuth) | `/api/events` (Events CRUD) | ✅ FUNCIONAL |
| Tab: `tasks` | Lista de Tarefas | `views/TasksView.tsx` | Google Conectado (OAuth) | `/api/tasks` (Tasks CRUD) | ✅ FUNCIONAL |
| Tab: `reminders` | Lembretes WhatsApp | `views/RemindersView.tsx` | Nenhuma | `/api/reminders` (Reminders CRUD) | ✅ FUNCIONAL |
| Tab: `notes` | Bloco de Notas | `views/NotesView.tsx` | Nenhuma | `/api/notes` (Notes CRUD) | ✅ FUNCIONAL |
| Tab: `contacts` | Agenda de Contatos | `views/ContactsView.tsx` | Nenhuma | `/api/contacts` (Contacts CRUD) | ✅ FUNCIONAL |
| Tab: `conversations`| Histórico e Suporte | `views/ConversationsView.tsx`| Nenhuma | `/api/conversations` (Chats e msgs) | ✅ FUNCIONAL |
| Tab: `memory` | Configurações de IA | `views/MemoryView.tsx` | Nenhuma | `/api/memories` (Memories CRUD) | ✅ FUNCIONAL |
| Tab: `automations` | Resumos e Alertas | `views/AutomationsView.tsx` | Nenhuma | `/api/settings` (Config resumo) | ✅ FUNCIONAL |
| Tab: `whatsapp` | Conexão WhatsApp | `views/WhatsAppView.tsx` | Nenhuma | `/api/whatsapp/status` | ✅ FUNCIONAL |
| Tab: `audit` | Log de Intenções | `views/AuditView.tsx` | Nenhuma | `/api/agent-actions` (Logs IA) | ✅ FUNCIONAL |
| Tab: `diagnostics` | Painel de Saúde | `views/DiagnosticsView.tsx` | Nenhuma | `/api/diagnostics` (Salúde geral) | ✅ FUNCIONAL |
| Tab: `settings` | Perfil Principal | `views/SettingsView.tsx` | Nenhuma | `/api/settings` (Perfil CRUD) | ✅ FUNCIONAL |
| `/register` ou `/cadastro` | Link Único de Cadastro | `views/RegisterView.tsx` | Google OAuth Popup | POST `/api/register` (Novo perfil) | ✅ FUNCIONAL |

---

### 2. Rotas de Webhooks e Integrações

| Rota / Path | Método | Serviço Alvo | Arquivo do Servidor | Responsabilidade | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/webhooks/uazapi` | GET | Uazapi | `/server.ts` | Endpoint de verificação e handshake do webhook | ✅ FUNCIONAL |
| `/api/webhooks/uazapi` | POST | Uazapi Webhook | `/server.ts` | Recebimento instantâneo de novas mensagens | ✅ FUNCIONAL |
| `/api/webhook/uazapi` | POST | Uazapi (Redundante) | `/server.ts` | Backup de recebimento instantâneo | ✅ FUNCIONAL |
| `/api/webhooks` | POST | Uazapi (Redundante) | `/server.ts` | Backup de recebimento instantâneo | ✅ FUNCIONAL |
| `/api/webhook` | POST | Uazapi (Redundante) | `/server.ts` | Backup de recebimento instantâneo | ✅ FUNCIONAL |

---

### 3. Rotas de API (Acesso aos Dados)

Todas as rotas REST consumidas pelo painel web estão mapeadas no arquivo `/server.ts`. A lista detalhada dos métodos, parâmetros e retornos está descrita no arquivo **`13-API-ENDPOINTS.md`**.
