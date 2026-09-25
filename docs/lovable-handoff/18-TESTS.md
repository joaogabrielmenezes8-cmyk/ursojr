# URSO JR. — Seu estagiário com IA
## 18-TESTS.md — Estratégia de Testes e Checklists de Aceitação

Este documento orienta os procedimentos de teste manual e automatizado, além de consolidar as checklists de aceitação necessárias para garantir que o sistema opere livre de regressões.

---

### 1. Estado Atual dos Testes

*   **Testes Automatizados:** Não configurado / Não existente no projeto por enquanto.
*   **Testes Manuais Realizados:** Toda a esteira de recebimento, normalização, Tool Calling do Gemini, integração Google Calendar / Tasks e disparos automáticos via WhatsApp foram exaustivamente simulados de forma unitária no console local por meio do **Simulador de Chat** e logs de auditoria.

---

### 2. Checklists de Aceitação de Funcionalidades

O novo desenvolvedor deve utilizar estas checklists manuais para certificar-se de que a esteira principal de processos está funcionando perfeitamente:

#### 🟩 Checklist A: Fluxo WhatsApp → IA → Google Calendar
*   [ ] Usuário envia áudio ou texto no WhatsApp dizendo: *"Agende reunião com Marcos amanhã às 14h sobre o portão"*.
*   [ ] O backend recebe a mensagem, baixa e transcreve o áudio (se for áudio) com sucesso.
*   [ ] O Agente de IA detecta a intenção de criar um evento e aciona a ferramenta `create_event`.
*   [ ] A ferramenta valida conflitos de horário no Google Calendar da conta vinculada.
*   [ ] O evento é criado com sucesso localmente e enviado para o **Google Calendar** oficial.
*   [ ] O robô responde amigavelmente confirmando o agendamento de volta no WhatsApp com emojis adequados.
*   [ ] O usuário abre o Google Agenda no celular e vê o compromisso registrado no horário correto.

#### 🟩 Checklist B: Fluxo WhatsApp → IA → Google Tasks
*   [ ] Usuário envia mensagem dizendo: *"Preciso comprar ração para o Rex hoje à tarde"*.
*   [ ] A IA interpreta a intenção e chama a ferramenta `create_task`.
*   [ ] A tarefa é gravada na coleção `tasks` e sincronizada instantaneamente na conta **Google Tasks** da pessoa.
*   [ ] O robô responde no WhatsApp confirmando a adição na lista de afazeres.
*   [ ] O usuário marca a tarefa como concluída e a alteração reflete no painel e na timeline.

#### 🟩 Checklist C: Fluxo WhatsApp → Agendamento de Lembrete
*   [ ] Usuário envia: *"Me lembra amanhã às 9h de tomar o remédio da pressão"*.
*   [ ] A IA reconhece e chama a ferramenta `create_reminder`.
*   [ ] O lembrete é gravado como `'pending'` com o faturamento temporal exato calculado.
*   [ ] No horário agendado, o Scheduler do backend detecta o gatilho, dispara a mensagem via WhatsApp e marca o lembrete como `'sent'`.

#### 🟩 Checklist D: Sincronização Google → Painel App
*   [ ] O operador abre o painel e clica em "Sincronizar Google" (ou o cron de sincronização em lote roda).
*   [ ] O backend faz a leitura de todas as tarefas e compromissos novos criados diretamente no celular (fora do bot) e atualiza o `db.json`.
*   [ ] Os novos itens aparecem instantaneamente nas abas "Agenda" e "Tarefas" do painel web.

#### 🟩 Checklist E: Proteção contra Duplicidade (Webhook / SSE)
*   [ ] A Uazapi dispara o webhook HTTP POST e a notificação via SSE ao mesmo tempo para a mesma mensagem.
*   [ ] O backend identifica o ID de mensagem repetido em `inFlightMessageIds` ou `isWebhookProcessed` e descarta a segunda notificação silenciosamente.
*   [ ] O robô responde ao usuário exatamente uma única vez no WhatsApp.

#### 🟩 Checklist F: Contexto Conversacional Contínuo
*   [ ] Usuário envia: *"Criar tarefa: Comprar pão"*.
*   [ ] O robô responde confirmando a criação.
*   [ ] Usuário envia em seguida: *"Muda ela para amanhã"*.
*   [ ] O robô lê as mensagens anteriores do histórico do chat, identifica que *"ela"* refere-se à tarefa *"Comprar pão"* e altera o prazo dela para o dia seguinte, respondendo com sucesso.
*   [ ] A alteração de data reflete no Google Tasks remanescente.
