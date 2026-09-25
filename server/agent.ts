import { GoogleGenAI, Type, FunctionDeclaration, ThinkingLevel } from '@google/genai';
import { db } from './db.js';
import { AgentAction, RecurrenceRule, TaskPriority, TaskStatus, Task, Reminder } from '../src/types/index.js';
import { googleCalendarService } from './google/calendar.js';
import { googleTasksService } from './google/tasks.js';

export interface ProcessMessageOptions {
  userId?: string;
  phone?: string;
  messageId?: string;
  userMessage: string;
}

export interface AgentResult {
  response: string;
  toolCalled?: string;
  toolArgs?: any;
  actionResult?: any;
  model: string;
  success: boolean;
}

// Conversation context cache for conversational follow-ups (e.g. "Coloca para sexta")
export interface CreatedEntityRecord {
  id: string;
  type: 'task' | 'event' | 'expense' | 'reminder';
  title: string;
  details?: string;
  timeOrDue?: string;
  amount?: number;
  createdAt: number;
}

interface UserContext {
  lastTaskId?: string;
  lastTaskTitle?: string;
  lastEventId?: string;
  lastEventTitle?: string;
  lastEventStart?: string;
  lastEventEnd?: string;
  lastExpenseId?: string;
  lastExpenseDesc?: string;
  lastExpenseAmount?: number;
  lastReminderId?: string;
  lastReminderTitle?: string;
  lastReminderTime?: string;
  lastActionType?: 'list_tasks' | 'list_events' | 'create_task' | 'create_event' | 'delete_task' | 'delete_tasks' | 'create_expense' | 'update_expense' | 'create_reminder' | 'delete_reminder';
  lastQueriedDate?: 'today' | 'tomorrow' | 'week' | 'all';
  lastListedTaskIds?: string[];
  recentCreatedEntities?: CreatedEntityRecord[];
  pendingConflictEvent?: {
    title: string;
    proposedStart: string;
    proposedEnd: string;
    location?: string;
    description?: string;
    alternateStart: string;
    alternateEnd: string;
  };
}

const userContexts: Record<string, UserContext> = {};

function getUserContext(userId: string): UserContext {
  if (!userContexts[userId]) {
    userContexts[userId] = {};
  }
  return userContexts[userId];
}

// --- 1. Tool Declarations ---

const create_task_tool: FunctionDeclaration = {
  name: 'create_task',
  description: 'Cria uma nova tarefa no Google Tasks do usuário (ex: comprar ração, cobrar fulano, ligar para alguém). ATENÇÃO: NUNCA use esta ferramenta quando o usuário estiver apenas consultando ("quais tarefas..."), listando ("listar tarefas...") ou cancelando ("cancelar tarefas...")!',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Título claro e objetivo da tarefa' },
      description: { type: Type.STRING, description: 'Detalhes adicionais, notas ou observações' },
      priority: {
        type: Type.STRING,
        description: 'Prioridade: low, normal, high ou urgent',
      },
      due_at: {
        type: Type.STRING,
        description: 'Data/hora de vencimento no formato ISO 8601 (ex: 2026-09-22T00:00:00Z)',
      },
    },
    required: ['title'],
  },
};

const update_task_tool: FunctionDeclaration = {
  name: 'update_task',
  description: 'Atualiza o prazo (data de vencimento) ou título de uma tarefa existente no Google Tasks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_title_or_id: { type: Type.STRING, description: 'ID da tarefa ou parte do título (opcional se for a última criada)' },
      due_at: { type: Type.STRING, description: 'Nova data de vencimento em formato ISO 8601' },
      new_title: { type: Type.STRING, description: 'Novo título se houver alteração' },
    },
    required: ['due_at'],
  },
};

const complete_task_tool: FunctionDeclaration = {
  name: 'complete_task',
  description: 'Marca uma tarefa existente como concluída no Google Tasks pelo título aproximado ou ID.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_title_or_id: { type: Type.STRING, description: 'ID da tarefa ou parte do título' },
    },
    required: ['task_title_or_id'],
  },
};

const delete_task_tool: FunctionDeclaration = {
  name: 'delete_task',
  description: 'Cancela, apaga ou exclui uma tarefa específica do Google Tasks pelo título ou ID (ex: "cancela a tarefa de comprar pão").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_title_or_id: { type: Type.STRING, description: 'ID da tarefa ou parte do título a ser cancelada' },
    },
    required: ['task_title_or_id'],
  },
};

const delete_tasks_tool: FunctionDeclaration = {
  name: 'delete_tasks',
  description: 'Cancela, apaga ou exclui múltiplas tarefas do Google Tasks por período ou filtro (ex: "cancelar todas as tarefas de amanhã", "cancele todas", "apagar todas as tarefas").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filter: {
        type: Type.STRING,
        description: 'Filtro de período: "tomorrow" (amanhã), "today" (hoje), "all" (todas), ou "query"',
      },
      query: { type: Type.STRING, description: 'Termo opcional de busca' },
    },
    required: ['filter'],
  },
};

const list_tasks_tool: FunctionDeclaration = {
  name: 'list_tasks',
  description: 'Lista ou consulta tarefas pendentes do Google Tasks (ex: "quais tarefas de amanhã", "listar tarefas", "minhas tarefas"). NUNCA crie tarefas quando o usuário estiver apenas consultando!',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date_filter: { type: Type.STRING, description: 'today, tomorrow, week, all ou data específica' },
      status: { type: Type.STRING, description: 'pending, completed ou all' },
      query: { type: Type.STRING, description: 'Termo de filtro opcional' },
    },
  },
};

const create_reminder_tool: FunctionDeclaration = {
  name: 'create_reminder',
  description: 'Agenda um lembrete automático pontual ou recorrente que será enviado via WhatsApp no horário determinado.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Assunto do lembrete' },
      message: { type: Type.STRING, description: 'Texto da notificação do lembrete' },
      scheduled_at: {
        type: Type.STRING,
        description: 'Data e hora exata de disparo no formato ISO 8601',
      },
      recurrence: {
        type: Type.STRING,
        description: 'Recorrência: none, daily, weekly, monthly ou weekdays',
      },
    },
    required: ['title', 'scheduled_at'],
  },
};

const list_reminders_tool: FunctionDeclaration = {
  name: 'list_reminders',
  description: 'Lista lembretes pendentes agendados para envio no WhatsApp.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: 'pending, sent ou all' },
    },
  },
};

const delete_reminder_tool: FunctionDeclaration = {
  name: 'delete_reminder',
  description:
    'Cancela, apaga ou exclui um lembrete específico do WhatsApp por título, ID ou referência contextual (ex: "apagar esse lembrete que você cadastrou aí", "cancela o lembrete de cobrar relatório", "excluir esse lembrete", "desfaz o lembrete").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reminder_title_or_id: {
        type: Type.STRING,
        description:
          'Título ou ID do lembrete, ou "last" / "latest" / "esse" / vazio para o último cadastrado ou notificado',
      },
    },
  },
};

const create_event_tool: FunctionDeclaration = {
  name: 'create_event',
  description: 'Agenda um compromisso, reunião, consulta ou treino no Google Calendar com verificação de conflitos de horário.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Nome do compromisso (ex: Dentista, Reunião com Carlos, Treino)' },
      start_time: { type: Type.STRING, description: 'Horário de início em formato ISO 8601' },
      end_time: { type: Type.STRING, description: 'Horário de término em formato ISO 8601 (opcional, calculado por duração padrão)' },
      duration_minutes: { type: Type.NUMBER, description: 'Duração em minutos se especificada (ex: 30, 60, 90)' },
      location: { type: Type.STRING, description: 'Local físico, consultório ou link (Meet, Zoom)' },
      description: { type: Type.STRING, description: 'Pauta ou detalhes do compromisso' },
      force_conflict: { type: Type.BOOLEAN, description: 'Se true, cria o evento mesmo se houver conflito de horário confirmado pelo usuário' },
    },
    required: ['title', 'start_time'],
  },
};

const update_event_tool: FunctionDeclaration = {
  name: 'update_event',
  description: 'Altera o horário, dia ou detalhes de um compromisso já agendado no Google Calendar (ex: Muda reunião para 15h).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      event_title_or_id: { type: Type.STRING, description: 'ID ou nome do compromisso a alterar' },
      new_start_time: { type: Type.STRING, description: 'Novo horário de início em formato ISO 8601' },
      new_end_time: { type: Type.STRING, description: 'Novo horário de término em formato ISO 8601' },
      new_title: { type: Type.STRING, description: 'Novo nome caso seja alterado' },
    },
    required: ['event_title_or_id', 'new_start_time'],
  },
};

const delete_event_tool: FunctionDeclaration = {
  name: 'delete_event',
  description: 'Cancela ou remove um compromisso do Google Calendar (ex: Cancela a reunião com Carlos).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      event_title_or_id: { type: Type.STRING, description: 'Nome ou ID do evento a ser cancelado' },
    },
    required: ['event_title_or_id'],
  },
};

const check_availability_tool: FunctionDeclaration = {
  name: 'check_availability',
  description: 'Verifica disponibilidade e horários livres no Google Calendar (ex: "Tem algum horário livre amanhã à tarde?").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: 'Data para checar disponibilidade (ISO 8601)' },
      period: { type: Type.STRING, description: 'morning (08-12), afternoon (13-18), evening (18-22) ou full_day' },
      duration_minutes: { type: Type.NUMBER, description: 'Duração mínima necessária em minutos (padrão: 60)' },
    },
    required: ['date'],
  },
};

const list_events_tool: FunctionDeclaration = {
  name: 'list_events',
  description: 'Lista compromissos no Google Calendar para hoje, amanhã, dia da semana, semana completa ou período.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date_filter: { type: Type.STRING, description: 'today, tomorrow, week, next_event ou data específica YYYY-MM-DD' },
      query: { type: Type.STRING, description: 'Termo de busca opcional' },
    },
  },
};

const create_note_tool: FunctionDeclaration = {
  name: 'create_note',
  description: 'Guarda uma anotação, ideia, código ou informação útil.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Título da anotação' },
      content: { type: Type.STRING, description: 'Conteúdo detalhado da nota' },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Tags para categorização',
      },
    },
    required: ['title', 'content'],
  },
};

const search_notes_tool: FunctionDeclaration = {
  name: 'search_notes',
  description: 'Pesquisa anotações existentes por palavra-chave.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Termo de busca' },
    },
    required: ['query'],
  },
};

const find_contact_tool: FunctionDeclaration = {
  name: 'find_contact',
  description: 'Busca telefone, e-mail ou dados de um contato cadastrado.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Nome ou empresa do contato' },
    },
    required: ['name'],
  },
};

const create_contact_tool: FunctionDeclaration = {
  name: 'create_contact',
  description: 'Cadastra um novo contato com telefone, empresa e papel.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Nome completo' },
      phone: { type: Type.STRING, description: 'Telefone com DDD' },
      company: { type: Type.STRING, description: 'Empresa' },
      role: { type: Type.STRING, description: 'Cargo ou função' },
      notes: { type: Type.STRING, description: 'Observações' },
    },
    required: ['name', 'phone'],
  },
};

const save_memory_tool: FunctionDeclaration = {
  name: 'save_memory',
  description: 'Salva uma preferência, fato ou regra de longo prazo sobre o usuário.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      key: { type: Type.STRING, description: 'Chave identificadora (ex: pref_almoco, contador)' },
      value: { type: Type.STRING, description: 'Fato ou detalhe a ser memorizado' },
      category: { type: Type.STRING, description: 'preference, fact, rule ou work' },
    },
    required: ['key', 'value'],
  },
};

const get_daily_summary_tool: FunctionDeclaration = {
  name: 'get_daily_summary',
  description: 'Gera o briefing e resumo do dia integrando Google Calendar, Google Tasks e lembretes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: 'Data para o resumo (padrão: hoje)' },
    },
  },
};

const create_expense_tool: FunctionDeclaration = {
  name: 'create_expense',
  description: 'Registra um gasto, despesa ou compra financeira (ex: "Gastei 50 reais no almoço", "Comprei 120 de gasolina", "Lançar compra de 45 farmácia").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: 'Descrição da despesa ou produto/serviço comprado' },
      amount: { type: Type.NUMBER, description: 'Valor numérico em reais (ex: 50.00, 120.50)' },
      category: { type: Type.STRING, description: 'Categoria opcional (alimentação, transporte, mercado, saúde, lazer, outros)' },
      date: { type: Type.STRING, description: 'Data da compra em ISO 8601 (padrão: hoje)' },
    },
    required: ['description', 'amount'],
  },
};

const update_expense_tool: FunctionDeclaration = {
  name: 'update_expense',
  description: 'Corrige ou atualiza o valor ou descrição de um lançamento financeiro/compra anterior (ex: "Conserta o valor, foi 40 reais", "Errei a compra, muda para 60", "Não foi 50, foi 40").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expense_id_or_description: { type: Type.STRING, description: 'ID ou parte da descrição da compra a alterar (opcional se for a última lançada)' },
      new_amount: { type: Type.NUMBER, description: 'Novo valor corrigido em reais' },
      new_description: { type: Type.STRING, description: 'Nova descrição se alterada' },
    },
  },
};

const list_expenses_tool: FunctionDeclaration = {
  name: 'list_expenses',
  description: 'Lista gastos e despesas recentes ou calcula o total gasto no período (ex: "Quanto gastei hoje?", "Listar despesas", "Minhas compras deste mês").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      period: { type: Type.STRING, description: 'today, month, recent ou all' },
    },
  },
};

const correct_last_action_tool: FunctionDeclaration = {
  name: 'correct_last_action',
  description: 'Corrige, substitui, desfaz, edita ou divide em várias partes o último pedido ou lançamento realizado (tarefa criada erroneamente, horário de compromisso errado, valor de compra errado, ou pedido que deveria ser dividido em duas ou mais tarefas). USE SEMPRE que o usuário pedir para consertar, alterar o último lançamento, separar em duas tarefas, corrigir horário ou valor do último pedido.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'Tipo de correção: "split" (dividir última tarefa em várias), "replace" (substituir o último item por outro), "update_value" (mudar horário ou valor da última compra/evento), "delete" (apenas remover o último lançamento)',
      },
      entity_type: {
        type: Type.STRING,
        description: 'task, event, expense, reminder ou auto',
      },
      split_items: {
        type: Type.ARRAY,
        description: 'Lista de novos itens caso esteja dividindo em 2 ou mais tarefas/eventos',
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título da tarefa ou evento' },
            time_or_due: { type: Type.STRING, description: 'Horário ou data em formato texto ou ISO' },
            is_event: { type: Type.BOOLEAN, description: 'true se for compromisso com hora marcada no Google Calendar, false se for tarefa' },
          },
        },
      },
      new_title: { type: Type.STRING, description: 'Novo título se estiver substituindo ou alterando' },
      new_time_or_due: { type: Type.STRING, description: 'Novo horário ou data se corrigindo horário' },
      new_amount: { type: Type.NUMBER, description: 'Novo valor em reais se corrigindo despesa' },
    },
    required: ['action'],
  },
};

export class AssessorAgent {
  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 10000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Cleans raw message into a concise, professional task title
   * e.g. "Abastecer o carro amanhã às 7h urgente" -> "Abastecer o carro"
   */
  public cleanTaskTitle(raw: string): string {
    let title = raw
      .replace(/^(?:kuma[,\s]*|assessor[,\s]*|bot[,\s]*)/i, '')
      .replace(/^(?:por favor[,\s]*|por gentileza[,\s]*)/i, '')
      .replace(
        /^(?:criar uma tarefa|cria uma tarefa|criar tarefa|cria tarefa|nova tarefa|adicionar tarefa|anota aí:|anota ai:|anota aí|anota ai|anotar|anota|não esquecer de|nao esquecer de|lembrar de|lembra de|avisar de|avisa de|coloca na minha lista|preciso|tenho que)\b\s*[:,-]?\s*/i,
        ''
      )
      .replace(/(?:^|\s+)(?:urgente|urgentíssimo|urgentissimo|prioridade alta|alta prioridade|importante)(?=\s+|$)/gi, ' ')
      .replace(
        /(?:^|\s+)(?:amanhã|amanha|hoje|depois de amanhã|depois de amanha|segunda-feira|segunda|terça-feira|terça|terca|quarta-feira|quarta|quinta-feira|quinta|sexta-feira|sexta|sábado|sabado|domingo)(?=\s+|$)/gi,
        ' '
      )
      .replace(/(?:às|as|para\s+às|para\s+as|para)\s*\d{1,2}(?::\d{2}|h(?:\d{2})?)?/gi, ' ')
      .replace(/(?:^|\s+)\d{1,2}h(?:\d{2})?(?=\s+|$)/gi, ' ')
      .replace(
        /(?:^|\s+)(?:de manhã|pela manhã|pela manha|à tarde|a tarde|à noite|a noite|depois do almoço|apos o almoco)(?=\s+|$)/gi,
        ' '
      )
      .replace(/\s{2,}/g, ' ')
      .replace(/^[rR]\s+/i, '')
      .replace(/^(?:de|da|do|em|para|com|a|o|as|os|e)\s+/i, '')
      .replace(/^[-,:.]\s*/, '')
      .trim();

    return title.length >= 2 ? title : raw.trim();
  }

  /**
   * Cleans raw message into a concise event title
   * e.g. "Marca dentista amanhã às 14h" -> "Dentista"
   * e.g. "Marcar quinta 16h call com Leandro sobre lowticket" -> "Call com Leandro sobre lowticket"
   */
  public cleanEventTitle(raw: string): string {
    let title = raw
      .replace(/^(?:kuma[,\s]*|assessor[,\s]*|bot[,\s]*)/i, '')
      .replace(/^(?:por favor[,\s]*|por gentileza[,\s]*)/i, '')
      .replace(
        /^(?:agendar|agende|agenda|marcar|marque|marca|colocar|coloque|coloca|adicionar|adicione|adiciona|criar|cria|novo|nova)\b\s*(?:um|uma|o|a)?\s*/i,
        ''
      )
      .replace(/(?:^|\s+)(?:urgente|urgentíssimo|urgentissimo|prioridade alta|alta prioridade|importante)(?=\s+|$)/gi, ' ')
      .replace(
        /(?:^|\s+)(?:amanhã|amanha|hoje|depois de amanhã|depois de amanha|segunda-feira|segunda|terça-feira|terca|terça|quarta-feira|quarta|quinta-feira|quinta|sexta-feira|sexta|sábado|sabado|domingo)(?=\s+|$)/gi,
        ' '
      )
      .replace(/(?:às|as|para\s+às|para\s+as|para)\s*\d{1,2}(?::\d{2}|h(?:\d{2})?)?/gi, ' ')
      .replace(/(?:^|\s+)\d{1,2}h(?:\d{2})?(?=\s+|$)/gi, ' ')
      .replace(
        /(?:^|\s+)(?:de manhã|pela manhã|pela manha|à tarde|a tarde|à noite|a noite|depois do almoço|apos o almoco)(?=\s+|$)/gi,
        ' '
      )
      .replace(/\s{2,}/g, ' ')
      .replace(/^[rR]\s+/i, '')
      .replace(/^(?:de|da|do|em|para|com|a|o|as|os|e)\s+/i, '')
      .replace(/^[-,:.]\s*/, '')
      .trim();

    if (title.length >= 2) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
    return 'Compromisso';
  }

  /**
   * Helper to parse Brazilian Portuguese temporal expressions in America/Sao_Paulo timezone
   */
  public resolveTime(expr: string, baseDate = new Date()): Date {
    const lower = expr.toLowerCase();

    // Extract current date parts in America/Sao_Paulo timezone
    const spNowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(baseDate);

    const year = parseInt(spNowParts.find((p) => p.type === 'year')?.value || '2026', 10);
    const month = parseInt(spNowParts.find((p) => p.type === 'month')?.value || '9', 10);
    const day = parseInt(spNowParts.find((p) => p.type === 'day')?.value || '22', 10);
    let hour = 9;
    let minute = 0;
    let dayOffset = 0;

    // Check specific days of week
    const daysOfWeek = ['domingo', 'segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      const dayName = daysOfWeek[i];
      if (lower.includes(dayName)) {
        const targetDay = i === 3 ? 2 : (i >= 4 ? i - 1 : i); // normalize terca
        const currentDay = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-03:00`).getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // next week's day
        dayOffset = diff;
        break;
      }
    }

    if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
      dayOffset = 2;
    } else if (lower.includes('amanhã') || lower.includes('amanha')) {
      dayOffset = 1;
    }

    // Default period times if specific hour is not given
    if (lower.includes('depois do almoço') || lower.includes('após o almoço') || lower.includes('apos o almoco')) {
      hour = 14;
    } else if (lower.includes('de manhã') || lower.includes('pela manhã') || lower.includes('pela manha')) {
      hour = 9;
    } else if (lower.includes('à tarde') || lower.includes('a tarde')) {
      hour = 15;
    } else if (lower.includes('fim do dia') || lower.includes('final da tarde')) {
      hour = 18;
    } else if (lower.includes('à noite') || lower.includes('a noite')) {
      hour = 19;
      minute = 30;
    }

    // Match explicit hour like "às 14h", "as 14:30", "para 15h", "para as 16h", "14h", "14:00", "7h", "7h30"
    const hourRegex = /(?:às|as|para\s+às|para\s+as|para)\s*(\d{1,2})(?::(\d{2})|h(?:\d{2})?)?/i;
    const explicitMatch = expr.match(hourRegex);

    if (explicitMatch) {
      const h = parseInt(explicitMatch[1], 10);
      let m = 0;
      if (explicitMatch[2]) {
        m = parseInt(explicitMatch[2], 10);
      } else {
        const hSuffixMatch = expr.match(/(?:às|as|para\s+às|para\s+as|para)\s*\d{1,2}h(\d{2})/i);
        if (hSuffixMatch) {
          m = parseInt(hSuffixMatch[1], 10);
        }
      }
      if (h >= 0 && h <= 23) {
        hour = h;
        minute = m;
      }
    } else {
      const simpleHour = expr.match(/\b(\d{1,2})h(?:\b|(\d{2}))/i);
      if (simpleHour) {
        const h = parseInt(simpleHour[1], 10);
        const m = simpleHour[2] ? parseInt(simpleHour[2], 10) : 0;
        if (h >= 0 && h <= 23) {
          hour = h;
          minute = m;
        }
      }
    }

    const tempDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-03:00`);
    tempDate.setDate(tempDate.getDate() + dayOffset);

    const targetYear = tempDate.getFullYear();
    const targetMonth = String(tempDate.getMonth() + 1).padStart(2, '0');
    const targetDay = String(tempDate.getDate()).padStart(2, '0');
    const padHour = String(hour).padStart(2, '0');
    const padMin = String(minute).padStart(2, '0');

    return new Date(`${targetYear}-${targetMonth}-${targetDay}T${padHour}:${padMin}:00-03:00`);
  }

  /**
   * Helper to check if an ISO date string matches a target Date (handles Sao Paulo timezone & UTC midnight)
   */
  public isSameDate(dateStr: string | null | undefined, target: Date): boolean {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const dateFormatted = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const targetFormatted = target.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (dateFormatted === targetFormatted) return true;
    } catch (_) {}

    const targetYear = target.getFullYear();
    const targetMonth = String(target.getMonth() + 1).padStart(2, '0');
    const targetDay = String(target.getDate()).padStart(2, '0');
    const targetPrefix = `${targetYear}-${targetMonth}-${targetDay}`;
    if (dateStr.includes(targetPrefix)) return true;

    return false;
  }

  /**
   * Calculates default duration based on title keywords and user configuration
   */
  public getDefaultDuration(title: string): number {
    const config = db.getGoogleConfig();
    const durations = config.default_durations || {
      meeting: 60,
      consultation: 60,
      call: 30,
      workout: 90,
      generic: 60,
    };

    const lower = title.toLowerCase();
    if (lower.includes('reunião') || lower.includes('reuniao') || lower.includes('call') || lower.includes('meet') || lower.includes('alinhamento')) {
      return durations.meeting;
    }
    if (lower.includes('dentista') || lower.includes('médico') || lower.includes('medico') || lower.includes('consulta') || lower.includes('exame') || lower.includes('terapia')) {
      return durations.consultation;
    }
    if (lower.includes('ligar') || lower.includes('ligação') || lower.includes('ligacao') || lower.includes('telefonema')) {
      return durations.call;
    }
    if (lower.includes('treino') || lower.includes('academia') || lower.includes('personal') || lower.includes('corrida') || lower.includes('futebol')) {
      return durations.workout;
    }
    return durations.generic;
  }

  async processMessage(options: ProcessMessageOptions): Promise<AgentResult> {
    const { userId = 'user_default', userMessage, messageId } = options;
    const profile = db.getProfile(userId);
    const memories = db.getMemories(userId);
    const googleConfig = db.getGoogleConfig();
    const context = getUserContext(userId);

    const now = new Date();
    const nowIso = now.toISOString();
    const nowLocale = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Handle conversational follow-up for pending conflict confirmation:
    // e.g., "Pode ser", "Coloca depois", "Sim", "Confirma"
    const lowerMessage = userMessage.toLowerCase().trim();
    if (context.pendingConflictEvent) {
      if (
        lowerMessage.includes('sim') ||
        lowerMessage.includes('pode') ||
        lowerMessage.includes('coloca depois') ||
        lowerMessage.includes('pode colocar') ||
        lowerMessage.includes('confirma') ||
        lowerMessage.includes('ok')
      ) {
        const pending = context.pendingConflictEvent;
        context.pendingConflictEvent = undefined;

        // Schedule at alternate time
        const result = await this.executeTool(
          userId,
          'create_event',
          {
            title: pending.title,
            start_time: pending.alternateStart,
            end_time: pending.alternateEnd,
            location: pending.location,
            description: pending.description,
            force_conflict: true,
          },
          userMessage
        );

        db.recordAgentAction({
          user_id: userId,
          message_id: messageId,
          user_message: userMessage,
          detected_intent: 'create_event_conflict_confirmed',
          tool_called: 'create_event',
          tool_arguments: { title: pending.title, start_time: pending.alternateStart },
          result: result.result,
          assistant_response: result.naturalResponse,
          model: 'assessor-contextual-flow',
          success: true,
        });

        return {
          response: result.naturalResponse,
          toolCalled: 'create_event',
          model: 'assessor-contextual-flow',
          success: true,
        };
      } else if (lowerMessage.includes('não') || lowerMessage.includes('nao') || lowerMessage.includes('cancela')) {
        context.pendingConflictEvent = undefined;
        return {
          response: 'Perfeito, não criei o compromisso. Deseja escolher outro horário?',
          model: 'assessor-contextual-flow',
          success: true,
        };
      }
    }

    // 0.01 High Priority: Complaint / Meta-feedback regarding unwanted task creation or execution failure
    const isTaskCreationComplaint =
      (lowerMessage.includes('criando tarefa') ||
        lowerMessage.includes('criando tarefas') ||
        lowerMessage.includes('cria tarefa') ||
        lowerMessage.includes('cria tarefas') ||
        lowerMessage.includes('criar tarefas') ||
        lowerMessage.includes('criar tarefa')) &&
      (lowerMessage.includes('sem eu falar') ||
        lowerMessage.includes('sem eu mandar') ||
        lowerMessage.includes('sem eu pedir') ||
        lowerMessage.includes('sem permissão') ||
        lowerMessage.includes('sem permissao') ||
        lowerMessage.includes('sozinho') ||
        lowerMessage.includes('sozinha') ||
        lowerMessage.includes('não mandei') ||
        lowerMessage.includes('nao mandei') ||
        lowerMessage.includes('não pedi') ||
        lowerMessage.includes('nao pedi') ||
        lowerMessage.includes('para de') ||
        lowerMessage.includes('pare de') ||
        lowerMessage.includes('não crie') ||
        lowerMessage.includes('nao crie'));

    const isExecutionComplaint =
      (lowerMessage.includes('nao esta executando') ||
        lowerMessage.includes('não está executando') ||
        lowerMessage.includes('não executa') ||
        lowerMessage.includes('nao executa') ||
        lowerMessage.includes('não tá executando') ||
        lowerMessage.includes('nao ta executando') ||
        lowerMessage.includes('não está fazendo') ||
        lowerMessage.includes('nao esta fazendo')) &&
      (lowerMessage.includes('função') ||
        lowerMessage.includes('funções') ||
        lowerMessage.includes('funcao') ||
        lowerMessage.includes('funcoes') ||
        lowerMessage.includes('que eu mando') ||
        lowerMessage.includes('o que eu peço') ||
        lowerMessage.includes('o que eu mando'));

    if (isTaskCreationComplaint || isExecutionComplaint) {
      const response =
        `Peço sinceras desculpas pela inconveniência! 🐻⚠️ Já ajustei o sistema para **só criar tarefas ou compromissos quando você solicitar explicitamente** (ex: *"Criar tarefa: [título]"* ou *"Marca reunião amanhã às 14h"*).\n\n` +
        `• Para limpar tarefas criadas por engano, você pode dizer:\n` +
        `  - *"Cancelar todas as tarefas de hoje"* (ou *"de amanhã"*)\n` +
        `  - *"Listar tarefas"* (para ver as pendências e escolher o que apagar)\n\n` +
        `Qual função você gostaria de executar agora? Estou pronto para:\n` +
        `📅 **Agenda:** *"Compromissos de hoje"* ou *"Marca reunião amanhã às 15h"*\n` +
        `⏰ **Lembrete:** *"Me lembra amanhã às 9h de ligar para o fornecedor"*\n` +
        `📋 **Tarefas:** *"Listar tarefas"* ou *"Criar tarefa: [nome]"*\n` +
        `💸 **Finanças:** *"Gastei 50 no almoço"* ou *"Quanto gastei hoje?"*`;

      return {
        response,
        model: 'assessor-feedback-handler',
        success: true,
      };
    }

    // 0.05 High Priority: Reminder Cancellation
    // Examples: "apagar esse lembrete que você cadastrou aí", "cancela o lembrete", "apagar lembrete", "excluir esse lembrete", "apague esse lembrete", "tira esse lembrete"
    const isReminderCancellation =
      (lowerMessage.includes('lembrete') || lowerMessage.includes('lembretes')) &&
      (lowerMessage.includes('apagar') ||
        lowerMessage.includes('apaga') ||
        lowerMessage.includes('apague') ||
        lowerMessage.includes('cancelar') ||
        lowerMessage.includes('cancela') ||
        lowerMessage.includes('cancele') ||
        lowerMessage.includes('excluir') ||
        lowerMessage.includes('exclui') ||
        lowerMessage.includes('exclua') ||
        lowerMessage.includes('remover') ||
        lowerMessage.includes('remove') ||
        lowerMessage.includes('tira') ||
        lowerMessage.includes('tirar') ||
        lowerMessage.includes('desfazer') ||
        lowerMessage.includes('desfaz') ||
        lowerMessage.includes('deleta') ||
        lowerMessage.includes('deletar'));

    if (isReminderCancellation) {
      let query = lowerMessage
        .replace(/^(?:favor\s+|por favor\s+)?(?:apagar|apaga|apague|cancelar|cancela|cancele|excluir|exclui|exclua|remover|remove|tira|tirar|desfazer|desfaz|deleta|deletar)\s+/i, '')
        .replace(/(?:esse|este|o|a)\s+lembrete\s*/i, '')
        .replace(/que\s+voc[eê]\s+(?:acabou\s+de\s+)?(?:cadastrou|agendou|criou)\s*(?:a[ií])?/i, '')
        .replace(/\b(?:a[ií]|por favor|pra mim)\b/gi, '')
        .replace(/^(?:de|do|da)\s+/i, '')
        .trim();

      const execution = await this.executeTool(
        userId,
        'delete_reminder',
        { reminder_title_or_id: query || 'last' },
        userMessage
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_reminder',
        toolArgs: { reminder_title_or_id: query || 'last' },
        actionResult: execution.result,
        model: 'assessor-intent-flow',
        success: true,
      };
    }

    // 0. High Priority: Batch cancellation of tasks (e.g. "Cancelar todas as tarefas de amanhã", "Cancele todas", "Cancela as tarefas")
    const isCancelTaskBatch =
      lowerMessage.includes('cancelar todas as tarefas') ||
      lowerMessage.includes('cancela todas as tarefas') ||
      lowerMessage.includes('cancele todas as tarefas') ||
      lowerMessage.includes('cancelar tarefas de amanhã') ||
      lowerMessage.includes('cancelar tarefas de amanha') ||
      lowerMessage.includes('cancela tarefas de amanhã') ||
      lowerMessage.includes('cancela tarefas de amanha') ||
      lowerMessage.includes('cancele tarefas de amanhã') ||
      lowerMessage.includes('cancele tarefas de amanha') ||
      lowerMessage.includes('cancela as tarefas de amanhã') ||
      lowerMessage.includes('cancela as tarefas de amanha') ||
      lowerMessage.includes('cancele as tarefas de amanhã') ||
      lowerMessage.includes('cancele as tarefas de amanha') ||
      lowerMessage.includes('apagar todas as tarefas') ||
      lowerMessage.includes('excluir todas as tarefas') ||
      lowerMessage.includes('apaga as tarefas') ||
      lowerMessage.includes('exclui as tarefas') ||
      lowerMessage === 'cancele todas' ||
      lowerMessage === 'cancela todas' ||
      lowerMessage === 'cancelar todas' ||
      lowerMessage === 'cancele todas elas' ||
      lowerMessage === 'cancela todas elas' ||
      lowerMessage === 'cancele tudo' ||
      lowerMessage === 'cancela tudo' ||
      lowerMessage === 'apaga todas' ||
      lowerMessage === 'apague todas' ||
      lowerMessage === 'exclui todas' ||
      lowerMessage === 'exclua todas';

    if (isCancelTaskBatch) {
      let filter = 'all';
      if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
        filter = 'tomorrow';
      } else if (lowerMessage.includes('hoje')) {
        filter = 'today';
      } else if (context.lastActionType === 'list_tasks' && context.lastQueriedDate) {
        filter = context.lastQueriedDate;
      }

      const execution = await this.executeTool(userId, 'delete_tasks', { filter }, userMessage);
      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_tasks',
        toolArgs: { filter },
        actionResult: execution.result,
        model: 'assessor-intent-flow',
        success: true,
      };
    }

    // 0.1 High Priority: Explicit single task cancellation
    // Examples: "Cancela a tarefa de comprar pão", "Excluir tarefa comprar ração", "Cancelar tarefa X"
    if (
      (lowerMessage.startsWith('cancela a tarefa') ||
        lowerMessage.startsWith('cancele a tarefa') ||
        lowerMessage.startsWith('cancelar a tarefa') ||
        lowerMessage.startsWith('cancela tarefa') ||
        lowerMessage.startsWith('cancele tarefa') ||
        lowerMessage.startsWith('cancelar tarefa') ||
        lowerMessage.startsWith('excluir tarefa') ||
        lowerMessage.startsWith('exclui a tarefa') ||
        lowerMessage.startsWith('apagar a tarefa') ||
        lowerMessage.startsWith('apaga a tarefa')) &&
      !lowerMessage.includes('todas')
    ) {
      const taskQuery = lowerMessage
        .replace(/^(?:cancela|cancele|cancelar|excluir|exclui|apagar|apaga)\s+(?:a\s+|o\s+)?tarefa\s*(?:de\s+|do\s+|da\s+)?/i, '')
        .trim();

      const execution = await this.executeTool(
        userId,
        'delete_task',
        { task_title_or_id: taskQuery || context.lastTaskId || '' },
        userMessage
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_task',
        toolArgs: { task_title_or_id: taskQuery },
        actionResult: execution.result,
        model: 'assessor-intent-flow',
        success: true,
      };
    }

    // 0.2 High Priority: Explicit task listing/querying
    // Examples: "Quais tarefas de amanhã", "Listar quais tarefas de amanhã", "Quais as tarefas", "Listar tarefas"
    const isTaskQuery =
      lowerMessage.startsWith('quais tarefas') ||
      lowerMessage.startsWith('quais as tarefas') ||
      lowerMessage.startsWith('listar tarefas') ||
      lowerMessage.startsWith('listar quais tarefas') ||
      lowerMessage.startsWith('listar as tarefas') ||
      lowerMessage.startsWith('ver tarefas') ||
      lowerMessage.startsWith('minhas tarefas') ||
      lowerMessage.startsWith('tarefas de amanhã') ||
      lowerMessage.startsWith('tarefas de amanha') ||
      lowerMessage.startsWith('tarefas de hoje') ||
      lowerMessage.startsWith('o que tenho de tarefas') ||
      lowerMessage.startsWith('mostra as tarefas') ||
      lowerMessage.startsWith('mostrar as tarefas') ||
      lowerMessage.startsWith('consultar tarefas');

    if (isTaskQuery) {
      let dateFilter = 'all';
      if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
        dateFilter = 'tomorrow';
      } else if (lowerMessage.includes('hoje')) {
        dateFilter = 'today';
      }

      const execution = await this.executeTool(userId, 'list_tasks', { date_filter: dateFilter }, userMessage);
      return {
        response: execution.naturalResponse,
        toolCalled: 'list_tasks',
        toolArgs: { date_filter: dateFilter },
        actionResult: execution.result,
        model: 'assessor-intent-flow',
        success: true,
      };
    }

    // 1. Contextual cancellation: "cancela", "cancele", "cancela o compromisso", "cancele o compromisso"
    if (
      !lowerMessage.includes('tarefa') &&
      !lowerMessage.includes('tarefas') &&
      (lowerMessage === 'cancela' ||
        lowerMessage === 'cancele' ||
        lowerMessage === 'cancela.' ||
        lowerMessage === 'cancele.' ||
        lowerMessage === 'cancelar' ||
        lowerMessage.startsWith('cancela o compromisso') ||
        lowerMessage.startsWith('cancele o compromisso') ||
        lowerMessage.startsWith('cancela a reunião') ||
        lowerMessage.startsWith('cancele a reunião')) &&
      context.lastEventId
    ) {
      const targetId = context.lastEventId;
      const execution = await this.executeTool(
        userId,
        'delete_event',
        { event_title_or_id: targetId },
        userMessage
      );
      context.lastEventId = undefined;
      context.lastEventTitle = undefined;
      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_event',
        toolArgs: { event_title_or_id: targetId },
        actionResult: execution.result,
        model: 'assessor-contextual-flow',
        success: true,
      };
    }

    // 2. Contextual time change for event: "Muda para 15h", "Mude para 16h", "Mude o TESTE para 16h", "Muda o TESTE para 16h"
    if (
      (lowerMessage.startsWith('muda para') ||
        lowerMessage.startsWith('mude para') ||
        lowerMessage.startsWith('altera para') ||
        lowerMessage.startsWith('altere para') ||
        lowerMessage.startsWith('passa para') ||
        lowerMessage.startsWith('passe para') ||
        lowerMessage.includes('mude o teste para') ||
        lowerMessage.includes('muda o teste para') ||
        lowerMessage.includes('mudar para') ||
        lowerMessage.includes('passar para')) &&
      context.lastEventId
    ) {
      const baseDate = context.lastEventStart ? new Date(context.lastEventStart) : new Date();
      const newStart = this.resolveTime(userMessage, baseDate);
      const execution = await this.executeTool(
        userId,
        'update_event',
        {
          event_title_or_id: context.lastEventId,
          new_start_time: newStart.toISOString(),
        },
        userMessage
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'update_event',
        toolArgs: { event_title_or_id: context.lastEventId, new_start_time: newStart.toISOString() },
        actionResult: execution.result,
        model: 'assessor-contextual-flow',
        success: true,
      };
    }

    // 3. Contextual completion for task: "Concluí a tarefa TESTE", "Conclui a tarefa", "Concluí a tarefa"
    if (
      lowerMessage.startsWith('concluí a tarefa') ||
      lowerMessage.startsWith('conclui a tarefa') ||
      lowerMessage.startsWith('concluir tarefa') ||
      lowerMessage === 'conclui' ||
      lowerMessage === 'concluí' ||
      lowerMessage === 'feito'
    ) {
      const taskQuery = lowerMessage.replace(/^(concluí a tarefa|conclui a tarefa|concluir tarefa)\s*/i, '').trim() || context.lastTaskId || '';
      const execution = await this.executeTool(
        userId,
        'complete_task',
        { task_title_or_id: taskQuery },
        userMessage
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'complete_task',
        toolArgs: { task_title_or_id: taskQuery },
        actionResult: execution.result,
        model: 'assessor-contextual-flow',
        success: true,
      };
    }

    // 4. Contextual update for task date: e.g., "Coloca para sexta", "Joga para amanhã"
    if (
      (lowerMessage.startsWith('coloca para') ||
        lowerMessage.startsWith('joga para')) &&
      context.lastTaskId &&
      !lowerMessage.includes('reunião') &&
      !lowerMessage.includes('compromisso') &&
      !lowerMessage.includes('dentista')
    ) {
      const newDue = this.resolveTime(userMessage).toISOString();
      const execution = await this.executeTool(
        userId,
        'update_task',
        {
          task_title_or_id: context.lastTaskId,
          due_at: newDue,
        },
        userMessage
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'update_task',
        toolArgs: { task_title_or_id: context.lastTaskId, due_at: newDue },
        actionResult: execution.result,
        model: 'assessor-contextual-flow',
        success: true,
      };
    }

    const memoryContext = memories.map((m) => `• [${m.category}] ${m.key}: ${m.value}`).join('\n');
    const googleStatusText = googleConfig.connected && googleConfig.access_token
      ? `GOOGLE WORKSPACE CONECTADO (Conta: ${googleConfig.email || 'usuário'}). O Google Calendar é a fonte canônica para eventos e o Google Tasks para tarefas.`
      : `GOOGLE WORKSPACE NÃO CONECTADO AINDA. Use o banco interno e lembre o usuário caso necessário.`;

    const recentEntitiesList = (context.recentCreatedEntities || [])
      .slice(0, 5)
      .map(
        (e) =>
          `• [${e.type.toUpperCase()}] "${e.title}" ${
            e.amount ? `R$ ${e.amount.toFixed(2)}` : ''
          } ${e.timeOrDue ? `(Horário/Data: ${e.timeOrDue})` : ''} [ID: ${e.id}]`
      )
      .join('\n');

    const systemInstruction = `Você é o ASSESSOR IA (KUMA), o assessor pessoal executivo de altíssima eficiência do usuário (${profile.full_name}) no WhatsApp.

CONTEXTO TEMPORAL:
- Data e Hora Atual em São Paulo: ${nowLocale} (ISO: ${nowIso})
- Fuso Horário Padrão: ${profile.timezone}
- Status Google Workspace: ${googleStatusText}

MEMÓRIA PERSISTENTE DO USUÁRIO:
${memoryContext || 'Nenhuma memória personalizada cadastrada ainda.'}

ÚLTIMOS LANÇAMENTOS E ITENS CRIADOS (Úteis para correções, alterações e cancelamentos):
${recentEntitiesList || 'Nenhum item recente no histórico imediato.'}

DIRETRIZES DE ATUAÇÃO E REGRAS DE NEGÓCIO:
1. Você é um AGENTE OPERACIONAL DE AÇÃO IMEDIATA. NUNCA dê respostas puramente textuais de "vou anotar" ou "anotado" sem invocar a ferramenta correspondente. Sempre use Function Calling (Tool Calling).
2. PRIORIDADE TOTAL DE CRIAÇÃO E IDENTIFICAÇÃO DE ORDENS:
   - CONSULTAS DE TAREFAS ("quais tarefas...", "listar tarefas...", "ver tarefas...", "o que tenho de tarefas...") -> NUNCA CRIE UMA TAREFA! Chame list_tasks com o date_filter correspondente ("tomorrow" para amanhã, "today" para hoje, ou "all").
   - CANCELAMENTO DE LEMBRETE ("apagar esse lembrete que você cadastrou aí", "cancela o lembrete", "excluir esse lembrete", "desfaz o lembrete") -> Chame delete_reminder! NUNCA chame delete_task para lembretes!
   - CANCELAMENTO DE TAREFAS ("cancelar todas as tarefas de amanhã", "cancele todas", "cancela as tarefas", "apagar tarefas") -> Chame delete_tasks (com filter: "tomorrow", "today" ou "all").
   - CANCELAR UMA TAREFA ESPECÍFICA ("cancela a tarefa de comprar pão", "excluir tarefa X") -> Chame delete_task com o título ou ID.
   - CANCELAR COMPROMISSO/AGENDA ("cancela a reunião", "desmarca dentista") -> Chame delete_event.
   - CRIAÇÃO DE TAREFAS -> Chame create_task SOMENTE quando for uma ordem genuína de adição ("comprar...", "lembrar de pagar...", "anota aí que preciso...", "cobrar fulano..."). NUNCA crie tarefas a partir de perguntas ou pedidos de listagem/cancelamento!
   - Agenda / Reuniões / Consultas / Treinos com hora marcada ("marca dentista", "agenda reunião", "coloca amanhã às 15h") -> Chame create_event.
   - Consultas de agenda ("o que tenho hoje", "minha agenda amanhã...") -> Chame list_events.
3. SEPARAÇÃO DE MÚLTIPLAS TAREFAS / ORDENS MÚLTIPLAS EM UMA ÚNICA MENSAGEM:
   - Se o usuário enviar uma mensagem ou áudio contendo 2 ou mais ações distintas (ex: "Amanhã levar o carro para consertar passar na escola de Ana Marcela para pegar meu presentinho", ou "comprar pão e pagar conta de luz", ou "marcar reunião amanhã 10h e call quinta 16h"):
   - IMPORTANTE: VOCÊ DEVE EMITIR UMA CHAMADA DE FERRAMENTA (FUNCTION CALL) SEPARADA PARA CADA ITEM! Exemplo: create_task para o carro e create_task para passar na escola! NUNCA junte tudo em uma única tarefa com o texto inteiro!
4. CORREÇÕES E CONSERTOS DO ÚLTIMO PEDIDO ("conserta o último pedido", "errei...", "não era 16h era 17h", "errei o valor", "separar em duas tarefas"):
   - Se o usuário disser que errou, ou pedir para consertar o último pedido/lançamento, ou pedir para dividir uma tarefa em duas:
   - NUNCA crie uma nova tarefa com o texto da reclamação! Chame a ferramenta de correção apropriada:
     * Para separar em duas ou mais tarefas ("separar em duas tarefas e coloca isso carro 7 horas e Marcela 8 horas"): chame correct_last_action com action="split" e informe os split_items, OU chame delete_task para a anterior e crie as novas!
     * Para corrigir horário de evento: update_event ou correct_last_action.
     * Para corrigir valor de compra ou despesa ("errei a compra, foi 40 reais"): update_expense ou correct_last_action.
     * Para alterar o prazo de uma tarefa: update_task.
5. FINANÇAS, COMPRAS E GASTOS:
   - Lançamento de despesas ("gastei 50 no almoço", "comprei 120 de gasolina", "lançar 80 de mercado"): chame create_expense.
   - Correção de compra ("conserta a última compra para 60", "não foi 50 foi 45"): chame update_expense.
   - Listar ou totalizar gastos ("quanto gastei hoje?", "listar gastos"): chame list_expenses.
6. GOOGLE CALENDAR & TASKS CANÔNICOS:
   - Google Calendar é a fonte canônica para compromissos e o Google Tasks para tarefas e listas.
7. LINGUAGEM E RESPOSTAS:
   - Respostas elegantes, diretas, objetivas e educadas no WhatsApp brasileiro.
   - Use emojis funcionais (📅 agenda, ✅ tarefa, ⏰ lembrete, 💸 financeiro, 🔄 correção, 🗑️ cancelamento, ⚠️ conflito).`;

    const ai = this.getClient();

    if (ai) {
      // Build conversation contents with previous turns if available
      const contents: any[] = [];
      if (options.phone) {
        try {
          const conv = db.getOrCreateConversation(userId, options.phone);
          const msgs = db.getMessages(conv.id);
          const recent = msgs.slice(-6);
          for (const m of recent) {
            if (m.text === userMessage || (m.raw_payload && m.raw_payload.messageId === messageId)) continue;
            const cleanText = m.text.replace(/^[🎙️\s\*\_\[\]Áudio\:]+/g, '').trim();
            if (cleanText) {
              contents.push({
                role: m.direction === 'inbound' ? 'user' : 'model',
                parts: [{ text: cleanText }],
              });
            }
          }
        } catch (_) {}
      }
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let response: any = null;
      let usedModel = 'gemini-3.8-flash';

      const toolDeclarations = [
        create_task_tool,
        update_task_tool,
        complete_task_tool,
        delete_task_tool,
        delete_tasks_tool,
        list_tasks_tool,
        create_reminder_tool,
        list_reminders_tool,
        delete_reminder_tool,
        create_event_tool,
        update_event_tool,
        delete_event_tool,
        check_availability_tool,
        list_events_tool,
        create_note_tool,
        search_notes_tool,
        find_contact_tool,
        create_contact_tool,
        save_memory_tool,
        get_daily_summary_tool,
        create_expense_tool,
        update_expense_tool,
        list_expenses_tool,
        correct_last_action_tool,
      ];

      for (const modelCandidate of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelCandidate,
            contents,
            config: {
              systemInstruction,
              temperature: 0.15,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              tools: [{ functionDeclarations: toolDeclarations }],
            },
          });
          usedModel = modelCandidate;
          break;
        } catch (err: any) {
          console.warn(`[AssessorAgent] Model ${modelCandidate} failed:`, err?.message || err);
        }
      }

      if (response) {
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const executions: Array<{ toolName: string; args: any; result: any; naturalResponse: string }> = [];

          for (const call of functionCalls) {
            const toolName = call.name || 'unknown_tool';
            const toolArgs: any = call.args || {};
            const execution = await this.executeTool(userId, toolName, toolArgs, userMessage);
            executions.push({
              toolName,
              args: toolArgs,
              result: execution.result,
              naturalResponse: execution.naturalResponse,
            });

            db.recordAgentAction({
              user_id: userId,
              message_id: messageId,
              user_message: userMessage,
              detected_intent: toolName,
              tool_called: toolName,
              tool_arguments: toolArgs,
              result: execution.result,
              assistant_response: execution.naturalResponse,
              model: usedModel,
              success: true,
            });
          }

          const combinedResponse = executions.map((e) => e.naturalResponse).join('\n\n');

          return {
            response: combinedResponse,
            toolCalled: executions.length === 1 ? executions[0].toolName : 'multiple_actions',
            toolArgs: executions.length === 1 ? executions[0].args : executions.map((e) => ({ tool: e.toolName, args: e.args })),
            actionResult: executions.length === 1 ? executions[0].result : executions.map((e) => e.result),
            model: usedModel,
            success: true,
          };
        }

        const text = response.text || 'Entendido! Como posso ajudar você a organizar suas pendências?';
        db.recordAgentAction({
          user_id: userId,
          message_id: messageId,
          user_message: userMessage,
          detected_intent: 'conversation',
          tool_called: 'none',
          tool_arguments: {},
          result: { acknowledged: true },
          assistant_response: text,
          model: usedModel,
          success: true,
        });

        return {
          response: text,
          model: usedModel,
          success: true,
        };
      }
    }

    return await this.fallbackEngine(userId, userMessage, messageId);
  }

  public async executeTool(userId: string, toolName: string, args: any, rawPrompt: string): Promise<{ result: any; naturalResponse: string }> {
    const profile = db.getProfile(userId);
    const googleConfig = db.getGoogleConfig();
    const token = profile.google_access_token || (userId === 'user_default' ? googleConfig.access_token : undefined);
    const isConnected = profile.google_connected ?? (userId === 'user_default' ? googleConfig.connected : false);
    const isExpired = profile.google_token_expired ?? (userId === 'user_default' ? googleConfig.token_expired : false);
    const hasGoogle = Boolean(isConnected && token && !isExpired);
    const context = getUserContext(userId);

    switch (toolName) {
      // ----------------------------------------------------
      // 1. TAREFAS (GOOGLE TASKS)
      // ----------------------------------------------------
      case 'create_task': {
        const priority = (args.priority as TaskPriority) || 'normal';
        let dueAt = args.due_at;
        if (!dueAt && (rawPrompt.toLowerCase().includes('hoje') || rawPrompt.toLowerCase().includes('amanhã') || rawPrompt.toLowerCase().includes('amanha'))) {
          dueAt = this.resolveTime(rawPrompt).toISOString();
        }

        let googleTaskId: string | undefined;

        if (hasGoogle && token) {
          try {
            const gTask = await googleTasksService.createTask(token, {
              title: args.title,
              notes: args.description || `Criado via WhatsApp URSO JR. [Prioridade: ${priority.toUpperCase()}]`,
              due: dueAt || undefined,
            });
            googleTaskId = gTask.id;
          } catch (gErr: any) {
            const msg = gErr?.message || String(gErr);
            if (msg.includes('401') || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('credential')) {
              db.markGoogleTokenExpired('Token Google Tasks expirado', userId);
              console.warn('[AssessorAgent] Google token expired, fell back to local storage.');
            } else {
              console.warn('[AssessorAgent] Google Tasks notice, using local storage:', msg);
            }
          }
        }

        const task = db.createTask({
          user_id: userId,
          title: args.title,
          description: args.description || '',
          priority,
          status: 'pending',
          due_at: dueAt || null,
          completed_at: null,
          google_task_id: googleTaskId || null,
          synced_at: googleTaskId ? new Date().toISOString() : null,
        });

        context.lastTaskId = task.id;
        context.lastTaskTitle = task.title;
        context.recentCreatedEntities = context.recentCreatedEntities || [];
        context.recentCreatedEntities.unshift({
          id: task.id,
          type: 'task',
          title: task.title,
          timeOrDue: dueAt || undefined,
          createdAt: Date.now(),
        });
        if (context.recentCreatedEntities.length > 10) {
          context.recentCreatedEntities = context.recentCreatedEntities.slice(0, 10);
        }

        const dateStr = dueAt
          ? new Date(dueAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'short' })
          : 'Sem prazo fixo';

        const googleNote = googleTaskId ? ' *(sincronizado no Google Tasks)*' : '';
        return {
          result: task,
          naturalResponse: `✅ Tarefa criada com sucesso${googleNote}:\n• *${task.title}*\n• Prazo: ${dateStr}`,
        };
      }

      case 'update_task': {
        const query = (args.task_title_or_id || context.lastTaskId || '').toLowerCase();
        const tasks = db.getTasks(userId);
        const match = tasks.find(
          (t) => t.id === query || t.title.toLowerCase().includes(query)
        );

        if (!match) {
          return {
            result: { found: false },
            naturalResponse: `Não localizei uma tarefa correspondente para atualizar. Qual o nome da tarefa?`,
          };
        }

        const newDue = args.due_at;
        const newTitle = args.new_title || match.title;

        if (hasGoogle && token && match.google_task_id) {
          try {
            await googleTasksService.updateTask(token, match.google_task_id, {
              title: newTitle,
              due: newDue,
            });
          } catch (gErr) {
            console.error('[AssessorAgent] Error updating Google Task:', gErr);
          }
        }

        db.updateTask(match.id, {
          title: newTitle,
          due_at: newDue,
        });

        context.lastTaskId = match.id;
        context.lastTaskTitle = newTitle;

        const dateStr = new Date(newDue).toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        return {
          result: { updatedId: match.id, title: newTitle, due_at: newDue },
          naturalResponse: `🗓️ Prazo da tarefa *"${newTitle}"* atualizado para: *${dateStr}*.`,
        };
      }

      case 'complete_task': {
        const query = (args.task_title_or_id || context.lastTaskId || '').toLowerCase();
        const tasks = db.getTasks(userId);
        const match = tasks.find(
          (t) => t.id === query || t.title.toLowerCase().includes(query)
        );

        if (match) {
          if (hasGoogle && token && match.google_task_id) {
            try {
              await googleTasksService.completeTask(token, match.google_task_id);
            } catch (gErr) {
              console.error('[AssessorAgent] Error completing Google Task:', gErr);
            }
          }

          db.updateTask(match.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
          });

          return {
            result: { completedId: match.id, title: match.title },
            naturalResponse: `🎉 Concluído! Marquei a tarefa como feita no Google Tasks:\n• *${match.title}*`,
          };
        }

        return {
          result: { found: false },
          naturalResponse: `Não localizei uma tarefa correspondente a "${args.task_title_or_id}". Deseja verificar suas tarefas pendentes?`,
        };
      }

      case 'delete_task': {
        let tasks = db.getTasks(userId);

        if (hasGoogle && token) {
          try {
            await googleTasksService.syncTasks(token, db);
            tasks = db.getTasks(userId);
          } catch (gErr) {
            console.warn('[AssessorAgent] Sync before delete warning:', gErr);
          }
        }

        const rawQuery = (args.task_title_or_id || '').trim();
        const taskQueryLower = rawQuery.toLowerCase();

        let match: Task | undefined;
        if (rawQuery && rawQuery !== 'undefined' && rawQuery !== 'null') {
          match = tasks.find(
            (t) => t.id === rawQuery || t.title.toLowerCase().includes(taskQueryLower)
          );
        } else if (context.lastTaskId) {
          match = tasks.find((t) => t.id === context.lastTaskId);
        }

        if (!match) {
          return {
            result: { found: false },
            naturalResponse: rawQuery
              ? `Não localizei nenhuma tarefa com o nome "${args.task_title_or_id}" para cancelar.`
              : `Qual tarefa você gostaria de cancelar? Por favor, me informe o título da tarefa.`,
          };
        }

        if (hasGoogle && token && match.google_task_id) {
          try {
            await googleTasksService.deleteTask(token, match.google_task_id);
          } catch (gErr) {
            console.warn('[AssessorAgent] Error deleting Google Task:', gErr);
          }
        }

        if (match.reminder_id) {
          db.deleteReminder(match.reminder_id);
        }

        db.deleteTask(match.id);

        if (context.lastTaskId === match.id) {
          context.lastTaskId = undefined;
          context.lastTaskTitle = undefined;
        }

        context.lastActionType = 'delete_task';

        return {
          result: { deletedId: match.id, title: match.title },
          naturalResponse: `🗑️ A tarefa *"${match.title}"* foi cancelada e removida do Google Tasks.`,
        };
      }

      case 'delete_tasks': {
        const filter = args.filter || 'all';
        const query = args.query ? args.query.toLowerCase().trim() : '';
        let tasks = db.getTasks(userId).filter((t) => t.status === 'pending' || t.status === 'in_progress');

        if (hasGoogle && token) {
          try {
            await googleTasksService.syncTasks(token, db);
            tasks = db.getTasks(userId).filter((t) => t.status === 'pending' || t.status === 'in_progress');
          } catch (gErr) {
            console.warn('[AssessorAgent] Sync before delete_tasks warning:', gErr);
          }
        }

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let targetTasks: typeof tasks = [];
        let label = 'todas as tarefas pendentes';

        if (filter === 'tomorrow') {
          targetTasks = tasks.filter((t) => this.isSameDate(t.due_at, tomorrow));
          label = 'de amanhã';
        } else if (filter === 'today') {
          targetTasks = tasks.filter((t) => this.isSameDate(t.due_at, now));
          label = 'de hoje';
        } else if (filter === 'context' && context.lastListedTaskIds && context.lastListedTaskIds.length > 0) {
          targetTasks = tasks.filter((t) => context.lastListedTaskIds?.includes(t.id));
          label = context.lastQueriedDate === 'tomorrow' ? 'de amanhã' : 'listadas';
        } else if (filter === 'query' && query) {
          targetTasks = tasks.filter((t) => t.title.toLowerCase().includes(query));
          label = `com "${query}"`;
        } else {
          targetTasks = tasks;
          label = 'todas';
        }

        if (targetTasks.length === 0) {
          return {
            result: { deletedCount: 0 },
            naturalResponse: `Não encontrei tarefas pendentes ${label} para cancelar.`,
          };
        }

        const deletedTitles: string[] = [];

        for (const task of targetTasks) {
          if (hasGoogle && token && task.google_task_id) {
            try {
              await googleTasksService.deleteTask(token, task.google_task_id);
            } catch (err) {
              console.warn(`[AssessorAgent] Error deleting Google Task ${task.google_task_id}:`, err);
            }
          }

          if (task.reminder_id) {
            db.deleteReminder(task.reminder_id);
          }

          db.deleteTask(task.id);
          deletedTitles.push(task.title);
        }

        context.lastListedTaskIds = undefined;
        context.lastTaskId = undefined;
        context.lastTaskTitle = undefined;
        context.lastActionType = 'delete_tasks';

        const listStr = deletedTitles.map((t) => `• *${t}*`).join('\n');
        return {
          result: { deletedCount: deletedTitles.length, titles: deletedTitles },
          naturalResponse: `🗑️ *Cancelei ${deletedTitles.length} tarefa(s) ${label}:*\n\n${listStr}\n\nTodas foram removidas do seu Google Tasks com sucesso!`,
        };
      }

      case 'list_tasks': {
        let tasks = db.getTasks(userId).filter((t) => t.status === 'pending' || t.status === 'in_progress');

        // If Google Tasks is connected, fetch and sync
        if (hasGoogle && token) {
          try {
            await googleTasksService.syncTasks(token, db);
            tasks = db.getTasks(userId).filter((t) => t.status === 'pending' || t.status === 'in_progress');
          } catch (gErr) {
            console.warn('[AssessorAgent] Failed to fetch live Google Tasks, using local cache:', gErr);
          }
        }

        const dateFilter = args.date_filter || '';
        let periodLabel = '';
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateFilter === 'tomorrow') {
          tasks = tasks.filter((t) => this.isSameDate(t.due_at, tomorrow));
          periodLabel = 'para amanhã';
          context.lastQueriedDate = 'tomorrow';
        } else if (dateFilter === 'today') {
          tasks = tasks.filter((t) => this.isSameDate(t.due_at, now));
          periodLabel = 'para hoje';
          context.lastQueriedDate = 'today';
        } else if (dateFilter === 'all') {
          periodLabel = 'pendentes';
          context.lastQueriedDate = 'all';
        }

        if (args.query) {
          const q = args.query.toLowerCase();
          tasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
        }

        context.lastActionType = 'list_tasks';
        context.lastListedTaskIds = tasks.map((t) => t.id);

        if (tasks.length === 0) {
          return {
            result: [],
            naturalResponse: periodLabel
              ? `Você não tem tarefas pendentes ${periodLabel}! Tudo em dia! 🚀`
              : `Você não tem tarefas pendentes no momento! Tudo em dia! 🚀`,
          };
        }

        const lines = tasks.map((t, idx) => {
          const due = t.due_at
            ? ` (Prazo: ${new Date(t.due_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })})`
            : '';
          return `${idx + 1}. *${t.title}*${due}`;
        }).join('\n');

        const titleHeader = periodLabel ? `${periodLabel}` : `pendentes`;
        return {
          result: tasks,
          naturalResponse: `📋 *Suas tarefas ${titleHeader} (${tasks.length}):*\n\n${lines}`,
        };
      }

      // ----------------------------------------------------
      // 2. AGENDA & COMPROMISSOS (GOOGLE CALENDAR)
      // ----------------------------------------------------
      case 'create_event': {
        const start = args.start_time ? new Date(args.start_time) : this.resolveTime(rawPrompt);
        const durationMin = args.duration_minutes || this.getDefaultDuration(args.title);
        const end = args.end_time ? new Date(args.end_time) : new Date(start.getTime() + durationMin * 60000);

        // Conflict detection: Check if user already has an event in this slot
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const force = Boolean(args.force_conflict);

        if (!force) {
          let conflictingEvents: any[] = [];

          if (hasGoogle && token) {
            try {
              const liveEvents = await googleCalendarService.listEvents(token, {
                timeMin: startIso,
                timeMax: endIso,
                singleEvents: true,
              });
              conflictingEvents = liveEvents.filter((e: any) => e.status !== 'cancelled');
            } catch (gErr: any) {
              const msg = gErr?.message || String(gErr);
              if (msg.includes('401') || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('credential')) {
                db.markGoogleTokenExpired('Token Google Calendar expirado');
                console.warn('[AssessorAgent] Google token expired, fell back to local storage.');
              } else {
                console.warn('[AssessorAgent] Google FreeBusy notice, checking local:', msg);
              }
            }
          }

          if (conflictingEvents.length === 0) {
            const localEvents = db.getEvents(userId);
            conflictingEvents = localEvents.filter(
              (e) =>
                e.status !== 'cancelled' &&
                new Date(e.start_time) < end &&
                new Date(e.end_time) > start
            );
          }

          if (conflictingEvents.length > 0) {
            const conflict = conflictingEvents[0];
            const conflictTitle = conflict.summary || conflict.title || 'Outro compromisso';
            const conflictStart = new Date(conflict.start?.dateTime || conflict.start_time);
            const conflictEnd = new Date(conflict.end?.dateTime || conflict.end_time);

            const startFmt = conflictStart.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            const endFmt = conflictEnd.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

            // Calculate alternate proposed start: directly after the conflicting event
            const alternateStart = conflictEnd;
            const alternateEnd = new Date(alternateStart.getTime() + durationMin * 60000);
            const altStartFmt = alternateStart.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

            context.pendingConflictEvent = {
              title: args.title,
              proposedStart: startIso,
              proposedEnd: endIso,
              location: args.location,
              description: args.description,
              alternateStart: alternateStart.toISOString(),
              alternateEnd: alternateEnd.toISOString(),
            };

            return {
              result: { conflict: true, conflictingEvent: conflictTitle, alternateStart: alternateStart.toISOString() },
              naturalResponse: `⚠️ *Atenção:* Você já tem *${conflictTitle}* das ${startFmt} às ${endFmt}.\n\nPosso colocar *${args.title}* às *${altStartFmt}* (logo após)?`,
            };
          }
        }

        // Proceed with event creation
        let googleEventId: string | undefined;
        let htmlLink: string | undefined;

        if (hasGoogle && token) {
          try {
            const createdGEvent = await googleCalendarService.createEvent(token, {
              summary: args.title,
              description: args.description || 'Agendado pelo URSO JR. via WhatsApp',
              location: args.location || undefined,
              start: { dateTime: startIso, timeZone: 'America/Sao_Paulo' },
              end: { dateTime: endIso, timeZone: 'America/Sao_Paulo' },
            });
            googleEventId = createdGEvent.id;
            htmlLink = createdGEvent.htmlLink;
          } catch (gErr: any) {
            const msg = gErr?.message || String(gErr);
            if (msg.includes('401') || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('credential')) {
              db.markGoogleTokenExpired('Token Google Calendar expirado', userId);
              console.warn('[AssessorAgent] Google token expired, fell back to local storage.');
            } else {
              console.warn('[AssessorAgent] Google Calendar notice, using local storage:', msg);
            }
          }
        }

        const evt = db.createEvent({
          user_id: userId,
          title: args.title,
          description: args.description || '',
          location: args.location || '',
          start_time: startIso,
          end_time: endIso,
          status: 'confirmed',
          google_event_id: googleEventId || null,
          html_link: htmlLink || null,
          synced_at: googleEventId ? new Date().toISOString() : null,
        });

        context.lastEventId = evt.id;
        context.lastEventTitle = evt.title;
        context.lastEventStart = startIso;
        context.lastEventEnd = endIso;
        context.recentCreatedEntities = context.recentCreatedEntities || [];
        context.recentCreatedEntities.unshift({
          id: evt.id,
          type: 'event',
          title: evt.title,
          timeOrDue: startIso,
          createdAt: Date.now(),
        });
        if (context.recentCreatedEntities.length > 10) {
          context.recentCreatedEntities = context.recentCreatedEntities.slice(0, 10);
        }

        const dayName = start.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
        const timeFmt = start.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

        return {
          result: evt,
          naturalResponse: `📅 *${evt.title}* marcado para ${dayName} às ${timeFmt}.${evt.location ? `\n📍 Local: ${evt.location}` : ''}`,
        };
      }

      case 'list_events': {
        const filter = args.date_filter || 'today';
        const now = new Date();
        let timeMin: Date;
        let timeMax: Date;
        let periodLabel = 'Hoje';

        if (filter === 'tomorrow') {
          timeMin = new Date(now);
          timeMin.setDate(timeMin.getDate() + 1);
          timeMin.setHours(0, 0, 0, 0);
          timeMax = new Date(timeMin);
          timeMax.setHours(23, 59, 59, 999);
          periodLabel = 'Amanhã';
        } else if (filter === 'week') {
          timeMin = new Date(now);
          timeMin.setHours(0, 0, 0, 0);
          timeMax = new Date(now);
          timeMax.setDate(timeMax.getDate() + 7);
          timeMax.setHours(23, 59, 59, 999);
          periodLabel = 'Próximos 7 dias';
        } else if (filter === 'today') {
          timeMin = new Date(now);
          timeMin.setHours(0, 0, 0, 0);
          timeMax = new Date(now);
          timeMax.setHours(23, 59, 59, 999);
          periodLabel = 'Hoje';
        } else {
          // Specific date or parsed expression
          timeMin = this.resolveTime(filter, now);
          timeMin.setHours(0, 0, 0, 0);
          timeMax = new Date(timeMin);
          timeMax.setHours(23, 59, 59, 999);
          periodLabel = timeMin.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' });
        }

        let events: any[] = [];

        if (hasGoogle && token) {
          try {
            const googleEvents = await googleCalendarService.listEvents(token, {
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              q: args.query || undefined,
            });
            events = googleEvents.map((g: any) => ({
              title: g.summary || 'Compromisso',
              start_time: g.start?.dateTime || g.start?.date,
              end_time: g.end?.dateTime || g.end?.date,
              location: g.location || '',
              google_event_id: g.id,
            }));
          } catch (gErr) {
            console.warn('[AssessorAgent] Error listing Google Calendar events, using local cache:', gErr);
          }
        }

        if (events.length === 0) {
          const localEvents = db.getEvents(userId);
          events = localEvents.filter((e) => {
            const eStart = new Date(e.start_time);
            return eStart >= timeMin && eStart <= timeMax && e.status !== 'cancelled';
          });
        }

        if (events.length === 0) {
          return {
            result: [],
            naturalResponse: `📅 Sua agenda está livre para ${periodLabel}! Sem compromissos marcados.`,
          };
        }

        const lines = events.map((e) => {
          const t = new Date(e.start_time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          const loc = e.location ? ` (${e.location})` : '';
          return `• ${t} — *${e.title}*${loc}`;
        }).join('\n');

        return {
          result: events,
          naturalResponse: `📅 *Compromissos para ${periodLabel} (${events.length}):*\n\n${lines}`,
        };
      }

      case 'check_availability': {
        const date = this.resolveTime(args.date || 'amanhã');
        const period = args.period || 'afternoon';
        let startHour = 8;
        let endHour = 18;

        if (period === 'morning') {
          startHour = 8;
          endHour = 12;
        } else if (period === 'afternoon') {
          startHour = 13;
          endHour = 18;
        } else if (period === 'evening') {
          startHour = 18;
          endHour = 22;
        }

        const windowStart = new Date(date);
        windowStart.setHours(startHour, 0, 0, 0);
        const windowEnd = new Date(date);
        windowEnd.setHours(endHour, 0, 0, 0);

        let busySlots: Array<{ start: string; end: string }> = [];

        if (hasGoogle && token) {
          try {
            busySlots = await googleCalendarService.getFreeBusy(token, {
              timeMin: windowStart.toISOString(),
              timeMax: windowEnd.toISOString(),
            });
          } catch (gErr) {
            console.warn('[AssessorAgent] FreeBusy error, fallback to local:', gErr);
          }
        }

        if (busySlots.length === 0) {
          const localEvents = db.getEvents(userId);
          busySlots = localEvents
            .filter((e) => new Date(e.start_time) < windowEnd && new Date(e.end_time) > windowStart)
            .map((e) => ({ start: e.start_time, end: e.end_time }));
        }

        const periodNames: Record<string, string> = {
          morning: 'de manhã',
          afternoon: 'à tarde',
          evening: 'à noite',
          full_day: 'no dia',
        };

        const dayName = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'short' });

        if (busySlots.length === 0) {
          return {
            result: { free: true, busySlots: [] },
            naturalResponse: `🟢 Sua agenda está totalmente livre ${periodNames[period] || ''} em *${dayName}* (das ${startHour}h às ${endHour}h).`,
          };
        }

        const busyDescriptions = busySlots.map((b) => {
          const bStart = new Date(b.start).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          const bEnd = new Date(b.end).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          return `${bStart} - ${bEnd}`;
        }).join(', ');

        return {
          result: { free: false, busySlots },
          naturalResponse: `🕒 Em *${dayName}* você possui horários ocupados:\n• ${busyDescriptions}\n\nOs demais horários do período estão disponíveis para agendamento!`,
        };
      }

      case 'delete_event': {
        const query = (args.event_title_or_id || '').toLowerCase();
        const events = db.getEvents(userId);
        const match = events.find((e) => e.id === query || e.title.toLowerCase().includes(query));

        if (match) {
          if (hasGoogle && token && match.google_event_id) {
            try {
              await googleCalendarService.deleteEvent(token, match.google_event_id);
            } catch (gErr) {
              console.error('[AssessorAgent] Error deleting Google Calendar event:', gErr);
            }
          }

          db.deleteEvent(match.id);
          return {
            result: { deleted: true, title: match.title },
            naturalResponse: `🗑️ O compromisso *"${match.title}"* foi cancelado e removido da sua agenda.`,
          };
        }

        return {
          result: { found: false },
          naturalResponse: `Não localizei o compromisso "${args.event_title_or_id}" na sua agenda.`,
        };
      }

      case 'update_event': {
        const query = (args.event_title_or_id || context.lastEventTitle || '').toLowerCase();
        const events = db.getEvents(userId);
        const match = events.find((e) => e.id === query || e.title.toLowerCase().includes(query));

        if (!match) {
          return {
            result: { found: false },
            naturalResponse: `Não localizei o compromisso para alterar o horário.`,
          };
        }

        const newStart = new Date(args.new_start_time);
        const durationMin = args.new_end_time
          ? (new Date(args.new_end_time).getTime() - newStart.getTime()) / 60000
          : this.getDefaultDuration(match.title);
        const newEnd = args.new_end_time ? new Date(args.new_end_time) : new Date(newStart.getTime() + durationMin * 60000);

        if (hasGoogle && token && match.google_event_id) {
          try {
            await googleCalendarService.updateEvent(token, match.google_event_id, {
              summary: args.new_title || match.title,
              start: { dateTime: newStart.toISOString(), timeZone: 'America/Sao_Paulo' },
              end: { dateTime: newEnd.toISOString(), timeZone: 'America/Sao_Paulo' },
            });
          } catch (gErr) {
            console.error('[AssessorAgent] Error updating Google Calendar event:', gErr);
          }
        }

        db.updateEvent(match.id, {
          title: args.new_title || match.title,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        });

        const dayName = newStart.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
        const timeFmt = newStart.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

        return {
          result: { updated: true, title: match.title, start_time: newStart.toISOString() },
          naturalResponse: `🔄 Compromisso *"${match.title}"* reagendado para ${dayName} às ${timeFmt}.`,
        };
      }

      // ----------------------------------------------------
      // 3. LEMBRETES (WHATSAPP NOTIFICATIONS)
      // ----------------------------------------------------
      case 'create_reminder': {
        const scheduled = args.scheduled_at ? new Date(args.scheduled_at) : this.resolveTime(rawPrompt);
        const recurrence = (args.recurrence as RecurrenceRule) || 'none';

        // 1. Create corresponding Task in Google Tasks if connected
        let googleTaskId: string | undefined;
        if (hasGoogle && token) {
          try {
            const dueIso = scheduled.toISOString();
            const gTask = await googleTasksService.createTask(token, {
              title: args.title,
              notes: args.message || `Lembrete agendado para ${scheduled.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
              due: dueIso,
            });
            googleTaskId = gTask.id;
          } catch (gErr) {
            console.error('[AssessorAgent] Error creating Google Task for reminder:', gErr);
          }
        }

        // 2. Create the internal Task record linked to Google Task
        const task = db.createTask({
          user_id: userId,
          title: args.title,
          description: args.message || 'Criado a partir de solicitação de lembrete',
          status: 'pending',
          priority: 'normal',
          due_at: scheduled.toISOString(),
          google_task_id: googleTaskId || null,
          synced_at: googleTaskId ? new Date().toISOString() : null,
          completed_at: null,
        });

        // 3. Create the internal Reminder linked to the Task
        const rem = db.createReminder({
          user_id: userId,
          title: args.title,
          message: args.message || args.title,
          scheduled_at: scheduled.toISOString(),
          recurrence_rule: recurrence,
          status: 'pending',
          delivery_status: 'pending',
          sent_at: null,
          task_id: task.id,
          google_task_id: googleTaskId || null,
        });

        // 4. Update the Task with reminder_id
        db.updateTask(task.id, { reminder_id: rem.id });

        context.lastReminderId = rem.id;
        context.lastReminderTitle = rem.title;
        context.lastReminderTime = rem.scheduled_at;
        context.lastTaskId = task.id;
        context.lastTaskTitle = task.title;
        context.lastActionType = 'create_reminder';

        context.recentCreatedEntities = context.recentCreatedEntities || [];
        context.recentCreatedEntities.unshift({
          id: rem.id,
          type: 'reminder',
          title: rem.title,
          details: rem.message,
          timeOrDue: rem.scheduled_at,
          createdAt: Date.now(),
        });
        if (context.recentCreatedEntities.length > 10) {
          context.recentCreatedEntities = context.recentCreatedEntities.slice(0, 10);
        }

        const dateFmt = scheduled.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'short',
        });

        return {
          result: { reminder: rem, task },
          naturalResponse: `⏰ Lembrete e tarefa agendados com sucesso!\n\n• *${rem.title}*\n• Horário: ${dateFmt}\n• Google Tasks: ${googleTaskId ? 'Vinculado ✓' : 'Salvo localmente'}\n\nVou te avisar pelo WhatsApp pontualmente às ${scheduled.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}.`,
        };
      }

      case 'list_reminders': {
        const reminders = db.getReminders(userId).filter((r) => r.status === 'pending');
        if (reminders.length === 0) {
          return {
            result: [],
            naturalResponse: `Não há lembretes pendentes agendados para os próximos dias.`,
          };
        }
        const lines = reminders.map((r, i) => {
          const dt = new Date(r.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
          return `${i + 1}. ⏰ *${r.title}* — ${dt}`;
        }).join('\n');

        return {
          result: reminders,
          naturalResponse: `⏰ *Lembretes Ativos (${reminders.length}):*\n\n${lines}`,
        };
      }

      case 'delete_reminder': {
        const rawReminderQuery = (args.reminder_title_or_id || '').trim();
        const reminderQueryLower = rawReminderQuery.toLowerCase();
        const allReminders = db.getReminders(userId);

        let targetReminder: Reminder | undefined;

        // Contextual cues (e.g. "esse", "último", "o que você cadastrou", empty query)
        const isContextual =
          !reminderQueryLower ||
          reminderQueryLower === 'last' ||
          reminderQueryLower === 'latest' ||
          reminderQueryLower === 'esse' ||
          reminderQueryLower === 'este' ||
          reminderQueryLower === 'último' ||
          reminderQueryLower === 'ultimo' ||
          reminderQueryLower.includes('cadastrou') ||
          reminderQueryLower.includes('agendou') ||
          reminderQueryLower.includes('criou');

        if (isContextual) {
          if (context.lastReminderId) {
            targetReminder = allReminders.find((r) => r.id === context.lastReminderId);
          }
          if (!targetReminder && context.recentCreatedEntities) {
            const recentRem = context.recentCreatedEntities.find((e) => e.type === 'reminder');
            if (recentRem) {
              targetReminder = allReminders.find((r) => r.id === recentRem.id);
            }
          }
          // If still not found, check conversation history for the last dispatched reminder
          const userPhone = db.getProfile(userId)?.phone;
          if (!targetReminder && userPhone) {
            try {
              const conv = db.getOrCreateConversation(userId, userPhone);
              const msgs = db.getMessages(conv.id);
              for (let i = msgs.length - 1; i >= 0; i--) {
                const m = msgs[i];
                if (m.direction === 'outbound' && (m.tool_called === 'reminder_dispatch' || m.text.includes('LEMBRETE AGENDADO'))) {
                  for (const r of allReminders) {
                    if (m.text.includes(r.title)) {
                      targetReminder = r;
                      break;
                    }
                  }
                  if (targetReminder) break;
                }
              }
            } catch (_) {}
          }
          if (!targetReminder && allReminders.length > 0) {
            // Sort by updated_at or created_at descending
            targetReminder = [...allReminders].sort(
              (a, b) =>
                new Date(b.updated_at || b.created_at).getTime() -
                new Date(a.updated_at || a.created_at).getTime()
            )[0];
          }
        } else {
          // Search by ID or exact/partial title match
          targetReminder = allReminders.find(
            (r) =>
              r.id === rawReminderQuery ||
              r.title.toLowerCase().includes(reminderQueryLower) ||
              (r.message && r.message.toLowerCase().includes(reminderQueryLower))
          );
          if (!targetReminder) {
            const words = reminderQueryLower.split(/\s+/).filter((w: string) => w.length > 3);
            targetReminder = allReminders.find((r) =>
              words.some(
                (w: string) =>
                  r.title.toLowerCase().includes(w) ||
                  (r.message && r.message.toLowerCase().includes(w))
              )
            );
          }
          if (!targetReminder && context.lastReminderId) {
            targetReminder = allReminders.find((r) => r.id === context.lastReminderId);
          }
          if (!targetReminder && allReminders.length > 0) {
            targetReminder = allReminders[0];
          }
        }

        if (!targetReminder) {
          return {
            result: { found: false },
            naturalResponse: `Não localizei nenhum lembrete ativo para cancelar.`,
          };
        }

        // Delete from internal DB
        db.deleteReminder(targetReminder.id);

        // Also delete linked Google Task if exists
        if (targetReminder.task_id) {
          const linkedTask = db.getTask(targetReminder.task_id);
          if (linkedTask) {
            if (hasGoogle && token && linkedTask.google_task_id) {
              try {
                await googleTasksService.deleteTask(token, linkedTask.google_task_id);
              } catch (gErr) {
                console.warn('[AssessorAgent] Error deleting Google Task for deleted reminder:', gErr);
              }
            }
            db.deleteTask(linkedTask.id);
          }
        } else if (hasGoogle && token && targetReminder.google_task_id) {
          try {
            await googleTasksService.deleteTask(token, targetReminder.google_task_id);
          } catch (gErr) {
            console.warn('[AssessorAgent] Error deleting Google Task for deleted reminder:', gErr);
          }
        }

        // Clean up user context
        if (context.lastReminderId === targetReminder.id) {
          context.lastReminderId = undefined;
          context.lastReminderTitle = undefined;
          context.lastReminderTime = undefined;
        }
        if (context.recentCreatedEntities) {
          context.recentCreatedEntities = context.recentCreatedEntities.filter(
            (e) => e.id !== targetReminder.id
          );
        }
        context.lastActionType = 'delete_reminder';

        return {
          result: { deletedReminderId: targetReminder.id, title: targetReminder.title },
          naturalResponse: `🗑️ O lembrete *"${targetReminder.title}"* foi cancelado e removido com sucesso.`,
        };
      }

      // ----------------------------------------------------
      // 4. ANOTAÇÕES, CONTATOS & MEMÓRIA
      // ----------------------------------------------------
      case 'create_note': {
        const note = db.createNote({
          user_id: userId,
          title: args.title,
          content: args.content,
          tags: args.tags || ['geral'],
          is_favorite: false,
          is_memory: false,
        });
        return {
          result: note,
          naturalResponse: `📝 Anotação salva no seu bloco de notas:\n\n*${note.title}*\n"${note.content}"`,
        };
      }

      case 'search_notes': {
        const q = (args.query || '').toLowerCase();
        const notes = db.getNotes(userId).filter(
          (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
        );
        if (notes.length === 0) {
          return {
            result: [],
            naturalResponse: `Não encontrei nenhuma nota com o termo "${args.query}".`,
          };
        }
        const text = notes.map((n) => `📌 *${n.title}*:\n${n.content}`).join('\n\n');
        return {
          result: notes,
          naturalResponse: `🔍 *Anotações encontradas:*\n\n${text}`,
        };
      }

      case 'find_contact': {
        const q = (args.name || '').toLowerCase();
        const contacts = db.getContacts(userId).filter(
          (c) => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q))
        );
        if (contacts.length === 0) {
          return {
            result: [],
            naturalResponse: `Não localizei o contato "${args.name}". Deseja que eu salve o número dele?`,
          };
        }
        const c = contacts[0];
        return {
          result: c,
          naturalResponse: `👤 *Contato encontrado:*\n• *${c.name}*\n• Tel: ${c.phone}${c.company ? `\n• Empresa: ${c.company}` : ''}${c.role ? `\n• Cargo: ${c.role}` : ''}${c.notes ? `\n• Obs: ${c.notes}` : ''}`,
        };
      }

      case 'create_contact': {
        const contact = db.createContact({
          user_id: userId,
          name: args.name,
          phone: args.phone,
          company: args.company,
          role: args.role,
          notes: args.notes,
        });
        return {
          result: contact,
          naturalResponse: `👤 Contato salvo com sucesso: *${contact.name}* (${contact.phone}).`,
        };
      }

      case 'save_memory': {
        const mem = db.saveMemory(userId, args.key, args.value, args.category || 'fact');
        return {
          result: mem,
          naturalResponse: `🧠 Memória registrada com sucesso! Guardei que: "${mem.value}".`,
        };
      }

      case 'get_daily_summary':
      default: {
        // Sync with Google first if available
        if (hasGoogle && token) {
          try {
            await Promise.allSettled([
              googleCalendarService.syncEvents(token, db.data, 2),
              googleTasksService.syncTasks(token, db.data),
            ]);
          } catch (_) {}
        }

        const dashboard = db.getDashboardData(userId);
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Sao_Paulo',
        });

        let summary = `☀️ *Bom dia! Aqui está seu resumo executivo (${dateStr}):*\n\n`;

        if (dashboard.todayEvents.length > 0) {
          summary += `📅 *Compromissos na Agenda Google:*\n`;
          dashboard.todayEvents.forEach((e) => {
            const time = new Date(e.start_time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            summary += `• ${time} — ${e.title} (${e.location || 'Sem local'})\n`;
          });
          summary += `\n`;
        } else {
          summary += `📅 Agenda livre hoje (nenhum compromisso agendado).\n\n`;
        }

        if (dashboard.upcomingTasks.length > 0) {
          summary += `📋 *Tarefas no Google Tasks:*\n`;
          dashboard.upcomingTasks.slice(0, 5).forEach((t) => {
            summary += `• [${t.priority.toUpperCase()}] ${t.title}\n`;
          });
          summary += `\n`;
        }

        if (dashboard.upcomingReminders.length > 0) {
          summary += `⏰ *Lembretes Programados no WhatsApp:*\n`;
          dashboard.upcomingReminders.forEach((r) => {
            const time = new Date(r.scheduled_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            summary += `• ${time} — ${r.title}\n`;
          });
          summary += `\n`;
        }

        summary += `Como posso te ajudar agora?`;
        return {
          result: dashboard,
          naturalResponse: summary,
        };
      }

      // ----------------------------------------------------
      // 6. FINANÇAS & COMPRAS (EXPENSES)
      // ----------------------------------------------------
      case 'create_expense': {
        const amount = Number(args.amount) || 0;
        const desc = args.description || 'Despesa';
        const category = args.category || 'outros';
        const dateIso = args.date ? new Date(args.date).toISOString() : new Date().toISOString();

        const expense = db.createExpense({
          user_id: userId,
          description: desc,
          amount,
          category,
          date: dateIso,
        });

        context.lastExpenseId = expense.id;
        context.lastExpenseDesc = expense.description;
        context.lastExpenseAmount = expense.amount;
        context.lastActionType = 'create_expense';
        context.recentCreatedEntities = context.recentCreatedEntities || [];
        context.recentCreatedEntities.unshift({
          id: expense.id,
          type: 'expense',
          title: expense.description,
          amount: expense.amount,
          createdAt: Date.now(),
        });
        if (context.recentCreatedEntities.length > 10) {
          context.recentCreatedEntities = context.recentCreatedEntities.slice(0, 10);
        }

        const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return {
          result: expense,
          naturalResponse: `💸 *Lançamento financeiro registrado:*\n• Item: *${desc}*\n• Valor: *${amountFormatted}*${category !== 'outros' ? `\n• Categoria: ${category}` : ''}`,
        };
      }

      case 'update_expense': {
        const expenses = db.getExpenses(userId);
        const query = (args.expense_id_or_description || context.lastExpenseDesc || '').toLowerCase().trim();
        const target = expenses.find((e) => e.id === query || e.description.toLowerCase().includes(query)) ||
          (context.lastExpenseId ? expenses.find((e) => e.id === context.lastExpenseId) : expenses[0]);

        if (!target) {
          return {
            result: { found: false },
            naturalResponse: `Não localizei o lançamento financeiro para alterar. Qual compra você gostaria de consertar?`,
          };
        }

        const newAmount = args.new_amount !== undefined ? Number(args.new_amount) : target.amount;
        const newDesc = args.new_description || target.description;

        const updated = db.updateExpense(target.id, {
          amount: newAmount,
          description: newDesc,
        });

        context.lastExpenseId = target.id;
        context.lastExpenseDesc = newDesc;
        context.lastExpenseAmount = newAmount;
        context.lastActionType = 'update_expense';

        const amountFormatted = newAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return {
          result: updated,
          naturalResponse: `🔄 *Lançamento financeiro corrigido!*\n• Item: *${newDesc}*\n• Novo valor: *${amountFormatted}*`,
        };
      }

      case 'list_expenses': {
        const expenses = db.getExpenses(userId);
        if (expenses.length === 0) {
          return {
            result: [],
            naturalResponse: `Nenhum lançamento financeiro registrado até o momento.`,
          };
        }

        const period = args.period || 'all';
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        let filtered = expenses;
        let label = 'recente';
        if (period === 'today') {
          filtered = expenses.filter((e) => e.date.startsWith(todayStr));
          label = 'de hoje';
        }

        const total = filtered.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalFmt = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const items = filtered.slice(0, 8).map((e) => {
          const val = (e.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          return `• ${e.description} — *${val}*`;
        }).join('\n');

        return {
          result: { count: filtered.length, total, items: filtered },
          naturalResponse: `💰 *Lançamentos financeiros (${label}):*\n\n${items}\n\n*Total:* ${totalFmt}`,
        };
      }

      // ----------------------------------------------------
      // 7. CORREÇÃO, SPLIT & DESFAZER (CORRECT LAST ACTION)
      // ----------------------------------------------------
      case 'correct_last_action': {
        const actionType = args.action || 'replace';
        context.recentCreatedEntities = context.recentCreatedEntities || [];
        const lastEntity = context.recentCreatedEntities[0];

        // 1. Operation: SPLIT into multiple items
        if (actionType === 'split' || (args.split_items && args.split_items.length > 0)) {
          const splitItems = args.split_items || [];
          if (splitItems.length === 0) {
            return {
              result: { error: 'no_split_items' },
              naturalResponse: `Como você deseja dividir as tarefas? Pode me passar os títulos de cada uma.`,
            };
          }

          // Delete the previous bundled task if exists
          if (lastEntity && lastEntity.type === 'task') {
            const allTasks = db.getTasks(userId);
            const foundTask = allTasks.find((t) => t.id === lastEntity.id || t.title === lastEntity.title);
            if (foundTask) {
              if (hasGoogle && token && foundTask.google_task_id) {
                googleTasksService.deleteTask(token, foundTask.google_task_id).catch(() => {});
              }
              db.deleteTask(foundTask.id);
            }
          }

          // Create each new item
          const createdResponses: string[] = [];
          for (let i = 0; i < splitItems.length; i++) {
            const item = splitItems[i];
            const title = item.title || `Tarefa ${i + 1}`;
            let itemDue = item.time_or_due ? this.resolveTime(item.time_or_due).toISOString() : undefined;

            if (item.is_event) {
              const start = itemDue ? new Date(itemDue) : new Date();
              const evt = db.createEvent({
                user_id: userId,
                title,
                start_time: start.toISOString(),
                end_time: new Date(start.getTime() + 60 * 60000).toISOString(),
                status: 'confirmed',
              });
              context.recentCreatedEntities.unshift({
                id: evt.id,
                type: 'event',
                title: evt.title,
                timeOrDue: evt.start_time,
                createdAt: Date.now(),
              });
              const timeFmt = start.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
              createdResponses.push(`${i + 1}. 📅 *${title}* — às ${timeFmt}`);
            } else {
              let gId: string | undefined;
              if (hasGoogle && token) {
                try {
                  const gTask = await googleTasksService.createTask(token, { title, due: itemDue });
                  gId = gTask.id;
                } catch (_) {}
              }
              const newTask = db.createTask({
                user_id: userId,
                title,
                priority: 'normal',
                status: 'pending',
                due_at: itemDue || null,
                google_task_id: gId || null,
              });
              context.recentCreatedEntities.unshift({
                id: newTask.id,
                type: 'task',
                title: newTask.title,
                timeOrDue: itemDue,
                createdAt: Date.now(),
              });
              const timeStr = itemDue ? ` (às ${new Date(itemDue).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })})` : '';
              createdResponses.push(`${i + 1}. ✅ *${title}*${timeStr}`);
            }
          }

          return {
            result: { splitCount: splitItems.length },
            naturalResponse: `🔄 *Corrigido com sucesso!*\nA tarefa anterior agrupada foi cancelada e dividida em:\n\n${createdResponses.join('\n')}`,
          };
        }

        // 2. Operation: UPDATE VALUE / TIME / AMOUNT
        if (actionType === 'update_value' || actionType === 'replace') {
          // If updating expense amount
          if (args.new_amount !== undefined && (lastEntity?.type === 'expense' || context.lastExpenseId)) {
            const exp = db.getExpense(lastEntity?.id || context.lastExpenseId!);
            if (exp) {
              const updated = db.updateExpense(exp.id, { amount: Number(args.new_amount), description: args.new_title || exp.description });
              const fmt = Number(args.new_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              return {
                result: updated,
                naturalResponse: `🔄 *Lançamento corrigido!* Valor de *"${exp.description}"* alterado para *${fmt}*.`,
              };
            }
          }

          // If updating event time
          if (args.new_time_or_due && (lastEntity?.type === 'event' || context.lastEventId)) {
            const evtId = lastEntity?.id || context.lastEventId!;
            const newStart = this.resolveTime(args.new_time_or_due);
            return await this.executeTool(userId, 'update_event', {
              event_title_or_id: evtId,
              new_start_time: newStart.toISOString(),
              new_title: args.new_title,
            }, rawPrompt);
          }

          // If updating task
          if (lastEntity?.type === 'task' || context.lastTaskId) {
            const taskId = lastEntity?.id || context.lastTaskId!;
            const newDue = args.new_time_or_due ? this.resolveTime(args.new_time_or_due).toISOString() : undefined;
            return await this.executeTool(userId, 'update_task', {
              task_title_or_id: taskId,
              due_at: newDue,
              new_title: args.new_title,
            }, rawPrompt);
          }
        }

        // 3. Operation: DELETE / CANCEL
        if (actionType === 'delete' || actionType === 'cancel') {
          if (lastEntity?.type === 'reminder' || context.lastReminderId) {
            return await this.executeTool(userId, 'delete_reminder', { reminder_title_or_id: lastEntity?.id || context.lastReminderId }, rawPrompt);
          }
          if (lastEntity?.type === 'task') {
            return await this.executeTool(userId, 'delete_task', { task_title_or_id: lastEntity.id }, rawPrompt);
          }
          if (lastEntity?.type === 'event') {
            return await this.executeTool(userId, 'delete_event', { event_title_or_id: lastEntity.id }, rawPrompt);
          }
          if (lastEntity?.type === 'expense') {
            db.deleteExpense(lastEntity.id);
            return {
              result: { deleted: true },
              naturalResponse: `🗑️ O lançamento de *"${lastEntity.title}"* foi cancelado e removido.`,
            };
          }
        }

        return {
          result: { handled: false },
          naturalResponse: `Entendido. Como você gostaria de ajustar o último pedido?`,
        };
      }
    }
  }

  /**
   * Deterministic NLP engine when GEMINI_API_KEY is not configured or on rate limit fallback
   */
  private async fallbackEngine(userId: string, text: string, messageId?: string): Promise<AgentResult> {
    const lower = text.toLowerCase().trim();
    const context = getUserContext(userId);

    // -1. Highest Priority: Complaint / Meta-feedback regarding unwanted task creation or execution failure
    const isTaskCreationComplaint =
      (lower.includes('criando tarefa') ||
        lower.includes('criando tarefas') ||
        lower.includes('cria tarefa') ||
        lower.includes('cria tarefas') ||
        lower.includes('criar tarefas') ||
        lower.includes('criar tarefa')) &&
      (lower.includes('sem eu falar') ||
        lower.includes('sem eu mandar') ||
        lower.includes('sem eu pedir') ||
        lower.includes('sem permissão') ||
        lower.includes('sem permissao') ||
        lower.includes('sozinho') ||
        lower.includes('sozinha') ||
        lower.includes('não mandei') ||
        lower.includes('nao mandei') ||
        lower.includes('não pedi') ||
        lower.includes('nao pedi') ||
        lower.includes('para de') ||
        lower.includes('pare de') ||
        lower.includes('não crie') ||
        lower.includes('nao crie'));

    const isExecutionComplaint =
      (lower.includes('nao esta executando') ||
        lower.includes('não está executando') ||
        lower.includes('não executa') ||
        lower.includes('nao executa') ||
        lower.includes('não tá executando') ||
        lower.includes('nao ta executando') ||
        lower.includes('não está fazendo') ||
        lower.includes('nao esta fazendo')) &&
      (lower.includes('função') ||
        lower.includes('funções') ||
        lower.includes('funcao') ||
        lower.includes('funcoes') ||
        lower.includes('que eu mando') ||
        lower.includes('o que eu peço') ||
        lower.includes('o que eu mando'));

    if (isTaskCreationComplaint || isExecutionComplaint) {
      const response =
        `Peço sinceras desculpas pela inconveniência! 🐻⚠️ Já ajustei o sistema para **só criar tarefas ou compromissos quando você solicitar explicitamente** (ex: *"Criar tarefa: [título]"* ou *"Marca reunião amanhã às 14h"*).\n\n` +
        `• Para limpar tarefas criadas por engano, você pode dizer:\n` +
        `  - *"Cancelar todas as tarefas de hoje"* (ou *"de amanhã"*)\n` +
        `  - *"Listar tarefas"* (para ver as pendências e escolher o que apagar)\n\n` +
        `Qual função você gostaria de executar agora? Estou pronto para:\n` +
        `📅 **Agenda:** *"Compromissos de hoje"* ou *"Marca reunião amanhã às 15h"*\n` +
        `⏰ **Lembrete:** *"Me lembra amanhã às 9h de ligar para o fornecedor"*\n` +
        `📋 **Tarefas:** *"Listar tarefas"* ou *"Criar tarefa: [nome]"*\n` +
        `💸 **Finanças:** *"Gastei 50 no almoço"* ou *"Quanto gastei hoje?"*`;

      return {
        response,
        model: 'fallback-feedback-handler',
        success: true,
      };
    }

    // -0.5 High Priority: Reminder Cancellation
    // e.g. "apagar esse lembrete que você cadastrou aí", "cancela o lembrete", "excluir esse lembrete", "desfaz o lembrete"
    const isReminderCancellation =
      (lower.includes('lembrete') || lower.includes('lembretes')) &&
      (lower.includes('apagar') ||
        lower.includes('apaga') ||
        lower.includes('apague') ||
        lower.includes('cancelar') ||
        lower.includes('cancela') ||
        lower.includes('cancele') ||
        lower.includes('excluir') ||
        lower.includes('exclui') ||
        lower.includes('exclua') ||
        lower.includes('remover') ||
        lower.includes('remove') ||
        lower.includes('tira') ||
        lower.includes('tirar') ||
        lower.includes('desfazer') ||
        lower.includes('desfaz') ||
        lower.includes('deleta') ||
        lower.includes('deletar'));

    if (isReminderCancellation) {
      let query = lower
        .replace(/^(?:favor\s+|por favor\s+)?(?:apagar|apaga|apague|cancelar|cancela|cancele|excluir|exclui|exclua|remover|remove|tira|tirar|desfazer|desfaz|deleta|deletar)\s+/i, '')
        .replace(/(?:esse|este|o|a)\s+lembrete\s*/i, '')
        .replace(/que\s+voc[eê]\s+(?:acabou\s+de\s+)?(?:cadastrou|agendou|criou)\s*(?:a[ií])?/i, '')
        .replace(/\b(?:a[ií]|por favor|pra mim)\b/gi, '')
        .replace(/^(?:de|do|da)\s+/i, '')
        .trim();

      const execution = await this.executeTool(
        userId,
        'delete_reminder',
        { reminder_title_or_id: query || 'last' },
        text
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_reminder',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // -0.4 Reminder Listing ("quais lembretes", "listar lembretes", "meus lembretes")
    const isReminderQuery =
      lower.startsWith('quais lembretes') ||
      lower.startsWith('quais os lembretes') ||
      lower.startsWith('listar lembretes') ||
      lower.startsWith('meus lembretes') ||
      lower.startsWith('ver lembretes') ||
      lower.includes('lembretes agendados') ||
      lower.includes('lembretes programados');

    if (isReminderQuery) {
      const execution = await this.executeTool(userId, 'list_reminders', {}, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'list_reminders',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 0. Super High Priority: Separation / Split of tasks ("separar em duas tarefas e coloca isso carro 7 horas da manhã e passar na Marcela 8 horas da manhã")
    if (
      lower.includes('separar em duas tarefas') ||
      lower.includes('separa em duas tarefas') ||
      lower.includes('dividir em duas tarefas') ||
      lower.includes('divide em duas tarefas') ||
      lower.includes('separar em 2 tarefas') ||
      lower.includes('dividir em 2 tarefas')
    ) {
      let content = text
        .replace(/^(?:favor\s+|por favor\s+)?(?:separar|separa|dividir|divide)\s+(?:em\s+)?(?:duas|2)\s+tarefas\s*(?:e\s+coloca\s+isso\s*|\s*e\s+coloca\s*|\s*:\s*)?/i, '')
        .trim();

      let parts: string[] = [];
      if (content.includes(' e passar ')) {
        const idx = content.indexOf(' e passar ');
        parts = [content.substring(0, idx).trim(), content.substring(idx + 3).trim()];
      } else if (content.includes(' e levar ')) {
        const idx = content.indexOf(' e levar ');
        parts = [content.substring(0, idx).trim(), content.substring(idx + 3).trim()];
      } else if (content.includes(' e ')) {
        const p = content.split(/\s+e\s+/i);
        if (p.length >= 2) {
          parts = [p[0].trim(), p.slice(1).join(' e ').trim()];
        }
      }

      if (parts.length < 2) {
        const matchTimes = [...content.matchAll(/(\d{1,2}\s*(?:horas|h|:\d{2}))/gi)];
        if (matchTimes.length >= 2 && matchTimes[0].index !== undefined && matchTimes[1].index !== undefined) {
          const cutPoint = matchTimes[1].index;
          const prevSlice = content.substring(0, cutPoint);
          const lastE = prevSlice.lastIndexOf(' e ');
          if (lastE !== -1) {
            parts = [content.substring(0, lastE).trim(), content.substring(lastE + 3).trim()];
          }
        }
      }

      if (parts.length >= 2) {
        const splitItems = parts.map((part) => {
          let title = part.replace(/(?:amanhã|hoje)\s*(?:às|as)?\s*\d{1,2}(?::\d{2})?\s*(?:horas?|h)?(?:\s*da\s*(?:manhã|tarde|noite))?/gi, '').trim();
          title = title.replace(/\s*\d{1,2}\s*(?:horas?|h)\s*(?:da\s*(?:manhã|tarde|noite))?/gi, '').trim();
          title = title.replace(/^(?:levar\s+o\s+|passar\s+na\s+|ir\s+ao\s+|fazer\s+)/i, (m) => m.charAt(0).toUpperCase() + m.slice(1));
          if (!title) title = part;
          const resolved = this.resolveTime(part);
          return {
            title: title.charAt(0).toUpperCase() + title.slice(1),
            time_or_due: resolved.toISOString(),
            is_event: false,
          };
        });

        const exec = await this.executeTool(userId, 'correct_last_action', {
          action: 'split',
          split_items: splitItems,
        }, text);

        return {
          response: exec.naturalResponse,
          toolCalled: 'correct_last_action',
          model: 'fallback-nlp',
          success: true,
        };
      }
    }

    // 0.1 High Priority: General corrections on the last action ("conserta o último pedido", "errei o valor", "não era 16h era 17h")
    if (
      lower.startsWith('conserta') ||
      lower.startsWith('conserte') ||
      lower.startsWith('corrige') ||
      lower.startsWith('corrija') ||
      lower.startsWith('errei') ||
      lower.includes('não era') ||
      lower.includes('nao era') ||
      lower.startsWith('muda o último') ||
      lower.startsWith('muda a última') ||
      lower.startsWith('altera o último') ||
      lower.startsWith('altera a última')
    ) {
      // Check if user is correcting monetary amount (e.g. "errei o valor, foi 50 reais" or "muda para 40")
      const moneyMatch = text.match(/(?:foi|era|para|valor\s*(?:de)?|r\$)\s*(\d+(?:[.,]\d{1,2})?)/i);
      if (moneyMatch && (context.lastActionType === 'create_expense' || context.lastExpenseId || lower.includes('compra') || lower.includes('valor') || lower.includes('reais'))) {
        const val = parseFloat(moneyMatch[1].replace(',', '.'));
        const exec = await this.executeTool(userId, 'update_expense', { new_amount: val }, text);
        return {
          response: exec.naturalResponse,
          toolCalled: 'update_expense',
          model: 'fallback-nlp',
          success: true,
        };
      }

      // Check if user is correcting time (e.g. "não era 16h era 17h", "muda para as 17h", "era quinta 17h")
      if (lower.includes('h') || lower.includes('hora') || lower.includes(':')) {
        const timeMatch = text.match(/(?:era|para|às|as)\s*(\d{1,2}(?::\d{2})?\s*(?:h|horas?)?)/i);
        const targetTimeStr = timeMatch ? timeMatch[1] : text;
        const newTime = this.resolveTime(targetTimeStr);

        if (context.lastActionType === 'create_event' || context.lastEventId) {
          const exec = await this.executeTool(userId, 'update_event', {
            new_start_time: newTime.toISOString(),
          }, text);
          return {
            response: exec.naturalResponse,
            toolCalled: 'update_event',
            model: 'fallback-nlp',
            success: true,
          };
        } else if (context.lastTaskId) {
          const exec = await this.executeTool(userId, 'update_task', {
            due_at: newTime.toISOString(),
          }, text);
          return {
            response: exec.naturalResponse,
            toolCalled: 'update_task',
            model: 'fallback-nlp',
            success: true,
          };
        }
      }

      // Generic undo / cancellation of last item
      if (lower.includes('cancela') || lower.includes('apaga') || lower.includes('exclui')) {
        const exec = await this.executeTool(userId, 'correct_last_action', { action: 'delete' }, text);
        return {
          response: exec.naturalResponse,
          toolCalled: 'correct_last_action',
          model: 'fallback-nlp',
          success: true,
        };
      }
    }

    // 0.2 Expense creation ("gastei 50 no almoço", "comprei 120 de remédio", "lançar 80 de mercado")
    const expenseMatch = text.match(/^(?:gastei|paguei|comprei|lançar|lanca|lança|adicionar gasto de)\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais)?\s*(?:em|no|na|de|com)?\s*(.*)/i);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1].replace(',', '.'));
      const desc = expenseMatch[2].trim() || 'Despesa';
      const exec = await this.executeTool(userId, 'create_expense', {
        amount,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
      }, text);
      return {
        response: exec.naturalResponse,
        toolCalled: 'create_expense',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 1. High Priority: Batch cancellation of tasks
    // Examples: "cancelar todas as tarefas de amanhã", "cancela todas as tarefas de amanhã", "cancele todas", "cancela todas", "apagar todas as tarefas"
    const isCancelTaskBatch =
      lower.includes('cancelar todas as tarefas') ||
      lower.includes('cancela todas as tarefas') ||
      lower.includes('cancele todas as tarefas') ||
      lower.includes('cancelar tarefas de amanhã') ||
      lower.includes('cancelar tarefas de amanha') ||
      lower.includes('cancela tarefas de amanhã') ||
      lower.includes('cancela tarefas de amanha') ||
      lower.includes('cancele tarefas de amanhã') ||
      lower.includes('cancele tarefas de amanha') ||
      lower.includes('cancela as tarefas de amanhã') ||
      lower.includes('cancela as tarefas de amanha') ||
      lower.includes('cancele as tarefas de amanhã') ||
      lower.includes('cancele as tarefas de amanha') ||
      lower.includes('apagar todas as tarefas') ||
      lower.includes('excluir todas as tarefas') ||
      lower.includes('apaga as tarefas') ||
      lower.includes('exclui as tarefas') ||
      lower === 'cancele todas' ||
      lower === 'cancela todas' ||
      lower === 'cancelar todas' ||
      lower === 'cancele todas elas' ||
      lower === 'cancela todas elas' ||
      lower === 'cancele tudo' ||
      lower === 'cancela tudo' ||
      lower === 'apaga todas' ||
      lower === 'apague todas' ||
      lower === 'exclui todas' ||
      lower === 'exclua todas';

    if (isCancelTaskBatch) {
      let filter = 'all';
      if (lower.includes('amanhã') || lower.includes('amanha')) {
        filter = 'tomorrow';
      } else if (lower.includes('hoje')) {
        filter = 'today';
      } else if (context.lastActionType === 'list_tasks' && context.lastQueriedDate) {
        filter = context.lastQueriedDate;
      }

      const execution = await this.executeTool(userId, 'delete_tasks', { filter }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_tasks',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 2. High Priority: Single task cancellation
    // Examples: "cancela a tarefa de comprar pão", "cancelar tarefa comprar ração", "excluir tarefa X"
    if (
      (lower.startsWith('cancela a tarefa') ||
        lower.startsWith('cancele a tarefa') ||
        lower.startsWith('cancelar a tarefa') ||
        lower.startsWith('cancela tarefa') ||
        lower.startsWith('cancele tarefa') ||
        lower.startsWith('cancelar tarefa') ||
        lower.startsWith('excluir tarefa') ||
        lower.startsWith('exclui a tarefa') ||
        lower.startsWith('apagar a tarefa') ||
        lower.startsWith('apaga a tarefa')) &&
      !lower.includes('todas')
    ) {
      const taskQuery = text
        .replace(/^(?:cancela|cancele|cancelar|excluir|exclui|apagar|apaga)\s+(?:a\s+|o\s+)?tarefa\s*(?:de\s+|do\s+|da\s+)?/i, '')
        .trim();

      const execution = await this.executeTool(
        userId,
        'delete_task',
        { task_title_or_id: taskQuery || context.lastTaskId || '' },
        text
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_task',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 3. High Priority: Task consultation/listing
    // Examples: "quais tarefas de amanhã", "listar quais tarefas de amanhã", "quais as tarefas", "listar tarefas", "ver tarefas"
    const isTaskQuery =
      lower.startsWith('quais tarefas') ||
      lower.startsWith('quais as tarefas') ||
      lower.startsWith('listar tarefas') ||
      lower.startsWith('listar quais tarefas') ||
      lower.startsWith('listar as tarefas') ||
      lower.startsWith('ver tarefas') ||
      lower.startsWith('minhas tarefas') ||
      lower.startsWith('tarefas de amanhã') ||
      lower.startsWith('tarefas de amanha') ||
      lower.startsWith('tarefas de hoje') ||
      lower.startsWith('o que tenho de tarefas') ||
      lower.startsWith('mostra as tarefas') ||
      lower.startsWith('mostrar as tarefas') ||
      lower.startsWith('consultar tarefas') ||
      lower === 'tarefas';

    if (isTaskQuery) {
      let dateFilter = 'all';
      if (lower.includes('amanhã') || lower.includes('amanha')) {
        dateFilter = 'tomorrow';
      } else if (lower.includes('hoje')) {
        dateFilter = 'today';
      }

      const execution = await this.executeTool(userId, 'list_tasks', { date_filter: dateFilter }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'list_tasks',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 4. Availability check: "Tem algum horário livre amanhã à tarde?"
    if (lower.includes('horário livre') || lower.includes('horario livre') || lower.includes('espaço livre') || lower.includes('disponibilidade')) {
      const period = lower.includes('tarde') ? 'afternoon' : lower.includes('manhã') || lower.includes('manha') ? 'morning' : 'afternoon';
      const execution = await this.executeTool(userId, 'check_availability', {
        date: text,
        period,
      }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'check_availability',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 5. Agenda query: "Tenho algo amanhã?", "O que tenho hoje?", "Como está minha semana?", "O que tenho sexta?"
    if (
      lower.includes('tenho algo') ||
      lower.includes('o que tenho') ||
      lower.includes('minha agenda') ||
      lower.includes('como está minha semana') ||
      lower.includes('próximo compromisso') ||
      lower.includes('meus compromissos') ||
      lower.includes('agenda de amanhã') ||
      lower.includes('agenda de amanha')
    ) {
      let filter = 'today';
      if (lower.includes('amanhã') || lower.includes('amanha')) filter = 'tomorrow';
      else if (lower.includes('semana')) filter = 'week';
      else if (lower.includes('sexta')) filter = 'sexta';
      else if (lower.includes('segunda')) filter = 'segunda';
      else if (lower.includes('terça') || lower.includes('terca')) filter = 'terca';
      else if (lower.includes('quarta')) filter = 'quarta';
      else if (lower.includes('quinta')) filter = 'quinta';

      const execution = await this.executeTool(userId, 'list_events', { date_filter: filter }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'list_events',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 6. Complete task: "Conclui a tarefa de comprar ração", "Marquei como feita"
    if (lower.includes('concluí') || lower.includes('conclui') || lower.includes('concluido') || lower.includes('já fiz') || lower.includes('marquei como feita')) {
      const matchText = text.replace(/^(?:concluí|conclui|concluído|já fiz|marquei como feita|concluir a tarefa de|conclui a tarefa de)\s*/i, '').trim();
      const execution = await this.executeTool(userId, 'complete_task', { task_title_or_id: matchText }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'complete_task',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 6.1 Update Task due date / title
    if (
      (lower.startsWith('muda a tarefa') ||
        lower.startsWith('altera a tarefa') ||
        lower.startsWith('joga a tarefa') ||
        lower.startsWith('adia a tarefa') ||
        lower.startsWith('muda o prazo da tarefa') ||
        lower.startsWith('altera o prazo da tarefa')) &&
      !lower.includes('reunião') &&
      !lower.includes('compromisso')
    ) {
      const taskQuery = text
        .replace(/^(?:muda|altera|joga|adia)\s+(?:a\s+|o\s+)?(?:prazo\s+da\s+)?tarefa\s*(?:de\s+|do\s+|da\s+)?/i, '')
        .replace(/\s+(?:para|p\/|pra)\s+.*$/i, '')
        .trim();
      const newDue = this.resolveTime(text).toISOString();
      const execution = await this.executeTool(
        userId,
        'update_task',
        { task_title_or_id: taskQuery || context.lastTaskId || '', due_at: newDue },
        text
      );
      return {
        response: execution.naturalResponse,
        toolCalled: 'update_task',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 7. Cancel / Delete Event: Only if it does NOT mention tasks!
    // Example: "Cancela a reunião com Carlos", "Desmarca dentista"
    if (
      !lower.includes('tarefa') &&
      !lower.includes('tarefas') &&
      (lower.startsWith('cancela ') ||
        lower.startsWith('cancele ') ||
        lower.startsWith('cancelar ') ||
        lower.startsWith('desmarca ') ||
        lower.startsWith('desmarcar '))
    ) {
      const eventTitle = text
        .replace(/^(?:cancela|cancele|cancelar|desmarca|desmarcar)\s*(?:a|o|as|os|meu|minha|o\s+compromisso|a\s+reunião|o\s+evento)?\s*/i, '')
        .trim();
      const execution = await this.executeTool(userId, 'delete_event', { event_title_or_id: eventTitle }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'delete_event',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 8. Daily summary: "resumo", "bom dia", "programação de hoje"
    if (
      lower === 'resumo' ||
      lower.startsWith('resumo ') ||
      lower.includes('meu resumo') ||
      lower.includes('resumo do dia') ||
      lower.includes('programação de hoje') ||
      lower.includes('programacao de hoje') ||
      lower === 'bom dia' ||
      lower.startsWith('bom dia,') ||
      lower.startsWith('bom dia!')
    ) {
      const execution = await this.executeTool(userId, 'get_daily_summary', {}, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'get_daily_summary',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 8.1 Notes: Create & Search
    if (
      lower.startsWith('anotar:') ||
      lower.startsWith('anotação:') ||
      lower.startsWith('anotacao:') ||
      lower.startsWith('salva no bloco de notas:') ||
      lower.startsWith('salva na nota:') ||
      lower.startsWith('bloco de notas:') ||
      lower.startsWith('guardar nota:')
    ) {
      const content = text.replace(/^(?:anotar|anotação|anotacao|salva no bloco de notas|salva na nota|bloco de notas|guardar nota)\s*:\s*/i, '').trim();
      const title = content.split('\n')[0].slice(0, 30);
      const execution = await this.executeTool(userId, 'create_note', { title: title || 'Anotação', content }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'create_note',
        model: 'fallback-nlp',
        success: true,
      };
    }

    if (
      lower.startsWith('buscar nota') ||
      lower.startsWith('pesquisar nota') ||
      lower.startsWith('procurar nota') ||
      lower.startsWith('minhas notas')
    ) {
      const q = text.replace(/^(?:buscar|pesquisar|procurar)\s+notas?\s*(?:de|sobre|com)?\s*/i, '').replace(/^minhas\s+notas\s*/i, '').trim();
      const execution = await this.executeTool(userId, 'search_notes', { query: q }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'search_notes',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 8.2 Contacts: Find & Create
    if (
      lower.startsWith('qual o telefone') ||
      lower.startsWith('qual telefone') ||
      lower.startsWith('buscar contato') ||
      lower.startsWith('contato de') ||
      lower.startsWith('contato do') ||
      lower.startsWith('contato da')
    ) {
      const name = text.replace(/^(?:qual\s+o\s+telefone|qual\s+telefone|buscar\s+contato|contato)\s*(?:de|do|da|de\s+)?/i, '').replace(/\?$/, '').trim();
      const execution = await this.executeTool(userId, 'find_contact', { name }, text);
      return {
        response: execution.naturalResponse,
        toolCalled: 'find_contact',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 9. Pure Greetings & Help
    const isPureGreeting =
      lower === 'oi' ||
      lower === 'ola' ||
      lower === 'olá' ||
      lower === 'opa' ||
      lower === 'e aí' ||
      lower === 'e ai' ||
      lower === 'boa tarde' ||
      lower === 'boa noite' ||
      lower === 'ajuda' ||
      lower === 'help' ||
      lower === 'menu' ||
      lower === 'comandos' ||
      lower === 'quem é você' ||
      lower === 'quem e voce' ||
      lower === 'o que você faz' ||
      lower === 'o que voce faz';

    if (isPureGreeting) {
      const profile = db.getProfile(userId);
      const greetingName = profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : '';
      const defaultResponse = `Olá${greetingName}! Sou o *URSO JR.*, seu estagiário com IA no WhatsApp. 🐻⚡\n\nEstou conectado ao seu **Google Calendar** e **Google Tasks**.\n\nExperimente enviar:\n• "Abastecer o carro amanhã às 7h urgente"\n• "Quais tarefas de amanhã?"\n• "Cancelar todas as tarefas de amanhã"\n• "Marca dentista amanhã às 14h"\n• "Comprar café solúvel amanhã"\n• "Cancela a reunião com Carlos"`;
      return {
        response: defaultResponse,
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 10. Calendar Appointment Event:
    // "Marca dentista amanhã às 14", "Agenda reunião com Carlos sexta às 10", "Consulta médica quinta 15h"
    const isCalendarEvent =
      lower.startsWith('marca ') ||
      lower.startsWith('marcar ') ||
      lower.startsWith('agenda ') ||
      lower.startsWith('agendar ') ||
      lower.includes('reunião') ||
      lower.includes('reuniao') ||
      lower.includes('dentista') ||
      lower.includes('consulta') ||
      lower.includes('médico') ||
      lower.includes('medico') ||
      lower.includes('almoço com') ||
      lower.includes('almoco com') ||
      lower.includes('jantar com') ||
      lower.includes('treino') ||
      lower.includes('academia') ||
      lower.includes('call com') ||
      lower.includes('meet com') ||
      lower.includes('audiência') ||
      lower.includes('audiencia') ||
      lower.includes('voo') ||
      lower.includes('viagem');

    if (
      isCalendarEvent &&
      (lower.includes('às ') ||
        lower.includes('as ') ||
        /\b\d{1,2}h/i.test(lower) ||
        lower.includes('amanhã') ||
        lower.includes('amanha') ||
        lower.includes('hoje') ||
        lower.includes('sexta') ||
        lower.includes('segunda') ||
        lower.includes('terça') ||
        lower.includes('terca') ||
        lower.includes('quarta') ||
        lower.includes('quinta') ||
        lower.includes('sábado') ||
        lower.includes('sabado') ||
        lower.includes('domingo'))
    ) {
      const cleanTitle = this.cleanEventTitle(text);
      const startTime = this.resolveTime(text);
      const execution = await this.executeTool(
        userId,
        'create_event',
        {
          title: cleanTitle,
          start_time: startTime.toISOString(),
        },
        text
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'create_event',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 11. Explicit Reminders:
    // e.g. "Me lembra de ligar para João às 15h", "Me lembra amanhã às 8h de tomar remédio", "Criar lembrete amanhã às 9h"
    const isExplicitReminder =
      lower.startsWith('me lembra ') ||
      lower.startsWith('me lembre ') ||
      lower.startsWith('lembrar-me ') ||
      lower.startsWith('lembrete para ') ||
      lower.startsWith('criar lembrete') ||
      lower.startsWith('cria lembrete') ||
      lower.startsWith('novo lembrete') ||
      lower.startsWith('me avisa ') ||
      lower.startsWith('me avise ') ||
      (lower.includes('lembrete') && (lower.includes('amanhã') || lower.includes('amanha') || lower.includes('hoje') || lower.includes('às') || lower.includes('as')));

    if (isExplicitReminder) {
      const scheduled = this.resolveTime(text);
      const cleanTitle = text
        .replace(/^(?:favor\s+|por favor\s+)?(?:me lembra|me lembre|lembrar-me|lembrete para|criar lembrete|cria lembrete|novo lembrete|me avisa|me avise)\s*(?:de\s+|do\s+|da\s+)?/i, '')
        .replace(/(?:amanhã|amanha|hoje|depois de amanhã)\s*(?:às|as)?\s*\d{1,2}(?::\d{2})?\s*(?:horas?|h)?/gi, '')
        .replace(/(?:às|as)\s*\d{1,2}(?::\d{2})?\s*(?:horas?|h)?/gi, '')
        .replace(/\b(?:de|do|da|que)\b/i, '')
        .trim();

      const finalTitle = cleanTitle.length >= 2 ? cleanTitle : text;
      const execution = await this.executeTool(
        userId,
        'create_reminder',
        {
          title: finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1),
          message: finalTitle,
          scheduled_at: scheduled.toISOString(),
        },
        text
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'create_reminder',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // 12. Task Creation (STRICT INTENT ONLY - NEVER CATCH-ALL):
    // e.g. "Abastecer 308 amanhã urgente", "Comprar café solúvel amanhã", "Pagar conta de luz sexta", "Criar tarefa: Revisar minuta"
    const hasExplicitTaskPrefix =
      lower.startsWith('criar tarefa') ||
      lower.startsWith('cria tarefa') ||
      lower.startsWith('cria uma tarefa') ||
      lower.startsWith('criar uma tarefa') ||
      lower.startsWith('nova tarefa') ||
      lower.startsWith('adicionar tarefa') ||
      lower.startsWith('adicione tarefa') ||
      lower.startsWith('anota aí:') ||
      lower.startsWith('anota ai:') ||
      lower.startsWith('anota aí que preciso') ||
      lower.startsWith('anota ai que preciso') ||
      lower.startsWith('anota aí que tenho') ||
      lower.startsWith('anota ai que tenho') ||
      lower.startsWith('não esquecer de') ||
      lower.startsWith('nao esquecer de') ||
      lower.startsWith('coloca na minha lista') ||
      lower.startsWith('coloca na lista') ||
      lower.startsWith('põe na lista') ||
      lower.startsWith('poe na lista') ||
      lower.startsWith('tenho que ') ||
      lower.startsWith('preciso ');

    const hasImperativeTaskVerb =
      /^(?:comprar|pagar|abastecer|levar|buscar|enviar|mandar|cobrar|revisar|consertar|passar\s+na|ir\s+ao|ir\s+à|ir\s+a|fazer|ligar\s+para|entregar|transferir|depositar|trocar|lavar|limpar|contratar|cotar|assinar|declarar|resolver)\b/i.test(
        lower
      );

    const isQuestionOrMeta =
      lower.includes('?') ||
      lower.startsWith('como ') ||
      lower.startsWith('o que ') ||
      lower.startsWith('qual ') ||
      lower.startsWith('quem ') ||
      lower.startsWith('onde ') ||
      lower.startsWith('quando ') ||
      lower.startsWith('por que ') ||
      lower.startsWith('pq ') ||
      lower.includes('obrigad') ||
      lower.includes('valeu') ||
      lower.includes('beleza') ||
      lower.includes('ok') ||
      lower.includes('tá bom') ||
      lower.includes('ta bom') ||
      lower.includes('entendi');

    const shouldCreateTask = (hasExplicitTaskPrefix || hasImperativeTaskVerb) && !isQuestionOrMeta;

    if (shouldCreateTask) {
      const cleanTitle = this.cleanTaskTitle(text);
      const isUrgent = lower.includes('urgente') || lower.includes('urgentíssimo');
      const isHigh =
        lower.includes('importante') ||
        lower.includes('prioridade alta') ||
        lower.includes('alta prioridade');
      const priority: TaskPriority = isUrgent ? 'urgent' : isHigh ? 'high' : 'normal';

      let dueAt: string | undefined;
      if (
        lower.includes('amanhã') ||
        lower.includes('amanha') ||
        lower.includes('hoje') ||
        lower.includes('depois de amanhã') ||
        lower.includes('segunda') ||
        lower.includes('terça') ||
        lower.includes('terca') ||
        lower.includes('quarta') ||
        lower.includes('quinta') ||
        lower.includes('sexta') ||
        lower.includes('sábado') ||
        lower.includes('sabado') ||
        lower.includes('domingo')
      ) {
        dueAt = this.resolveTime(text).toISOString();
      }

      // Detect compound phrases with multiple tasks (e.g. "levar o carro... passar na escola...")
      let splitParts: string[] = [];
      if (lower.includes(' passar na ') || lower.includes(' e passar ')) {
        const splitIdx = lower.indexOf(' passar na ');
        if (splitIdx > 5) {
          splitParts = [text.substring(0, splitIdx).trim(), text.substring(splitIdx).trim()];
        }
      } else if (lower.includes(' e depois ')) {
        splitParts = text.split(/\s+e\s+depois\s+/i);
      } else if (lower.includes(' e também ') || lower.includes(' e tambem ')) {
        splitParts = text.split(/\s+e\s+tamb[eé]m\s+/i);
      }

      if (splitParts.length >= 2) {
        const executions: any[] = [];
        for (const part of splitParts) {
          const cleanPartTitle = this.cleanTaskTitle(part);
          const partDue = (part.toLowerCase().includes('amanhã') || part.toLowerCase().includes('amanha') || part.toLowerCase().includes('hoje'))
            ? this.resolveTime(part).toISOString()
            : dueAt;
          const exec = await this.executeTool(userId, 'create_task', {
            title: cleanPartTitle,
            due_at: partDue,
            priority,
          }, part);
          executions.push(exec);
        }
        return {
          response: executions.map((e) => e.naturalResponse).join('\n\n'),
          toolCalled: 'create_task',
          model: 'fallback-nlp',
          success: true,
        };
      }

      const execution = await this.executeTool(
        userId,
        'create_task',
        {
          title: cleanTitle,
          due_at: dueAt,
          priority,
        },
        text
      );

      return {
        response: execution.naturalResponse,
        toolCalled: 'create_task',
        model: 'fallback-nlp',
        success: true,
      };
    }

    // Default polite response - NEVER CREATE UNWANTED TASKS
    const profile = db.getProfile(userId);
    const greetingName = profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : '';
    const defaultResponse = `Olá${greetingName}! Sou o *URSO JR.*, seu estagiário com IA no WhatsApp. 🐻⚡\n\nEstou conectado à sua agenda e tarefas.\n\nExperimente enviar:\n• "Abastecer o carro amanhã às 7h urgente"\n• "Quais tarefas de amanhã?"\n• "Cancelar todas as tarefas de amanhã"\n• "Marca reunião amanhã às 14h"\n• "Comprar café solúvel amanhã"\n• "Me lembra amanhã às 8h de ligar para o fornecedor"\n• "Gastei 50 no almoço"`;
    return {
      response: defaultResponse,
      model: 'fallback-nlp',
      success: true,
    };
  }

  public registerDispatchedReminder(
    userId: string,
    rem: { id: string; title: string; message?: string; scheduled_at?: string }
  ) {
    const context = getUserContext(userId);
    context.lastReminderId = rem.id;
    context.lastReminderTitle = rem.title;
    context.lastReminderTime = rem.scheduled_at;
    context.lastActionType = 'create_reminder';
    context.recentCreatedEntities = context.recentCreatedEntities || [];
    context.recentCreatedEntities.unshift({
      id: rem.id,
      type: 'reminder',
      title: rem.title,
      details: rem.message,
      timeOrDue: rem.scheduled_at,
      createdAt: Date.now(),
    });
    if (context.recentCreatedEntities.length > 10) {
      context.recentCreatedEntities = context.recentCreatedEntities.slice(0, 10);
    }
    console.log(`[AssessorAgent] Registered dispatched reminder for user ${userId}: "${rem.title}" (ID: ${rem.id})`);
  }
}

export const assessorAgent = new AssessorAgent();
