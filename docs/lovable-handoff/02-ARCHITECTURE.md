# URSO JR. — Seu estagiário com IA
## 02-ARCHITECTURE.md — Arquitetura Real e Fluxos de Dados

Este documento mapeia a arquitetura técnica real da aplicação, descrevendo como os dados trafegam e como as integrações estão conectadas.

---

### 1. Visão Geral da Arquitetura Geral

O URSO JR. é um aplicativo full-stack em que o frontend (Vite React SPA) e o backend (Express) coabitam na mesma porta no ambiente de desenvolvimento, facilitando o gerenciamento do faturamento, rotas e APIs.

#### Diagrama A: Arquitetura Geral do Sistema
```mermaid
graph TD
    %% Componentes
    subgraph Frontend [Painel Web - React Vite]
        UI[Views & Components]
        GAuth[Google Auth Service]
    end

    subgraph Backend [Servidor Express]
        API[API Router - express.js]
        SSE[UazapiSseListener]
        Sched[Background Scheduler Worker]
        DB[Database Engine - db.ts]
        Agent[AssessorAgent - Gemini AI]
    end

    subgraph Local_Storage [Persistência]
        JSON_DB[(data/db.json)]
    end

    subgraph External_Services [Serviços Externos]
        Uazapi[Uazapi WhatsApp API]
        Gemini[Google Gemini API]
        GCalendar[Google Calendar API]
        GTasks[Google Tasks API]
    end

    %% Relações
    UI <-->|HTTP JSON / REST| API
    GAuth -->|Tokens| UI
    
    API <-->|Leitura & Gravação| DB
    SSE <-->|Gravação direta| DB
    Sched <-->|Disparo de Lembretes| DB
    DB <-->|Leitura/Escrita Física| JSON_DB

    SSE <-->|Conexão Contínua SSE| Uazapi
    API <-->|REST Webhooks| Uazapi
    API <-->|REST Proxy| GCalendar
    API <-->|REST Proxy| GTasks

    Agent <-->|SDK @google/genai| Gemini
    API <-->|Processamento Contextual| Agent
    SSE -->|Processamento de Inbound| Agent
```

---

### 2. Fluxo Principal: Mensagem de Voz/Texto do WhatsApp → Resposta do Agente

Quando o usuário envia uma mensagem de áudio ou texto para o WhatsApp do robô, o fluxo segue rigorosamente esta esteira:

#### Diagrama B: Fluxo de Entrada de Mensagem e Resposta
```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário (WhatsApp)
    participant Uaz as Uazapi
    participant Listener as SSE Listener / Webhook (Backend)
    participant Transcription as Audio Service
    participant Gemini as Gemini AI API
    participant Agent as AssessorAgent (Raciocínio)
    participant DB as db.ts (Banco JSON)
    participant Google as Google APIs (Calendar/Tasks)

    User->>Uaz: Envia Mensagem de Voz (Áudio)
    Uaz->>Listener: Notifica evento (messages.upsert) via SSE ou Webhook POST
    Listener->>Listener: Deduplica por MessageID & Lock de Telefone
    Note over Listener: Se for Áudio, normaliza com isAudio=true
    Listener->>Transcription: Executa downloadAndTranscribeAudio(audioInfo)
    Transcription->>Uaz: Baixa arquivo MP3/OGG da mídia
    Transcription->>Gemini: Envia Base64 do áudio para gemini-3.5-transcribe
    Gemini-->>Transcription: Retorna transcrição do texto em Português
    Transcription-->>Listener: Retorna o texto transcrito
    Listener->>DB: Salva mensagem de entrada (direção: inbound)
    Listener->>Agent: Executa processMessage(transcribedText, userId)
    Agent->>Gemini: Envia prompt de sistema + ferramentas + histórico + texto
    Gemini-->>Agent: Retorna chamada de ferramenta (Tool Call: ex: create_task)
    Agent->>Google: Executa chamada na API correspondente (ex: criar tarefa)
    Google-->>Agent: Retorna sucesso/detalhes da tarefa criada
    Agent->>DB: Salva a tarefa criada no banco local
    Agent->>Gemini: Envia resultado da ferramenta para gerar resposta final natural
    Gemini-->>Agent: Retorna resposta formatada em Português com emojis
    Agent-->>Listener: Retorna objeto AgentResult completo
    Listener->>Uaz: Envia resposta de texto via POST /sendText
    Uaz-->>User: Entrega mensagem no celular do usuário
    Listener->>DB: Salva mensagem de saída (direção: outbound) e registra na auditoria
```

---

### 3. Integração Google Workspace (OAuth & Sincronização)

O fluxo de sincronização e autorização do Google é desenhado para operar de forma puramente cliente-servidor nativa, evitando segredos de cliente expostos no backend.

#### Diagrama C: Fluxo de Conexão Google OAuth e Sincronização
```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário (Painel Web)
    participant UI as Painel Frontend (React)
    participant API as Backend Server
    participant Google as Google Auth / APIs

    User->>UI: Clica em "Conectar Google" (ou link de convite)
    UI->>Google: Abre popup do Google OAuth (com escopos Calendar/Tasks)
    User->>Google: Concede permissões na tela do Google
    Google-->>UI: Redireciona de volta com o Access Token de Cliente
    UI->>API: POST /api/google/sync-token contendo o Access Token
    API->>API: Valida e armazena token no perfil do usuário no db.json
    par Sincronização em Segundo Plano
        API->>Google: GET /calendar/v3/calendars/primary/events (Baixa eventos)
        Google-->>API: Retorna lista de compromissos
        API->>Google: GET /tasks/v1/lists/@default/tasks (Baixa tarefas)
        Google-->>API: Retorna lista de tarefas
    end
    API->>API: Salva tudo no db.json local (Garante fontes canônicas)
    API-->>UI: Retorna Sucesso da conexão
    UI-->>User: Exibe "Google Conectado com Sucesso" e atualiza tabelas
```

---

### 4. Ciclo de Vida do Lembrete Automático

Os lembretes cadastrados pela IA ou manualmente possuem uma máquina de estados simples executada por Cron no servidor.

#### Diagrama D: Ciclo de Lembrete do WhatsApp
```mermaid
stateDiagram-v2
    [*] --> Pendente : Lembrete criado pela IA / manual (Status: pending)
    Pendente --> Processando : Scheduler varre lembretes ativos (Roda a cada 30s)
    Processando --> Enviado : Disparo bem sucedido via Uazapi POST /sendText
    Processando --> Falho : Erro no disparo ou telefone inválido
    Enviado --> [*] : Se recorrência = 'none'
    Enviado --> Pendente : Se recorrência ativo (Recalcula scheduled_at para o próximo período)
    Falho --> [*] : Registra erro e desativa lembrete
```

---

### 5. Estrutura Técnica dos Serviços e Componentes (Código Real)

*   **DATABASE ENGINE (`/server/db.ts`):** O repositório central. Todas as leituras e gravações passam pela instância única `db`. Ele faz caching em memória e sincronização via arquivo físico `data/db.json` de forma robusta e persistente.
*   **WHATSAPP LISTENER & WEBHOOK (`/server/services/uazapi-listener.ts`):** Executa o fluxo de SSE contínuo e expõe o barramento de entrada para as rotas do webhook. Centraliza o controle de concorrência e deduplicação de mensagens duplicadas por rajadas de rede.
*   **ASSESSOR DE IA (`/server/agent.ts`):** O cérebro do robô. Gerencia prompts dinâmicos injetando memórias do usuário em tempo real. Implementa um algoritmo heurístico para interpretação temporal de linguagem natural brasileira (ex: "segunda 15h", "amanhã", "depois do almoço"), garantindo acertos operacionais de fuso horário.
*   **GOOGLE API SERVICES (`/server/google/`):** Pacotes de chamadas REST diretas para o Google Calendar e Google Tasks. Atuam como proxies autenticados usando os Access Tokens injetados dinamicamente de cada perfil.
*   **SCHEDULER JOB (`/server/scheduler.ts`):** Um agendador contínuo baseado em `setInterval` de 30 segundos, que executa tanto o disparo de lembretes quanto as tarefas recorrentes e o disparo de briefings matinais.
