# URSO JR.
Seu estagiário com IA.

O **URSO JR.** é um assessor pessoal baseado em inteligência artificial que atua como um estagiário operacional completo. O sistema recebe comandos por áudio (mensagens de voz) ou texto diretamente no **WhatsApp**, interpreta as intenções do usuário por meio do Gemini e executa ações reais no **Google Calendar**, **Google Tasks** e um gerenciador financeiro interno, além de disparar lembretes automatizados de volta ao WhatsApp.

O projeto conta também com um **Painel de Controle Web (SaaS)** moderno, elegante e responsivo, ideal para acompanhamento, suporte manual e gerenciamento de perfis multi-usuário.

---

## 🚀 Continuidade no Lovable

Se você está assumindo o desenvolvimento deste projeto no **Lovable**, comece lendo estes documentos críticos na seguinte ordem para compreender todo o contexto, as APIs e as prioridades:

1.  📂 **[docs/lovable-handoff/00-README.md](docs/lovable-handoff/00-README.md)** (Visão Geral do Handoff)
2.  📂 **[docs/lovable-handoff/16-CURRENT-STATUS.md](docs/lovable-handoff/16-CURRENT-STATUS.md)** (Diagnóstico e Estado de Cada Recurso)
3.  📂 **[docs/lovable-handoff/17-KNOWN-ISSUES.md](docs/lovable-handoff/17-KNOWN-ISSUES.md)** (Débitos Técnicos e Problemas Conhecidos)
4.  📂 **[docs/lovable-handoff/19-NEXT-STEPS.md](docs/lovable-handoff/19-NEXT-STEPS.md)** (Roteiro e Próximos Passos de Engenharia)
5.  📂 **[docs/lovable-handoff/20-LOVABLE-START-PROMPT.md](docs/lovable-handoff/20-LOVABLE-START-PROMPT.md)** (Prompt de inicialização pronto para copiar e colar no Lovable)

---

## 🛠️ Stack Utilizada

*   **FRONTEND:** React (Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide-React).
*   **BACKEND:** Express Server (Node.js, TypeScript).
*   **BANCO DE DADOS:** Banco baseado em arquivo JSON local (`/data/db.json`) gerenciado via `/server/db.ts` (Sem SQL/Postgres ainda, pronto para migração via schema SQL disponível).
*   **INTEGRAÇÃO WHATSAPP:** Provider **Uazapi** (Loops SSE + Webhooks HTTP).
*   **INTELIGÊNCIA ARTIFICIAL:** SDK oficial `@google/genai` conectando os modelos `'gemini-3.5-transcribe'` (áudio/voz) e `'gemini-3.8-flash'` / `'gemini-3.6-flash'` (texto e Tool Calling).

---

## 📌 Requisitos e Instalação

### Pré-requisitos:
*   Node.js (v18+) instalado localmente.
*   Chave de API do Gemini (`GEMINI_API_KEY`) ativa.

### Instalação:
1.  Clone este repositório no seu computador:
    ```bash
    git clone https://github.com/joaogabrielmenezes8-cmyk/ursojr.git
    cd ursojr
    ```
2.  Instale todas as dependências do projeto:
    ```bash
    npm install
    ```
3.  Crie o arquivo de configurações locais baseado no template:
    ```bash
    cp .env.example .env
    ```

---

## 🔑 Variáveis de Ambiente

Configure as seguintes chaves no seu arquivo `.env`:

```bash
# GEMINI_API_KEY: Chave obtida no Google AI Studio (Obrigatório)
GEMINI_API_KEY="SUA_CHAVE_GEMINI_API"

# APP_URL: URL oficial da sua hospedagem (Obrigatório para webhooks em produção)
APP_URL="https://sua-url-aqui.com"

# Integração WhatsApp (Uazapi)
UAZAPI_BASE_URL="https://bearcontrol.uazapi.com"
UAZAPI_TOKEN="seu-token-uazapi-aqui"
UAZAPI_INSTANCE_ID="sua-instancia-aqui"
```

---

## 💻 Execução Local e Build

### Modo de Desenvolvimento:
Para iniciar o painel web e o servidor Express integrados:
```bash
npm run dev
```
O painel administrativo estará ativo localmente em `http://localhost:3000`.

### Compilação de Produção (Build):
Para gerar a pasta otimizada de frontend (`dist/`) e o bundle compilado do servidor:
```bash
npm run build
```

---

## 📐 Arquitetura Resumida

O URSO JR. opera como uma esteira reativa altamente desacoplada:

1.  **Entrada (WhatsApp):** As mensagens chegam via SSE contínuo ou Webhooks HTTP na porta `3000`.
2.  **Identificação e Lock:** O sistema normaliza a mensagem, limpa o ID, deduplica e identifica o perfil associado pelo número de telefone de faturamento.
3.  **Processamento de IA (Gemini):** Se for voz, transcreve com `gemini-3.5-transcribe`. O texto é submetido ao modelo principal com injeção automática de histórico do chat e memórias do usuário.
4.  **Execução Operacional (Tools):** A IA decide chamar ferramentas (ex: `create_task`, `create_event`) que executam as tarefas de faturamento reais no Google Calendar ou Google Tasks do usuário.
5.  **Notificação e Retorno:** O robô gera uma resposta amigável e envia via Uazapi para o WhatsApp do usuário final.
