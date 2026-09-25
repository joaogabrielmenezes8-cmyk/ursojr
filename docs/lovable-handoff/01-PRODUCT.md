# URSO JR. — Seu estagiário com IA
## 01-PRODUCT.md — Documentação de Produto e Módulos

Este documento detalha o escopo de produto, regras de negócio e funcionamento detalhado de cada módulo presente na aplicação.

---

### 1. Dashboard (Painel Principal)
*   **Objetivo:** Oferecer uma visão unificada e imediata do status de produtividade do usuário (tarefas do dia, próximos compromissos, lembretes ativos e saúde do sistema).
*   **Fluxo de Operação:** Ao carregar a página inicial, o frontend faz uma requisição HTTP GET para `/api/dashboard`. O servidor responde compilando dados agregados extraídos do arquivo `db.json`.
*   **Fonte de Dados:** Tabelas em memória (`events`, `tasks`, `reminders`, `webhook_events`, `profiles`).
*   **Ações Disponíveis:**
    *   Visualizar tarefas pendentes e atrasadas.
    *   Visualizar compromissos agendados para hoje.
    *   Monitorar status de conexão com WhatsApp.
    *   Visualizar estatísticas gerais rápidas.
    *   Acessar o **Simulador Interativo de Chat** (permite testar comandos por texto ou áudio sem precisar enviar mensagens reais via WhatsApp).
*   **Dependências:** Classe `Database` (`/server/db.ts`), componentes visuais Lucide e animações Framer Motion.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. O painel carrega as estatísticas dinamicamente e sincroniza-se em tempo real com as alterações do banco JSON.

---

### 2. Agenda (Calendário)
*   **Objetivo:** Permitir ao usuário visualizar e organizar seus compromissos, reuniões, treinos e consultas de forma visual e intuitiva no painel web, em sintonia fina com o Google Calendar.
*   **Fluxo de Operação:** O frontend faz chamadas para `/api/events` para listar, criar, editar e excluir compromissos. Caso o Google Calendar esteja conectado, as chamadas são repassadas em segundo plano para a API do Google Calendar para criação de eventos reais.
*   **Fonte de Dados:** Tabela `events` do `db.json` e dados remotos do Google Calendar.
*   **Ações Disponíveis:**
    *   Visualizar a lista cronológica de eventos.
    *   Adicionar novo compromisso (com título, descrição, local, data de início e término).
    *   Editar detalhes de compromisso existente.
    *   Excluir compromisso.
*   **Dependências:** Google Calendar Service (`/server/google/calendar.ts`), Google OAuth.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Suporta criação manual pela interface e por comandos da IA, além de detecção avançada de conflitos (com opção de forçar criação ou sugerir horários alternativos).

---

### 3. Tarefas (To-Do List)
*   **Objetivo:** Oferecer um painel de gerenciamento de tarefas estruturado por prioridades, integrado nativamente ao Google Tasks.
*   **Fluxo de Operação:** As tarefas são listadas via `/api/tasks`. Mudanças de estado de tarefas refletem tanto no banco local quanto na lista remota correspondente do Google Tasks.
*   **Fonte de Dados:** Tabela `tasks` do `db.json` e dados remotos do Google Tasks.
*   **Ações Disponíveis:**
    *   Visualizar tarefas categorizadas por prioridade (**Urgente**, **Alta**, **Normal**, **Baixa**).
    *   Criar nova tarefa com título, descrição opcional, prazo e prioridade.
    *   Marcar tarefa como concluída (conclusão reflete no Google Tasks).
    *   Excluir tarefa.
*   **Dependências:** Google Tasks Service (`/server/google/tasks.ts`), Google OAuth.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Integração bidirecional robusta, refletindo alterações instantaneamente.

---

### 4. Lembretes (Notificações por WhatsApp)
*   **Objetivo:** Criar e disparar alertas automáticos que o URSO JR. enviará diretamente para o WhatsApp do usuário no horário determinado.
*   **Fluxo de Operação:** Os lembretes são inseridos no banco local. Um processo agendado (Scheduler) roda a cada 30 segundos no servidor Express, varrendo lembretes pendentes com data de agendamento menor ou igual ao horário atual, realizando o disparo via Uazapi.
*   **Fonte de Dados:** Tabela `reminders` do `db.json`.
*   **Ações Disponíveis:**
    *   Visualizar lista de lembretes pendentes e enviados.
    *   Adicionar novo lembrete com assunto, mensagem de notificação, horário de disparo e regra de recorrência (Nenhuma, Diário, Semanal, Mensal, Dias úteis).
    *   Cancelar/Excluir lembrete pendente.
*   **Dependências:** Background Scheduler (`/server/scheduler.ts`), WhatsApp Provider (`/server/providers/messaging.ts`).
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. O sistema de disparo e gerenciamento de recorrências via Cron local está totalmente implementado e ativo.

---

### 5. Notas (Anotações e Insights)
*   **Objetivo:** Permitir ao usuário armazenar anotações rápidas, ideias de pautas de reuniões, senhas, tags ou informações estáticas que o URSO JR. possa recuperar quando solicitado.
*   **Fluxo de Operação:** CRUD simples de anotações exposto via `/api/notes`.
*   **Fonte de Dados:** Tabela `notes` do `db.json`.
*   **Ações Disponíveis:**
    *   Criar notas com título, conteúdo e tags de agrupamento.
    *   Marcar nota como favorita.
    *   Excluir nota.
*   **Dependências:** Database.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Interface moderna baseada em grid de cartões estilo post-it.

---

### 6. Contatos (Fornecedores e Equipe)
*   **Objetivo:** Armazenar uma agenda interna de contatos (e-mail, telefone, empresa, notas e função) que serve de apoio para a IA realizar agendamentos ou consultar detalhes em nome do usuário.
*   **Fluxo de Operação:** CRUD de contatos exposto via `/api/contacts`.
*   **Fonte de Dados:** Tabela `contacts` do `db.json`.
*   **Ações Disponíveis:**
    *   Visualizar catálogo de contatos com busca por nome.
    *   Criar novo contato (nome, telefone com DDD, e-mail, empresa, cargo e observações).
    *   Editar detalhes de contato existente.
    *   Excluir contato.
*   **Dependências:** Database.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Tela simples em estilo de lista clássica com formulários intuitivos.

---

### 7. Conversas (Histórico do WhatsApp)
*   **Objetivo:** Monitorar e exibir o histórico completo das mensagens trocadas em tempo real entre o usuário e o assistente de IA.
*   **Fluxo de Operação:** O painel lista todas as conversas e, ao clicar em uma delas, puxa as mensagens associadas através de `/api/conversations/:id/messages`.
*   **Fonte de Dados:** Tabelas `conversations` e `messages` do `db.json`.
*   **Ações Disponíveis:**
    *   Visualizar lista de contatos que interagiram com a IA no WhatsApp.
    *   Ler o histórico de mensagens agrupadas em formato de bolhas de chat (estilo WhatsApp).
    *   **Responder manualmente:** O operador do painel web pode enviar mensagens personalizadas em tempo real para o WhatsApp do usuário, sobrepondo-se ao robô.
*   **Dependências:** WhatsApp Provider (`/server/providers/messaging.ts`).
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Permite leitura dinâmica e intervenção manual fluida de mensagens.

---

### 8. Memória da IA (Preferências e Fatos de Longo Prazo)
*   **Objetivo:** Permitir ao usuário visualizar e gerenciar as preferências ou regras de longo prazo que o URSO JR. aprendeu e memorizou sobre ele (ex: seu horário de almoço, seu nicho de atuação, seu fornecedor padrão).
*   **Fluxo de Operação:** Exposição das preferências memorizadas via `/api/memories`.
*   **Fonte de Dados:** Tabela `memories` do `db.json`.
*   **Ações Disponíveis:**
    *   Visualizar fatos memorizados ordenados por categorias (**Preferências**, **Fatos**, **Regras**, **Trabalho**).
    *   Adicionar novas memórias manualmente pelo painel.
    *   Remover memórias indesejadas que a IA tenha aprendido erroneamente.
*   **Dependências:** Database.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Funciona como uma central de controle sobre as diretrizes operacionais do estagiário.

---

### 9. Automações (Agendamentos e Briefing Diário)
*   **Objetivo:** Visualizar os fluxos automatizados ativados na conta do usuário, como o **Briefing Matinal Automático** (Resumo do Dia).
*   **Fluxo de Operação:** Exibe a configuração do resumo diário dinamicamente.
*   **Fonte de Dados:** Dados do perfil logado (`profiles`).
*   **Ações Disponíveis:**
    *   Ativar ou desativar o Briefing Diário automático.
    *   Configurar o horário exato de recebimento do briefing no WhatsApp (ex: 07:30).
*   **Dependências:** Scheduler (`/server/scheduler.ts`) e Google API Sync.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. O cron do servidor Express dispara automaticamente o briefing do dia montado pelo Gemini no horário agendado de cada perfil de usuário.

---

### 10. WhatsApp Uazapi (Instância e Webhook)
*   **Objetivo:** Conectar o painel web à conta oficial do WhatsApp por meio do provider Uazapi, acompanhando o status do QR Code, sincronizando o webhook e enviando mensagens de teste.
*   **Fluxo de Operação:** Consulta o status através de `/api/whatsapp/status` e `/api/whatsapp/sse-status`. Sincroniza o webhook através de `/api/whatsapp/sync-webhook`.
*   **Fonte de Dados:** Credenciais da Uazapi e requisições HTTP para a API remota da Uazapi.
*   **Ações Disponíveis:**
    *   Visualizar status atual do WhatsApp (Conectado / Desconectado).
    *   Visualizar dados de profile name e número da conta logada.
    *   Reiniciar o Listener SSE em tempo real.
    *   Sincronizar a URL de Webhook do preview na Uazapi automaticamente.
    *   Enviar mensagem de teste de texto para um número qualquer do WhatsApp.
*   **Dependências:** UazapiProvider (`/server/providers/messaging.ts`).
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Suporta restauração inteligente, sincronização automática de endpoints e detecção de quebras de conexão.

---

### 11. Auditoria da IA (Logs do Agente)
*   **Objetivo:** Fornecer rastreabilidade total de todas as decisões tomadas pelo robô, mostrando o que o usuário enviou, qual intenção foi detectada pelo Gemini, quais ferramentas (tools) ele chamou e qual resposta final foi gerada.
*   **Fluxo de Operação:** Lista as últimas ações do agente através de `/api/agent-actions`.
*   **Fonte de Dados:** Tabela `agent_actions` do `db.json`.
*   **Ações Disponíveis:**
    *   Visualizar lista cronológica de interações processadas pela IA.
    *   Expandir log para visualizar os parâmetros exatos (argumentos de entrada) e retornos da ferramenta chamada.
*   **Dependências:** Database.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. Essencial para depuração rápida do Tool Calling e diagnóstico de respostas inadequadas.

---

### 12. Diagnóstico do Sistema (Health Check)
*   **Objetivo:** Exibir de forma simplificada e em tempo real a saúde técnica de cada pilar da aplicação (Banco, Inteligência Artificial, Conexão WhatsApp, Webhook e Agendadores).
*   **Fluxo de Operação:** O frontend consome o endpoint `/api/diagnostics` que executa testes rápidos locais e responde com latências e contadores.
*   **Fonte de Dados:** Classe `Database` e variáveis de ambiente.
*   **Ações Disponíveis:**
    *   Visualizar semáforos visuais (Verde / Vermelho) para cada serviço crítico.
    *   Visualizar volume total de registros salvos, latências do banco e status da chave do Gemini.
*   **Dependências:** Diagnóstico dinâmico em `db.ts`.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. O diagnóstico é gerado instantaneamente na tela.

---

### 13. Configurações & Família (Multi-User)
*   **Objetivo:** Permitir ao usuário configurar seus dados de perfil (Nome, fuso horário, horário do briefing) e gerenciar perfis de membros da família ou equipe (Multi-User) para que cada membro tenha seu próprio assistente isolado.
*   **Fluxo de Operação:** Exposição de endpoints CRUD em `/api/profiles`.
*   **Fonte de Dados:** Tabela `profiles` do `db.json`.
*   **Ações Disponíveis:**
    *   Editar o perfil principal da conta (user_default).
    *   Adicionar novos membros da casa / equipe com nome e telefone.
    *   Visualizar o **Link Único de Cadastro** de membros (permite convidar outras pessoas via WhatsApp para sincronizarem suas próprias contas do Google de forma isolada!).
*   **Dependências:** Database, Google OAuth.
*   **Estado Atual:** ✅ **TOTALMENTE FUNCIONAL**. A estrutura é nativamente preparada para multi-usuários, isolando conversas e tarefas de cada telefone cadastrado de forma automática.
