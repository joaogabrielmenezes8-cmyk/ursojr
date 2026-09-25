/**
 * Serviço de Integração Canônica com o Google Tasks v1 REST API
 */

import { db } from '../db.js';

export interface GoogleTaskItem {
  id?: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp (e.g. 2026-09-22T00:00:00.000Z)
  status?: 'needsAction' | 'completed';
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
}

export class GoogleTasksService {
  private baseUrl = 'https://tasks.googleapis.com/tasks/v1';

  private async request(accessToken: string, endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsedErr: any;
      try {
        parsedErr = JSON.parse(errBody);
      } catch {
        parsedErr = { error: { message: errBody } };
      }
      const message = parsedErr?.error?.message || `Google Tasks API error ${res.status}`;
      if (res.status === 401 || message.toLowerCase().includes('authentication') || message.toLowerCase().includes('credential')) {
        try {
          db.markGoogleTokenExpired('Token Google Tasks expirado (401)');
        } catch (_) {}
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  /**
   * Lista as listas de tarefas do usuário
   */
  async listTaskLists(accessToken: string) {
    const data = await this.request(accessToken, '/users/@me/lists');
    return data.items || [];
  }

  /**
   * Cria uma nova lista de tarefas
   */
  async createTaskList(accessToken: string, title: string) {
    return await this.request(accessToken, '/users/@me/lists', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Obtém o ID da lista padrão (@default) ou primeira disponível
   */
  async getDefaultTaskListId(accessToken: string): Promise<string> {
    const lists = await this.listTaskLists(accessToken);
    if (lists.length > 0) {
      return lists[0].id;
    }
    const created = await this.createTaskList(accessToken, 'Minhas Tarefas');
    return created.id;
  }

  /**
   * Lista tarefas de uma lista específica com filtros
   */
  async listTasks(
    accessToken: string,
    params: {
      tasklistId?: string;
      showCompleted?: boolean;
      showHidden?: boolean;
      dueMin?: string;
      dueMax?: string;
      maxResults?: number;
    } = {}
  ) {
    const tasklistId = params.tasklistId || '@default';
    const query = new URLSearchParams();

    query.set('showCompleted', (params.showCompleted ?? true).toString());
    query.set('showHidden', (params.showHidden ?? true).toString());
    if (params.dueMin) query.set('dueMin', params.dueMin);
    if (params.dueMax) query.set('dueMax', params.dueMax);
    if (params.maxResults) query.set('maxResults', params.maxResults.toString());

    const data = await this.request(
      accessToken,
      `/lists/${encodeURIComponent(tasklistId)}/tasks?${query.toString()}`
    );
    return (data.items || []) as GoogleTaskItem[];
  }

  /**
   * Obtém uma tarefa específica
   */
  async getTask(accessToken: string, taskId: string, tasklistId = '@default') {
    return await this.request(
      accessToken,
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`
    );
  }

  /**
   * Cria uma nova tarefa no Google Tasks
   */
  async createTask(
    accessToken: string,
    taskData: {
      title: string;
      notes?: string;
      due?: string;
    },
    tasklistId = '@default'
  ) {
    const payload: GoogleTaskItem = {
      title: taskData.title,
      notes: taskData.notes,
      due: taskData.due,
      status: 'needsAction',
    };

    return await this.request(
      accessToken,
      `/lists/${encodeURIComponent(tasklistId)}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * Atualiza uma tarefa existente no Google Tasks
   */
  async updateTask(
    accessToken: string,
    taskId: string,
    taskData: Partial<GoogleTaskItem>,
    tasklistId = '@default'
  ) {
    return await this.request(
      accessToken,
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(taskData),
      }
    );
  }

  /**
   * Marca uma tarefa como concluída no Google Tasks
   */
  async completeTask(accessToken: string, taskId: string, tasklistId = '@default') {
    return await this.updateTask(
      accessToken,
      taskId,
      {
        status: 'completed',
        completed: new Date().toISOString(),
      },
      tasklistId
    );
  }

  /**
   * Exclui uma tarefa no Google Tasks
   */
  async deleteTask(accessToken: string, taskId: string, tasklistId = '@default') {
    return await this.request(
      accessToken,
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Encontra uma tarefa por título ou palavra-chave
   */
  async findTask(accessToken: string, query: string, tasklistId = '@default') {
    const all = await this.listTasks(accessToken, { tasklistId, showCompleted: true });
    const q = query.toLowerCase().trim();
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
    );
  }

  /**
   * Sincroniza tarefas do Google Tasks para o banco de dados interno
   */
  async syncTasks(accessToken: string, dbTarget: any, userId = 'user_default') {
    const googleTasks = await this.listTasks(accessToken, {
      tasklistId: '@default',
      showCompleted: true,
      showHidden: false,
    });

    const targetList = Array.isArray(dbTarget.tasks) ? dbTarget.tasks : dbTarget.data?.tasks;
    if (!targetList) return { totalFromGoogle: googleTasks.length, syncedCount: 0 };

    let syncedCount = 0;
    const remoteGoogleIds = new Set<string>();

    for (const gTask of googleTasks) {
      if (!gTask.id) continue;
      remoteGoogleIds.add(gTask.id);

      if (gTask.deleted) {
        const existingIdx = targetList.findIndex((t: any) => t.google_task_id === gTask.id);
        if (existingIdx >= 0) {
          targetList.splice(existingIdx, 1);
        }
        continue;
      }

      // Check for match: primary by google_task_id, secondary by exact title when google_task_id is missing
      const existingIndex = targetList.findIndex(
        (t: any) =>
          t.google_task_id === gTask.id ||
          (!t.google_task_id && t.title.toLowerCase().trim() === gTask.title.toLowerCase().trim())
      );

      const isCompleted = gTask.status === 'completed';
      const taskPayload = {
        title: gTask.title,
        description: gTask.notes || '',
        status: isCompleted ? 'completed' : 'pending',
        priority: 'normal',
        due_at: gTask.due || null,
        completed_at: isCompleted ? gTask.completed || new Date().toISOString() : null,
        google_task_id: gTask.id,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        targetList[existingIndex] = {
          ...targetList[existingIndex],
          ...taskPayload,
          user_id: targetList[existingIndex].user_id || userId,
        };
      } else {
        targetList.push({
          id: `task_g_${gTask.id}`,
          user_id: userId,
          created_at: new Date().toISOString(),
          ...taskPayload,
        });
      }
      syncedCount++;
    }

    // Push unsynced local tasks to Google Tasks
    let pushedCount = 0;
    for (const localTask of targetList) {
      if (localTask.user_id === userId && !localTask.google_task_id && localTask.status !== 'cancelled') {
        try {
          const gTask = await this.createTask(accessToken, {
            title: localTask.title,
            notes: localTask.description || 'Sincronizado via URSO JR.',
            due: localTask.due_at || undefined,
          });
          if (gTask?.id) {
            localTask.google_task_id = gTask.id;
            localTask.synced_at = new Date().toISOString();
            pushedCount++;
          }
        } catch (e: any) {
          console.warn(`[Google Tasks Sync] Could not push local task "${localTask.title}":`, e.message);
        }
      }
    }

    if (typeof dbTarget.persist === 'function') {
      dbTarget.persist();
    }

    return { totalFromGoogle: googleTasks.length, syncedCount, pushedCount };
  }
}

export const googleTasksService = new GoogleTasksService();
