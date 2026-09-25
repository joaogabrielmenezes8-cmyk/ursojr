# URSO JR. — Seu estagiário com IA
## 13-API-ENDPOINTS.md — Catálogo de Endpoints de API

Este documento detalha e mapeia todas as rotas de API HTTP expostas pelo servidor Express (`/server.ts`), descrevendo as entradas, saídas e funções operacionais de cada uma.

---

### 1. Webhooks (Uazapi)

| Método | Caminho | Entrada | Saída (JSON) | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/webhooks/uazapi` | Nenhuma | `{ status: 'ok', service: 'KUMA...' }` | Verificação e Handshake de webhook na Uazapi |
| **POST**| `/api/webhooks/uazapi` | Payload WhatsApp | `{ success: true, messageId: '...' }` | Recebe e processa mensagens de texto e áudio |

---

### 2. Google Workspace e Cadastro

| Método | Caminho | Entrada | Saída (JSON) | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/google/status` | Nenhuma | `{ connected: bool, email: string... }` | Retorna status de conexão Google e validade do token |
| **POST**| `/api/google/sync-token` | `{ token, email }` | `{ success: true, connected: true }` | Salva o token OAuth do usuário e inicia a primeira sincronização |
| **POST**| `/api/google/disconnect` | Nenhuma | `{ success: true, connected: false }` | Desconecta a integração do Google e deleta os tokens locais |
| **POST**| `/api/google/sync` | Nenhuma | `{ success: true, lastSyncAt: ISO... }` | Força uma sincronização sob demanda de eventos e tarefas |
| **POST**| `/api/register` | `{ full_name, phone, email, token }` | `{ success: true, profile: Object }` | **Cadastro de Novos Membros:** Cria perfil isolado do WhatsApp e associa a conta Google |

---

### 3. Simulador e Entrada Manual

| Método | Caminho | Entrada | Saída (JSON) | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- |
| **POST**| `/api/simulator/chat` | `{ text, phone, userId }` | `{ userMessage, assistantMessage }` | Simula um comando de texto via WhatsApp no painel web |
| **POST**| `/api/audio/transcribe-and-process`| `{ base64Audio, mimeType, phone }` | `{ success: true, transcribedText... }` | Simula gravação de voz no painel web. Transcreve com Gemini e processa |

---

### 4. Gestão de Perfis (Multi-User)

| Método | Caminho | Entrada | Saída (JSON) | Responsabilidade |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/profiles` | Nenhuma | `Profile[]` | Lista todos os perfis e familiares cadastrados |
| **POST**| `/api/profiles` | `{ full_name, phone }` | `Profile` (Criado) | Adiciona novo familiar para escuta do WhatsApp |
| **PUT** | `/api/profiles/:id` | `Partial<Profile>` | `Profile` (Editado) | Atualiza configurações ou nome do familiar |
| **DELETE**| `/api/profiles/:id` | Nenhuma | `{ success: true }` | Exclui perfil do familiar (Protege o default) |

---

### 5. Coleções de Dados (CRUD)

#### 5.1 Tarefas (`/api/tasks`)
*   **GET `/api/tasks`:** Retorna a lista de tarefas.
*   **POST `/api/tasks`:** Cria uma nova tarefa. Transmite de imediato para a lista remota do Google Tasks se estiver conectado.
*   **PUT `/api/tasks/:id`:** Atualiza o status (marca como concluída) ou prazos. Conclui remotamente no Google Tasks.
*   **DELETE `/api/tasks/:id`:** Exclui a tarefa local e remotamente.

#### 5.2 Compromissos (`/api/events`)
*   **GET `/api/events`:** Retorna a lista de eventos.
*   **POST `/api/events`:** Agenda um compromisso no calendário. Cria no Google Calendar do usuário.
*   **PUT `/api/events/:id`:** Altera horários, títulos ou pautas locais e no Google Calendar.
*   **DELETE `/api/events/:id`:** Exclui o evento local e remotamente.

#### 5.3 Lembretes (`/api/reminders`)
*   **GET `/api/reminders`:** Retorna a fila de disparos automáticos.
*   **POST `/api/reminders`:** Agenda um lembrete WhatsApp de uma vez ou recorrente.
*   **PUT `/api/reminders/:id`:** Edita ou altera dados do lembrete.
*   **DELETE `/api/reminders/:id`:** Cancela e remove o lembrete pendente da fila.

#### 5.4 Notas, Contatos e Gastos
*   **CRUD `/api/notes`:** GET (listar), POST (criar), PUT (favoritar), DELETE (remover) anotações.
*   **CRUD `/api/contacts`:** GET (listar), POST (criar), PUT (editar), DELETE (remover) contatos e fornecedores.
*   **CRUD `/api/expenses`:** GET (listar), POST (lançar gasto), PUT (corrigir valor), DELETE (excluir) movimentações financeiras.

---

### 6. WhatsApp Controle da Instância

*   **GET `/api/whatsapp/status`:** Consulta na API oficial da Uazapi o status do QR Code e conexão.
*   **GET `/api/whatsapp/sse-status`:** Retorna se o ouvinte contínuo em segundo plano do backend está conectado.
*   **POST `/api/whatsapp/sse-restart`:** Força a reconexão imediata do ouvinte de SSE com a Uazapi.
*   **POST `/api/whatsapp/sync-webhook`:** Configura automaticamente na API da Uazapi a URL atual deste painel para recebimento de webhooks.
*   **POST `/api/whatsapp/test-send`:** Envia uma mensagem rápida de teste de texto para o número especificado.
*   **POST `/api/whatsapp/config`:** Altera as chaves e token de instância do WhatsApp no banco.

---

### 7. Diagnósticos e Auditoria

*   **GET `/api/diagnostics`:** Retorna latências do banco JSON local, contadores de registros e flags de chaves API (Utilizado pela tela de Saúde do Sistema).
*   **GET `/api/agent-actions`:** Retorna os últimos 200 logs de decisões e execuções de ferramentas do Agente de IA para auditoria.
*   **GET `/api/settings`:** Retorna as informações do perfil principal (`user_default`) com token mascarado.
*   **POST `/api/settings`:** Salva alterações no perfil mestre.
