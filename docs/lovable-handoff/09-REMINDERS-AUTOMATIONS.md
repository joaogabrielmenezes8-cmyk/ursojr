# URSO JR. — Seu estagiário com IA
## 09-REMINDERS-AUTOMATIONS.md — Lembretes e Automações (Scheduler)

Este documento descreve como o robô gerencia e executa tarefas automáticas em segundo plano, como o envio de lembretes e o briefing diário (resumo matinal).

---

### 1. Motor de Agendamento (Scheduler)

O URSO JR. possui um agendador nativo baseado em intervalos de **30 segundos** executado continuamente em segundo plano pelo servidor Node.js (`/server/scheduler.ts`).

*   **Inicialização:** O agendador é disparado na inicialização do servidor via `startScheduler()` no arquivo `server.ts`.
*   **Idempotência:** Garante precisão comparando o horário atual de faturamento local (`scheduled_at <= nowIso`) e atualizando imediatamente o status do lembrete para `'sent'` no banco físico, eliminando disparos duplicados ou repetitivos de um mesmo alerta.

---

### 2. Fluxo Completo de Ciclo de Vida do Lembrete

```text
[Criação] 
   ↳ IA interpreta o horário e aciona "create_reminder"
[Armazenamento] 
   ↳ Salvo na tabela "reminders" (status: pending, scheduled_at: ISO)
[Varredura (Scheduler)] 
   ↳ Roda a cada 30s. Filtra pendências atrasadas: scheduled_at <= Agora
[Disparo (WhatsApp)] 
   ↳ Envia notificação formatada para o telefone do usuário via Uazapi
[Confirmação e Histórico] 
   ↳ Atualiza status: sent, registra na linha do tempo do chat (outbound)
[Tratamento de Recorrência] 
   ↳ Se ativo, recalcula data de agendamento e agenda próxima ocorrência
```

#### Tratamento de Recorrências:
Se o lembrete possuir regra de recorrência (`recurrence_rule`), ao ser disparado, o sistema calcula a próxima data e cria um novo lembrete idêntico como `'pending'`:
*   `daily` → Próximo dia útil ou corrido (`+1 dia`).
*   `weekly` → Mesma hora e dia da próxima semana (`+7 dias`).
*   `monthly` → Mesma hora e dia do próximo mês (`+1 mês`).
*   `weekdays` → Próximo dia da semana útil (pula sábados e domingos automaticamente).

---

### 3. Automação: Briefing Diário (Resumo Matinal)

O Briefing Diário é o principal fluxo automatizado do robô:

*   **Funcionamento:** O agendador verifica a cada ciclo de 30 segundos se o briefing automático do perfil do usuário está ativado (`daily_summary_enabled`) e se o briefing de hoje já foi enviado (`lastDailySummarySentDate !== data_hoje`).
*   **Trigger Temporal:** Se a hora atual em São Paulo bater com o horário agendado do perfil (ex: `07:30`), o scheduler aciona o Agente de IA passando a instrução interna: *"Gere o resumo diário de hoje com minha programação e tarefas"*.
*   **Processamento & Envio:** O Gemini consolida os compromissos do Google Calendar, as tarefas do Google Tasks e gera um resumo em tom amigável. O texto final é enviado diretamente ao WhatsApp do usuário, permitindo que ele comece o dia com todas as suas pendências consolidadas no celular.
