# URSO JR. — Seu estagiário com IA
## 08-GOOGLE-INTEGRATION.md — Integração Google Workspace (Calendar & Tasks)

Este documento descreve detalhadamente o fluxo de conexão, sincronização e proxies de API do ecossistema Google Workspace (Calendar & Tasks).

---

### 1. Fluxo de Autorização (Google OAuth)

A integração com as APIs do Google é baseada no protocolo **OAuth 2.0 Client-Side Flow**:

*   **Configuração de Escopos (Scopes):** O sistema requer autorização para duas APIs centrais:
    1.  `https://www.googleapis.com/auth/calendar.events` (Para gerenciar compromissos)
    2.  `https://www.googleapis.com/auth/tasks` (Para gerenciar listas de tarefas)
*   **Armazenamento de Tokens:** O frontend inicia o popup de login usando o Google Identity Services (`/src/services/googleAuth.ts`). Ao obter o `access_token`, ele faz um POST para `/api/google/sync-token`, que salva o token no banco local (`db.json`) sob o perfil correspondente.
*   **Validade do Token:** Como é obtido de forma implícita no cliente, o token possui validade de **3600 segundos (1 hora)**. Quando o token expira, as chamadas retornam `401 Unauthorized` e o sistema exibe um banner vermelho na interface web solicitando reautenticação imediata.

---

### 2. Status de Implementação das Operações

#### 2.1 Google Calendar (Agenda)
O sistema trata o **Google Calendar como a Fonte Canônica absoluta** para compromissos.

*   **Listar Eventos (`listEvents`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Sincroniza e puxa eventos em segundo plano, salvando localmente para visualização instantânea.
*   **Criar Evento (`createEvent`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Eventos criados no painel ou por comando de voz no WhatsApp são inseridos instantaneamente no Google Calendar do usuário.
*   **Atualizar Evento (`updateEvent`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Permite remarcar horários, alterar títulos e locais de compromissos.
*   **Excluir Evento (`deleteEvent`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Remove o evento remotamente da agenda Google.
*   **Busca de Conflitos / Janelas Livres (`check_availability`):** ✅ **IMPLEMENTADO E FUNCIONAL**. O agente analisa horários livres consultando eventos remotos do Calendar para evitar sobreposições.

#### 2.2 Google Tasks (Tarefas)
O sistema trata o **Google Tasks como a Fonte Canônica absoluta** para tarefas pendentes.

*   **Listar Tarefas (`listTasks`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Carrega as pendências diretamente do Google Tasks da lista padrão do usuário (`@default`).
*   **Criar Tarefa (`createTask`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Tarefas criadas no celular do usuário ou no painel são transmitidas imediatamente para a lista remota do Google.
*   **Atualizar Tarefa (`updateTask`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Permite mover datas de vencimento ou editar títulos.
*   **Completar/Concluir Tarefa (`completeTask`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Marca a tarefa como completada e arquiva-a no Google Tasks.
*   **Excluir Tarefa (`deleteTask`):** ✅ **IMPLEMENTADO E FUNCIONAL**. Exclui o item remotamente.

---

### 3. Fontes Canônicas de Dados (Alinhamento de Arquitetura)

O URSO JR. segue estritamente este alinhamento de verdade de dados para evitar inconsistências entre o banco local e as APIs parceiras:

| Entidade | Fonte Canônica | Papel do Banco Interno (`db.json`) |
| :--- | :--- | :--- |
| **Compromissos / Eventos** | **Google Calendar** | Cache reativo para leituras e exibições instantâneas rápidas. |
| **Tarefas Pendentes** | **Google Tasks** | Cache local de visualização para fins de faturamento e exibição. |
| **Lembretes de WhatsApp** | **Banco Interno** | Fonte absoluta. O agendador local detém o cron de disparos. |
| **Conversas e Mensagens** | **Banco Interno** | Fonte absoluta. Armazena o log histórico dos chats com o robô. |
| **Preferências (Memória)** | **Banco Interno** | Fonte absoluta de dados comportamentais. |
| **Finanças (Gastos)** | **Banco Interno** | Fonte absoluta de relatórios de despesas. |
| **WhatsApp Instância** | **Uazapi** | O status de conexão é verificado em tempo real via REST na Uazapi. |
| **Inteligência Artificial** | **Gemini** | O processamento e tomada de decisão operacional dependem da API do Gemini. |
