# URSO JR. — Seu estagiário com IA
## 03-FOLDER-STRUCTURE.md — Estrutura de Pastas e Responsabilidades

Este documento descreve detalhadamente o layout do repositório, mapeando a árvore de arquivos reais e explicitando a responsabilidade de cada pasta e módulo.

---

### 1. Mapa de Estrutura do Repositório (Árvore Real)

```text
/
├── data/                               # Armazenamento físico de persistência
│   └── db.json                         # Banco de dados local em formato JSON
├── docs/                               # Pasta de documentação técnica
│   └── lovable-handoff/                # Pacote completo de handoff para Lovable
├── public/                             # Recursos públicos acessíveis estaticamente
│   ├── brand/                          # Logos, símbolos e mascotes oficiais (SVG/PNG)
│   ├── assets/                         # Imagens gerais do painel
│   ├── favicon.ico                     # Favicon do app
│   └── manifest.json                   # manifesto de PWA para instalação no celular
├── scripts/                            # Scripts auxiliares e automações locais
├── server/                             # Lógica de backend em TypeScript
│   ├── google/                         # Integradores do ecossistema Google Workspace
│   │   ├── calendar.ts                 # Proxies de chamadas para o Google Calendar
│   │   └── tasks.ts                    # Proxies de chamadas para o Google Tasks
│   ├── providers/                      # Fornecedores e adaptadores de IO
│   │   └── messaging.ts                # Integrador de envio/recebimento com a Uazapi
│   ├── services/                       # Serviços auxiliares de backend
│   │   ├── audio-transcription.ts      # Transcrição de áudio via Gemini Transcribe
│   │   └── uazapi-listener.ts          # Ouvinte em segundo plano de SSE da Uazapi
│   ├── agent.ts                        # Implementação principal do Agente de IA e Tools
│   ├── db.ts                           # Classe Database de persistência do db.json
│   └── scheduler.ts                    # Cron/Agendador em segundo plano de disparos
├── src/                                # Lógica de frontend (React + Vite)
│   ├── components/                     # Componentes visuais globais reutilizáveis
│   │   ├── views/                      # Telas (views) inteiras do painel web
│   │   │   ├── AgendaView.tsx          # Tela do Calendário (Agenda)
│   │   │   ├── AuditView.tsx           # Tela de Auditoria do Agente de IA
│   │   │   ├── AutomationsView.tsx     # Tela de Automações e Resumo Diário
│   │   │   ├── ContactsView.tsx        # Tela de Gerenciamento de Contatos
│   │   │   ├── ConversationsView.tsx   # Tela de Chat e Intervenção Manual
│   │   │   ├── DashboardView.tsx       # Tela Inicial e Simulador do Agente
│   │   │   ├── DiagnosticsView.tsx     # Tela de Semáforos e Latências (Health Check)
│   │   │   ├── MemoryView.tsx          # Tela de Ajuste de Memória da IA
│   │   │   ├── NotesView.tsx           # Tela de Bloco de Notas (Post-its)
│   │   │   ├── RegisterView.tsx        # Tela de Cadastro de Novos Usuários (Google Sync)
│   │   │   ├── RemindersView.tsx       # Tela de Agendamento de Lembretes WhatsApp
│   │   │   ├── SettingsView.tsx        # Tela de Configurações e Link de Cadastro
│   │   │   ├── TasksView.tsx           # Tela de Gerenciamento de Tarefas por Prioridade
│   │   │   └── WhatsAppView.tsx        # Tela de Status da Instância e QR Code
│   │   ├── Header.tsx                  # Cabeçalho do painel
│   │   ├── Sidebar.tsx                 # Barra lateral de navegação
│   │   ├── SimulatorModal.tsx          # Modal do simulador de comandos de IA
│   │   ├── UrsoLogo.tsx                # Renderizador dinâmico de SVG da logo do Urso
│   │   └── VoiceButton.tsx             # Botão de gravação de áudio no painel
│   ├── hooks/                          # Custom Hooks do React
│   │   └── useVoiceRecognition.ts      # Manipulador do microfone para áudios no painel
│   ├── services/                       # Serviços auxiliares de frontend
│   │   └── googleAuth.ts               # Integrador do Google Identity Client e Popup
│   ├── types/                          # Contratos e definições de dados globais
│   │   └── index.ts                    # Definições das interfaces e enums TypeScript
│   ├── App.tsx                         # Roteador frontend e renderizador principal
│   ├── index.css                       # Importações globais do Tailwind CSS
│   └── main.tsx                        # Ponto de entrada de renderização do React
├── .env.example                        # Variáveis de ambiente exemplificadas (seguras)
├── firebase-applet-config.json         # Configuração provisória de ecossistema
├── index.html                          # Arquivo HTML principal do applet
├── package.json                        # Dependências, bibliotecas e scripts npm
├── server.ts                           # Ponto de entrada central do servidor Express
├── tsconfig.json                       # Configurações globais de compilação do TypeScript
└── vite.config.ts                      # Configuração de bundler do Vite
```

---

### 2. Responsabilidades Principais

*   **`server.ts` (Raiz):** Centraliza a escuta da porta `3000`, montagem de rotas de API, ativação do middleware dinâmico do Vite (durante o desenvolvimento) ou disponibilização dos assets estáticos da pasta `dist/` (durante a execução em produção).
*   **`server/db.ts`:** Funciona como um minidriver de banco de dados. Lê e escreve diretamente no arquivo JSON e provê APIs similares a um ORM clássico para inserção, atualização e exclusão de registros.
*   **`server/agent.ts`:** Concentra os prompts fundamentais e a inteligência de decisão. É onde as ferramentas (como `create_task`, `create_event`) estão declaradas e emparelhadas com os resolvedores que invocam os proxies do Google.
*   **`src/App.tsx`:** Controla o estado global da tela ativa, gerencia as abas da barra lateral e expõe o painel web de forma consistente.
*   **`src/types/index.ts`:** Funciona como o contrato único de interfaces. Todas as tabelas simuladas no banco de dados JSON e todas as estruturas de dados no frontend usam estritamente as interfaces declaradas aqui.
