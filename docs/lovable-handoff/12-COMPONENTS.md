# URSO JR. — Seu estagiário com IA
## 12-COMPONENTS.md — Catálogo de Componentes Reutilizáveis

Este documento cataloga e descreve os principais componentes React de frontend e suas respectivas responsabilidades operacionais dentro do painel web do URSO JR.

---

### 1. Tabela de Componentes Centrais

| Componente | Arquivo | Função Principal | Utilizado em |
| :--- | :--- | :--- | :--- |
| **`Sidebar`** | `/src/components/Sidebar.tsx` | Renderiza o menu lateral de navegação escura, gerencia abas ativas, exibe contadores dinâmicos de tarefas/lembretes pendentes e perfil do usuário. | `/src/App.tsx` (Layout Principal) |
| **`Header`** | `/src/components/Header.tsx` | Cabeçalho superior contendo título da aba ativa, semáforo dinâmico de status do WhatsApp, botões de ação rápida e botão de acionar o simulador. | `/src/App.tsx` (Layout Principal) |
| **`Modal`** | `/src/components/Modal.tsx` | Caixa de diálogo/modal genérico e acessível que serve de casca (backdrop + bordas) para qualquer formulário ou aviso sobreposto. | `/src/App.tsx` (Formulários rápidos) |
| **`SimulatorModal`**| `/src/components/SimulatorModal.tsx`| Abre a interface flutuante do **Simulador do Agente**, que permite ao operador digitar comandos ou gravar áudios para interagir com o robô localmente. | `/src/App.tsx` |
| **`UrsoLogo`** | `/src/components/UrsoLogo.tsx` | Desenha dinamicamente por vetor (SVG) a logo oficial do **URSO JR.** (símbolo simplificado ou logo horizontal completa em verde-limão). | `/src/components/Sidebar.tsx`, `/src/components/views/RegisterView.tsx` |
| **`VoiceButton`** | `/src/components/VoiceButton.tsx` | Botão interativo com efeito de gravação de áudio em tempo real, indicando estados de gravação ativa, processamento e envio do microfone. | `/src/components/SimulatorModal.tsx`, `/src/components/views/ConversationsView.tsx` |
| **`RegisterView`** | `/src/components/views/RegisterView.tsx`| Tela inteira auto-contida para cadastro de novos membros com popup Google OAuth e redirecionamento para o WhatsApp do bot. | `/src/App.tsx` (Roteamento estrito por pathname) |

---

### 2. Componentes de Visualização (Sub-Views de Conteúdo)

Todas as telas do painel web são modulares e desacopladas, localizadas em `/src/components/views/`. Elas recebem dados via propriedades (props) e gerenciam as chamadas à API local.

*   **`DashboardView`:** Tela inicial contendo cartões dinâmicos, resumo de compromissos de hoje, tarefas atrasadas e lista de atividades de auditoria recentes.
*   **`AgendaView`:** Exibe a agenda cronológica em formato de timeline moderna, permitindo criar novos compromissos manuais com tratamento de conflito de fuso horário.
*   **`TasksView`:** Grid interativo de afazeres agrupados por prioridades urgentes, altas, normais e baixas. Conta com marcas de check reativas.
*   **`ConversationsView`:** Interface de suporte e chat unificada que exibe os canais do WhatsApp e as bolhas de chat (inbound/outbound), permitindo interversão humana para enviar mensagens em tempo real.
*   **`DiagnosticsView`:** Painel contendo semáforos verdes e vermelhos que revelam a integridade e saúde de conexões de APIs, banco de dados e servidores em tempo real.
*   **`WhatsAppView`:** Mostra os dados detalhados da conexão WhatsApp oficial da Uazapi da conta.
