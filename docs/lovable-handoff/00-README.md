# PACOTE DE HANDOFF / MIGRAÇÃO — URSO JR.
## 00-README.md — Visão Geral do Projeto

Este documento serve como o ponto de partida absoluto para qualquer desenvolvedor ou agente (como o Lovable) que assumirá o desenvolvimento do **URSO JR. — Seu estagiário com IA**.

---

## 1. O que é o URSO JR.?
O **URSO JR.** é um assessor pessoal baseado em inteligência artificial que atua como um estagiário operacional para o usuário. Ele recebe comandos por áudio (mensagens de voz) ou texto diretamente no **WhatsApp**, interpreta as intenções do usuário por meio do Gemini e executa ações reais integrando-se ao **Google Calendar**, **Google Tasks** e um gerenciador financeiro interno, além de disparar lembretes automatizados de volta ao WhatsApp.

O sistema possui um **painel de controle Web completo (SaaS)** para acompanhamento e configuração.

---

## 2. Tecnologias Reais Utilizadas (Stack)

*   **FRONTEND:** React SPA (Single Page Application) estruturado sobre o **Vite**, escrito em **TypeScript**, estilizado com **Tailwind CSS**, utilizando ícones da biblioteca **Lucide-React** e transições fluídas com **Framer Motion**.
*   **BACKEND:** Servidor **Express (Node.js + TS)** estruturado em `/server.ts` e arquivos auxiliares em `/server`. Durante o desenvolvimento, ele roda o middleware do Vite integrado. No ambiente de produção, roda compilado em CommonJS via **esbuild** (`node dist/server.cjs`).
*   **BANCO DE DADOS:** Banco de dados baseado em arquivo JSON local (`/data/db.json`), gerenciado de forma relacional reativa pela classe controladora `Database` no arquivo `/server/db.ts`. Não há SQL, Postgres ou Prisma/Supabase conectados ainda.
*   **INTELIGÊNCIA ARTIFICIAL:** Integração direta com a API do **Gemini** usando o SDK oficial e moderno `@google/genai`. Utiliza uma cascata (cascade) inteligente que prioriza o modelo especializado `'gemini-3.5-transcribe'` para voz e áudio, e `'gemini-3.8-flash'` / `'gemini-3.6-flash'` para processamento de texto, raciocínio e Tool Calling.
*   **WHATSAPP:** Provider oficial **Uazapi**, integrado em duas frentes redundantes:
    1.  **SSE (Server-Sent Events) Listener:** Conexão contínua em tempo real executada em segundo plano pelo servidor (`UazapiSseListener`).
    2.  **Webhooks HTTP:** Endpoints POST preparados para receber notificações instantâneas do WhatsApp.
*   **GOOGLE WORKSPACE:** Integração cliente-servidor nativa com **Google Calendar** (compromissos) e **Google Tasks** (tarefas). O frontend gerencia a autenticação e captura o Access Token (Google OAuth), enviando-o via rota Bearer ao backend, que sincroniza os dados localmente e realiza as chamadas de API (Proxy).
*   **DEPLOY:** Preparado para deploy rápido em plataformas de container (como Google Cloud Run) via Docker e build script integrado.

---

## 3. Como Executar o Projeto Localmente

### Pré-requisitos:
*   Node.js (v18+) instalado.
*   Chave de API do Gemini (`GEMINI_API_KEY`) ativa.

### Passos para inicialização:
1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Copie e configure as variáveis de ambiente:
    ```bash
    cp .env.example .env
    ```
    *Preencha com sua `GEMINI_API_KEY` obtida no Google AI Studio, e suas credenciais Uazapi se desejar testar o WhatsApp real.*
3.  Execute o servidor de desenvolvimento full-stack:
    ```bash
    npm run dev
    ```
    *O painel web estará disponível em `http://localhost:3000`.*

---

## 4. Ordem Recomendada de Leitura da Documentação

Para absorver o contexto completo do projeto sem atritos, leia os arquivos de handoff na seguinte sequência:

1.  **`01-PRODUCT.md`:** Entenda as funcionalidades, regras de negócio e objetivos do produto.
2.  **`02-ARCHITECTURE.md`:** Estude os fluxos de dados, webhooks, diagramas Mermaid e pipelines.
3.  **`03-FOLDER-STRUCTURE.md`:** Conheça as responsabilidades de cada pasta e arquivo do repositório.
4.  **`04-DATABASE.md` & `schema-current.sql`:** Compreenda a estrutura de dados simulada em JSON e o schema SQL equivalente planejado para migração.
5.  **`05-AUTH.md`:** Entenda o fluxo de autenticação e identificação de perfis (multi-usuário).
6.  **`06-WHATSAPP-UAZAPI.md` & `07-AI-AGENT.md`:** Descubra os segredos por trás do listener do WhatsApp e o mapeamento de Tool Calling do Agente Gemini.
7.  **`08-GOOGLE-INTEGRATION.md` & `09-REMINDERS-AUTOMATIONS.md`:** Veja como as integrações de Agenda, Tarefas e Lembretes automáticos por Cron funcionam.
8.  **`10-ROUTES.md` & `13-API-ENDPOINTS.md`:** Mapeie todas as telas do frontend e as rotas HTTP de API do servidor.
9.  **`11-UI-DESIGN-SYSTEM.md` & `12-COMPONENTS.md`:** Saiba como as cores, estilos e componentes visuais estão organizados.
10. **`14-ENVIRONMENT.md` & `15-SECURITY.md`:** Entenda as variáveis de ambiente exigidas e a auditoria de segurança atual do sistema.
11. **`16-CURRENT-STATUS.md` & `17-KNOWN-ISSUES.md`:** Tenha uma visão transparente de cada recurso funcional, erros conhecidos e débitos técnicos.
12. **`18-TESTS.md` & `19-NEXT-STEPS.md`:** Use as checklists de aceitação e siga o roteiro de prioridades P0/P1/P2 de próximos passos para produção.
13. **`20-LOVABLE-START-PROMPT.md`:** O prompt definitivo de inicialização pronto para copiar e colar no Lovable.

---

## 5. Arquivos Críticos do Projeto

Se você precisar inspecionar o código imediatamente, foque nestes arquivos prioritários:

*   **`/server.ts`:** O arquivo centralizador de inicialização do servidor Express, gerenciador das rotas da API e montador de arquivos estáticos.
*   **`/server/db.ts`:** O coração da persistência de dados. Contém toda a lógica e manipulação de dados em JSON, sementes (seeds) e helpers de diagnóstico.
*   **`/server/agent.ts`:** A implementação do Assessor de IA. Contém os prompts de sistema, declarações de ferramentas (Tool Calling), resoluções temporais em português e o fluxo principal de raciocínio.
*   **`/server/services/uazapi-listener.ts`:** Gerenciador do loop e listen de SSE do WhatsApp, incluindo normalização de payloads e prevenção de duplicações.
*   **`/server/services/audio-transcription.ts`:** Integração da transcrição de áudio com o Gemini 3.5 Transcribe e o download de arquivos de áudio hospedados pela Uazapi.
*   **`/src/App.tsx`:** O roteador frontend central que monta as telas e controla a barra lateral de navegação.
*   **`/src/components/views/DashboardView.tsx`:** A tela principal do painel web contendo estatísticas, cards de diagnóstico e o simulador interativo de chat.
