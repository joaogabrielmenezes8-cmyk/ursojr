# URSO JR. — Seu estagiário com IA
## 04-DATABASE.md — Inventário e Modelo do Banco de Dados

Este documento descreve detalhadamente a estrutura de dados atual em uso na aplicação. 

Atualmente, o banco de dados é simulado fisicamente em um arquivo JSON persistente local localizado em `/data/db.json` e gerenciado programaticamente pela classe `Database` (`/server/db.ts`). Para apoiar a migração para um banco SQL de produção (como PostgreSQL via Prisma ou Supabase), preparamos este inventário completo das tabelas em memória.

---

### 1. Visão Geral das Entidades

A base de dados é composta por **12 coleções (tabelas)** principais:

1.  **`profiles` (Perfis / Multi-Usuário):** Guarda os membros cadastrados na casa ou equipe, suas configurações de faturamento e tokens.
2.  **`tasks` (Tarefas):** Registra as tarefas de cada perfil, integradas ao Google Tasks.
3.  **`reminders` (Lembretes WhatsApp):** Guarda os alertas pontuais ou recorrentes a serem disparados no WhatsApp.
4.  **`events` (Compromissos):** Registra os eventos de agenda, integrados ao Google Calendar.
5.  **`notes` (Bloco de Notas):** Guarda as anotações do usuário.
6.  **`contacts` (Agenda de Contatos):** Armazena o cadastro de fornecedores e equipe.
7.  **`memories` (Memória da IA):** Fatos, preferências e regras aprendidas de longo prazo de cada perfil.
8.  **`conversations` (Conversas WhatsApp):** Agrupador de chats por número de telefone.
9.  **`messages` (Histórico de Mensagens):** Todas as mensagens individuais (inbound/outbound) trocadas com o robô ou enviadas pelo painel.
10. **`agent_actions` (Auditoria da IA):** Logs detalhados das decisões, tool calls e prompts do Gemini.
11. **`webhook_events` (Histórico de Webhooks):** Todas as notificações de entrada da Uazapi salvas para diagnóstico e deduplicação.
12. **`expenses` (Financeiro / Gastos):** Lançamentos financeiros e compras efetuadas.

---

### 2. Dicionário de Dados Detalhado (Tabelas)

#### 2.1 Tabela `profiles` (Perfis de Usuários)
*   **Chave Primária:** `id` (string)
*   **Descrição:** Armazena os perfis de usuários (membro principal e membros convidados da família/equipe).

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `user_...`) | ID único do perfil |
| `phone` | VARCHAR | Não | - | Telefone com DDI e DDD (somente números) |
| `full_name` | VARCHAR | Não | - | Nome completo do usuário |
| `timezone` | VARCHAR | Não | 'America/Sao_Paulo' | Timezone para cálculo temporal da IA |
| `daily_summary_time` | VARCHAR | Não | '07:30' | Horário de recebimento do briefing matinal |
| `daily_summary_enabled`| BOOLEAN | Não | `true` | Se o envio automático do briefing está ativo |
| `whatsapp_instance_id`| VARCHAR | Sim | 'b3r' | ID da instância do WhatsApp na Uazapi |
| `whatsapp_token` | VARCHAR | Sim | - | Token de autorização da Uazapi |
| `whatsapp_base_url` | VARCHAR | Sim | 'https://bearcontrol.uazapi.com' | Endpoint base da Uazapi |
| `google_access_token` | TEXT | Sim | - | Access Token ativo do Google OAuth |
| `google_email` | VARCHAR | Sim | - | E-mail da conta Google conectada |
| `google_connected` | BOOLEAN | Sim | `false` | Indica se o Google está vinculado |
| `google_token_expired` | BOOLEAN | Sim | `false` | Indica se o token do Google expirou |
| `google_last_sync_at` | TIMESTAMP| Sim | - | Data/hora da última sincronização bem sucedida |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação do registro |

---

#### 2.2 Tabela `tasks` (Tarefas / Google Tasks)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `task_...`) | ID único da tarefa |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `title` | VARCHAR | Não | - | Nome/Título da tarefa |
| `description` | TEXT | Sim | - | Detalhes adicionais |
| `status` | VARCHAR | Não | 'pending' | Estado: 'pending', 'in_progress', 'completed', 'cancelled' |
| `priority` | VARCHAR | Não | 'normal' | Prioridade: 'low', 'normal', 'high', 'urgent' |
| `due_at` | TIMESTAMP| Sim | - | Data/Hora limite de entrega (vencimento) |
| `completed_at` | TIMESTAMP| Sim | - | Data/Hora de marcação de conclusão |
| `google_task_id` | VARCHAR | Sim | - | ID correspondente da tarefa no Google Tasks |
| `synced_at` | TIMESTAMP| Sim | - | Última sincronização com Google Tasks |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação do registro |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Data da última alteração |

---

#### 2.3 Tabela `reminders` (Lembretes de WhatsApp)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `rem_...`) | ID único do lembrete |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `title` | VARCHAR | Não | - | Assunto resumido |
| `message` | TEXT | Não | - | Conteúdo da notificação WhatsApp |
| `scheduled_at` | TIMESTAMP| Não | - | Horário exato de envio planejado |
| `recurrence_rule` | VARCHAR | Não | 'none' | Regra: 'none', 'daily', 'weekly', 'monthly', 'weekdays' |
| `status` | VARCHAR | Não | 'pending' | Estado: 'pending', 'sent', 'cancelled' |
| `sent_at` | TIMESTAMP| Sim | - | Horário exato do disparo efetuado |
| `delivery_status` | VARCHAR | Não | 'pending' | Entrega: 'pending', 'delivered', 'failed' |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |

---

#### 2.4 Tabela `events` (Compromissos / Agenda)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `evt_...`) | ID único do compromisso |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `title` | VARCHAR | Não | - | Título do compromisso |
| `description` | TEXT | Sim | - | Pauta, detalhes ou observações |
| `location` | VARCHAR | Sim | - | Local físico ou link de reunião online |
| `start_time` | TIMESTAMP| Não | - | Data/Hora de início do compromisso |
| `end_time` | TIMESTAMP| Não | - | Data/Hora de término do compromisso |
| `status` | VARCHAR | Não | 'confirmed' | Estado: 'confirmed', 'tentative', 'cancelled' |
| `google_event_id` | VARCHAR | Sim | - | ID correspondente do evento no Google Calendar |
| `html_link` | TEXT | Sim | - | Link para visualização direta no Google Calendar |
| `synced_at` | TIMESTAMP| Sim | - | Última sincronização com Google Calendar |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |

---

#### 2.5 Tabela `notes` (Bloco de Notas)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `note_...`) | ID único da nota |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `title` | VARCHAR | Não | - | Título da anotação |
| `content` | TEXT | Não | - | Conteúdo da nota |
| `tags` | TEXT (Array)| Não | `[]` | Lista de palavras-chave / Categorias |
| `is_memory` | BOOLEAN | Não | `false` | Indica se é uma memória estática estruturada |
| `is_favorite` | BOOLEAN | Não | `false` | Se a nota está fixada/favoritada |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |

---

#### 2.6 Tabela `contacts` (Cadastro de Contatos / Equipe)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `contact_...`) | ID único do contato |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `name` | VARCHAR | Não | - | Nome completo do contato |
| `phone` | VARCHAR | Não | - | Telefone com DDD |
| `email` | VARCHAR | Sim | - | Endereço de e-mail |
| `company` | VARCHAR | Sim | - | Empresa ou Organização |
| `role` | VARCHAR | Sim | - | Cargo, papel ou especialidade |
| `notes` | TEXT | Sim | - | Observações adicionais |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |

---

#### 2.7 Tabela `memories` (Fatos e Regras aprendidos pela IA)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `mem_...`) | ID único do fato |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `key` | VARCHAR | Não | - | Identificador único (ex: 'pref_almoco', 'contador') |
| `value` | TEXT | Não | - | Detalhe exato memorizado |
| `category` | VARCHAR | Não | 'fact' | Categorias: 'preference', 'fact', 'rule', 'contact_detail', 'work' |
| `confidence` | FLOAT | Não | 1.0 | Fator de confiança da IA na memória (0.0 a 1.0) |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |

---

#### 2.8 Tabela `conversations` (Controle de Chats do WhatsApp)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `conv_...`) | ID único da conversa |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil associado |
| `contact_phone`| VARCHAR | Não | - | Número de telefone da pessoa do outro lado do chat |
| `contact_name` | VARCHAR | Não | - | Nome aproximado exibido no WhatsApp |
| `last_message` | TEXT | Não | - | Último conteúdo textual trafegado |
| `last_message_at`| TIMESTAMP| Não | (Data Atual) | Horário do último envio ou recebimento |
| `unread_count` | INTEGER | Não | 0 | Quantidade de mensagens não lidas no painel |
| `avatar_color` | VARCHAR | Sim | '#4F46E5' | Cor visual da bolha no painel web |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última atualização |

---

#### 2.9 Tabela `messages` (Histórico Individual de Mensagens)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `conversation_id` (referencia `conversations.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `msg_...`) | ID único da mensagem |
| `conversation_id`| VARCHAR | Não | - | ID do canal da conversa |
| `direction` | VARCHAR | Não | - | Direção do fluxo: 'inbound' ou 'outbound' |
| `text` | TEXT | Não | - | Conteúdo da mensagem enviada ou recebida |
| `status` | VARCHAR | Não | - | Status da entrega: 'received', 'sent', 'failed' |
| `timestamp` | TIMESTAMP| Não | (Data Atual) | Horário exato do fluxo |
| `tool_called` | VARCHAR | Sim | - | Nome da ferramenta da IA associada (se aplicável) |
| `action_id` | VARCHAR | Sim | - | ID de ação gerado para auditoria |
| `raw_payload` | JSON | Sim | - | Payload original bruto recebido do webhook ou da API |

---

#### 2.10 Tabela `agent_actions` (Auditoria da Inteligência Artificial)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `act_...`) | ID único da ação executada |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `message_id` | VARCHAR | Sim | - | ID da mensagem desencadeadora no chat |
| `user_message` | TEXT | Não | - | Texto enviado pelo usuário |
| `detected_intent`| VARCHAR | Não | - | Intenção inferida pelo Gemini (ou nome da tool) |
| `tool_called` | VARCHAR | Não | - | Nome da ferramenta de IA acionada |
| `tool_arguments` | JSON | Não | - | Parâmetros de entrada convertidos passados à ferramenta |
| `result` | JSON | Não | - | Resposta computada de sucesso ou erro retornado pela Tool |
| `assistant_response`| TEXT| Não | - | Resposta textual de retorno gerada e enviada ao usuário |
| `model` | VARCHAR | Não | - | Nome exato do modelo do Gemini que processou a ação |
| `success` | BOOLEAN | Não | `true` | Se a ação foi executada sem falhas de API |
| `timestamp` | TIMESTAMP| Não | (Data Atual) | Horário da execução |

---

#### 2.11 Tabela `webhook_events` (Rastreabilidade e Deduplicação de Webhooks)
*   **Chave Primária:** `id` (string)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `wh_...`) | ID único do evento |
| `provider` | VARCHAR | Não | - | Provider do webhook (ex: 'uazapi_sse', 'uazapi_webhook') |
| `event_type` | VARCHAR | Não | - | Tipo do evento recebido |
| `message_id` | VARCHAR | Não | - | ID original da mensagem vinda do celular do usuário |
| `payload` | JSON | Não | - | Conteúdo original recebido |
| `processed` | BOOLEAN | Não | `false` | Indica se o processador já encerrou este evento |
| `status` | VARCHAR | Não | - | Estado final: 'success', 'error', 'in_progress', 'ignored' |
| `error` | TEXT | Sim | - | Mensagem de erro em caso de falha de processamento |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Horário de recebimento da notificação |

---

#### 2.12 Tabela `expenses` (Finanças / Controle de Gastos)
*   **Chave Primária:** `id` (string)
*   **Chave Estrangeira:** `user_id` (referencia `profiles.id`)

| Coluna | Tipo | Nullable | Valor Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `id` | VARCHAR | Não | (Gerado `exp_...`) | ID único da despesa |
| `user_id` | VARCHAR | Não | 'user_default' | Vínculo com o perfil |
| `description` | VARCHAR | Não | - | Descrição detalhada do item comprado |
| `amount` | DECIMAL | Não | 0.00 | Valor monetário em reais |
| `category` | VARCHAR | Não | 'outros' | Categoria: 'alimentação', 'transporte', 'saúde', 'lazer', 'outros' |
| `date` | TIMESTAMP| Não | (Data Atual) | Data em que a compra ocorreu |
| `created_at` | TIMESTAMP| Não | (Data Atual) | Data de criação |
| `updated_at` | TIMESTAMP| Não | (Data Atual) | Última alteração |
