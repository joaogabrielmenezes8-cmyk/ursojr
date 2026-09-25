import { db } from './db.js';
import { messagingProvider } from './providers/messaging.js';
import { assessorAgent } from './agent.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastRunTimestamp: string | null = null;
let lastDailySummarySentDate: string | null = null;

export function startScheduler() {
  if (schedulerInterval) return;

  console.log('[Scheduler] Background reminder and daily briefing worker started (30s interval)');

  // Run immediately on boot, then every 30s
  runSchedulerCycle();
  schedulerInterval = setInterval(runSchedulerCycle, 30000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Background worker stopped');
  }
}

export function getSchedulerStatus() {
  return {
    running: Boolean(schedulerInterval),
    intervalSeconds: 30,
    lastRunAt: lastRunTimestamp,
    lastDailySummarySentDate,
  };
}

async function runSchedulerCycle() {
  lastRunTimestamp = new Date().toISOString();
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const profile = db.getProfile();
    const reminders = db.getReminders(profile.id);

    // 1. Process Due Reminders
    const dueReminders = reminders.filter(
      (r) => r.status === 'pending' && r.scheduled_at <= nowIso
    );

    for (const rem of dueReminders) {
      console.log(`[Scheduler] Dispatching due reminder "${rem.title}" (ID: ${rem.id}) to ${profile.phone}`);

      const reminderMessage = `⏰ *LEMBRETE AGENDADO*\n\n*${rem.title}*\n${rem.message && rem.message !== rem.title ? `\n${rem.message}\n` : ''}\nAgendado para: ${new Date(rem.scheduled_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`;

      // Send via WhatsApp
      const result = await messagingProvider.sendTextMessage(profile.phone, reminderMessage);

      // Record message in conversation timeline
      const conv = db.getOrCreateConversation(profile.id, profile.phone, profile.full_name);
      db.addMessage({
        conversation_id: conv.id,
        direction: 'outbound',
        text: reminderMessage,
        status: result.success ? 'sent' : 'failed',
        tool_called: 'reminder_dispatch',
        raw_payload: result,
      });

      // Update reminder state
      db.updateReminder(rem.id, {
        status: 'sent',
        sent_at: nowIso,
        delivery_status: result.success ? 'delivered' : 'failed',
      });

      // Register reminder in agent conversation context for contextual follow-up / cancellation
      assessorAgent.registerDispatchedReminder(profile.id, {
        id: rem.id,
        title: rem.title,
        message: rem.message,
        scheduled_at: rem.scheduled_at,
      });

      // Handle recurrence if configured
      if (rem.recurrence_rule && rem.recurrence_rule !== 'none') {
        const nextDate = new Date(rem.scheduled_at);
        if (rem.recurrence_rule === 'daily') {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (rem.recurrence_rule === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (rem.recurrence_rule === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (rem.recurrence_rule === 'weekdays') {
          // Skip Saturday/Sunday
          do {
            nextDate.setDate(nextDate.getDate() + 1);
          } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
        }

        db.createReminder({
          user_id: rem.user_id,
          title: rem.title,
          message: rem.message,
          scheduled_at: nextDate.toISOString(),
          recurrence_rule: rem.recurrence_rule,
          status: 'pending',
          delivery_status: 'pending',
          sent_at: null,
        });

        console.log(`[Scheduler] Recurring reminder re-created for ${nextDate.toISOString()}`);
      }
    }

    // 2. Check Daily Summary
    const todayDateStr = now.toISOString().split('T')[0];
    if (profile.daily_summary_enabled && lastDailySummarySentDate !== todayDateStr) {
      const currentHoursMinutes = now.toLocaleTimeString('pt-BR', {
        timeZone: profile.timezone || 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Compare like '07:00' with profile.daily_summary_time
      if (currentHoursMinutes === profile.daily_summary_time) {
        lastDailySummarySentDate = todayDateStr;
        console.log(`[Scheduler] Triggering scheduled daily briefing for ${profile.full_name}`);

        const briefing = await assessorAgent.processMessage({
          userId: profile.id,
          phone: profile.phone,
          userMessage: 'Gere o resumo diário de hoje com minha programação e tarefas',
        });

        if (briefing.response) {
          await messagingProvider.sendTextMessage(profile.phone, briefing.response);
          const conv = db.getOrCreateConversation(profile.id, profile.phone, profile.full_name);
          db.addMessage({
            conversation_id: conv.id,
            direction: 'outbound',
            text: briefing.response,
            status: 'sent',
            tool_called: 'daily_summary',
          });
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error in scheduler cycle:', err);
  }
}
