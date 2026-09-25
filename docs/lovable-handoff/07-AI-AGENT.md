# URSO JR. — Seu estagiário com IA
## 07-AI-AGENT.md — Agente de Inteligência Artificial e Tool Calling

Este documento descreve detalhadamente o funcionamento da inteligência artificial, o faturamento de contexto e o mapeamento de ferramentas (**Tool Calling**).

---

### 1. Engine e Modelos (Gemini)

O URSO JR. utiliza a API do **Gemini** por meio do SDK oficial `@google/genai`:

*   **Raciocínio & Tool Calling:** Prioriza `'gemini-3.8-flash'` e `'gemini-3.6-flash'`. Esses modelos possuem latência extremamente baixa, capacidade robusta de Tool Calling e excelente compreensão do idioma Português (Brasil).
*   **Transcrição de Áudio:** Utiliza o modelo especializado `'gemini-3.5-transcribe'`.

---

### 2. Injeção de Contexto e Memórias (Dynamic Prompting)

Em cada interação, o agente recebe um prompt dinâmico que injeta:

1.  **Fatos e Preferências (Memórias):** O banco de dados busca fatos salvos pelo usuário (ex: *"Meu e-mail profissional é x"*, *"Sempre me lembre de tomar remédio às 9h"*), injetando-os como regras fixas de contexto.
2.  **Histórico Recente de Conversa:** Carrega as últimas 6 mensagens trocadas no chat para garantir continuidade contextual (ex: *"Muda ela para sexta"* — sabe que *"ela"* refere-se à última tarefa criada).
3.  **Fuso Horário & Calendário Real:** Fornece o horário atual local em Montes Claros/São Paulo (`America/Sao_Paulo`) para que a IA possa resolver datas como *"amanhã"*, *"quinta"* ou *"semana que vem"* corretamente.

---

### 3. Processamento Temporal Heurístico

Além da IA, o arquivo `/server/agent.ts` implementa resolvedores determinísticos de linguagem natural via `resolveTime`. Isso permite converter termos comuns da cultura de produtividade brasileira em datas ISO reais:
*   *"depois do almoço"* → `14:00`
*   *"de manhã"* → `09:00`
*   *"à tarde"* → `15:00`
*   *"à noite"* → `19:30`
*   *"amanhã às 14h"* → calcula o dia seguinte às 14:00
*   Suporta nomes de dias de semana em português (segunda, terça, quarta, etc.).

---

### 4. Mapeamento de Ferramentas (Tool Calling / Function Calling)

O agente declara **24 ferramentas (functions)** de controle operacional. Todas estão descritas em `/server/agent.ts`.

| Nome da Ferramenta | Parâmetros de Entrada | Função Operacional | Efeitos Colaterais |
| :--- | :--- | :--- | :--- |
| `create_task` | `title` (req), `description`, `priority`, `due_at` | Cria uma nova tarefa | Salva localmente no `db.json` e envia para o **Google Tasks** remanescente. |
| `update_task` | `task_title_or_id` (req), `due_at`, `new_title` | Altera data de vencimento ou nome de uma tarefa | Modifica registro localmente e no Google Tasks. |
| `complete_task` | `task_title_or_id` (req) | Conclui uma tarefa existente | Atualiza status para 'completed' no local e no Google. |
| `delete_task` | `task_title_or_id` (req) | Exclui/Cancela tarefa | Remove do banco local e deleta no Google Tasks. |
| `delete_tasks` | `filter` (req: today, tomorrow, all, query), `query` | Exclui múltiplas tarefas | Exclusão em lote de tarefas no banco local e remoto. |
| `list_tasks` | `date_filter`, `status`, `query` | Consulta as tarefas pendentes | Apenas leitura (sem efeitos colaterais). |
| `create_reminder` | `title` (req), `message`, `scheduled_at` (req), `recurrence` | Agenda alerta automático via WhatsApp | Insere novo registro na fila de envios da tabela `reminders`. |
| `list_reminders` | `status` (pending, sent, all) | Lista os lembretes do WhatsApp | Apenas leitura. |
| `delete_reminder` | `reminder_title_or_id` | Cancela ou remove lembrete pendente | Exclui o lembrete da fila de disparo. |
| `create_event` | `title` (req), `start_time` (req), `end_time`, `duration_minutes`, `location`, `description`, `force_conflict` | Agenda compromisso com teste de conflito de horários | Se não houver conflito, cria no local e no **Google Calendar**. Se houver, retorna opções ao usuário. |
| `update_event` | `event_title_or_id` (req), `new_start_time` (req), `new_end_time`, `new_title` | Altera horário ou dia de compromisso | Modifica no banco local e no Google Calendar. |
| `delete_event` | `event_title_or_id` (req) | Remove compromisso da agenda | Exclui do banco local e do Google Calendar. |
| `check_availability`| `date` (req), `period`, `duration_minutes` | Verifica janelas e horários livres na agenda | Apenas leitura de conflitos. |
| `list_events` | `date_filter`, `query` | Lista compromissos do calendário | Apenas leitura. |
| `create_note` | `title` (req), `content` (req), `tags` | Cria anotação estática rápida | Insere registro na tabela `notes`. |
| `search_notes` | `query` (req) | Pesquisa anotações por palavra-chave | Apenas leitura. |
| `find_contact` | `name` (req) | Busca e-mail ou telefone de contatos | Apenas leitura. |
| `create_contact` | `name` (req), `phone` (req), `company`, `role`, `notes` | Cadastra novo contato | Salva novo registro na tabela `contacts`. |
| `save_memory` | `key` (req), `value` (req), `category` | Memoriza preferências de longo prazo | Insere ou atualiza fatos na tabela `memories`. |
| `get_daily_summary` | `date` | Compila briefing completo do dia | Apenas leitura unificada. |
| `create_expense` | `description` (req), `amount` (req), `category`, `date` | Lança despesa financeira ou compra | Insere registro na tabela `expenses`. |
| `update_expense` | `expense_id_or_description`, `new_amount`, `new_description` | Corrige valor de despesa lançada | Altera registro financeiro localmente. |
| `list_expenses` | `period` (today, month, recent, all) | Calcula totais e lista compras | Apenas leitura. |
| `correct_last_action`| `action` (req: split, replace, update_value, delete), `entity_type`, `split_items`, `new_title`, `new_time_or_due`, `new_amount` | Desfaz ou edita contextual do último pedido do usuário | **Ferramenta Heurística:** Corrige, edita, deleta ou divide em várias partes o último item lançado (tarefa, despesa ou evento) de forma inteligente. |

---

### 5. Tratamento de Ambiguidade e Fallbacks

Se a API do Gemini falhar por completo ou as credenciais forem invalidadas, o sistema possui um motor determinístico de backup (**Fallback Engine**):
*   **`fallbackEngine()`:** Executa rotinas de processamento de linguagem natural (NLP) simples baseadas em Regex para capturar e executar comandos simples como *"listar tarefas"*, *"compras"*, *"quanto gastei"*, *"criar tarefa [x]"* de forma direta, garantindo que o assistente responda mesmo se a API do Gemini cair ou estiver sem limites de créditos.
*   **Logs e Auditoria:** Cada decisão do robô é registrada na tabela `agent_actions`, permitindo verificar exatamente qual ferramenta foi chamada e depurar o comportamento do robô.
