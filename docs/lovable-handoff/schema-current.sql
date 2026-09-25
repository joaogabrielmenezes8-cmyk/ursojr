-- ==============================================================================
-- SCHEMA DE BANCO DE DADOS ATUAL — URSO JR.
-- Equivalente estrutural gerado a partir do repositório db.json e src/types/index.ts
-- Pronto para migração PostgreSQL, Supabase ou Prisma
-- ==============================================================================

-- 1. Ativação de extensões necessárias no Postgres
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Definição dos tipos ENUM para restrição e padronização (Constraints)
CREATE TYPE task_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE reminder_status_enum AS ENUM ('pending', 'sent', 'cancelled');
CREATE TYPE reminder_delivery_enum AS ENUM ('pending', 'delivered', 'failed');
CREATE TYPE recurrence_rule_enum AS ENUM ('none', 'daily', 'weekly', 'monthly', 'weekdays');
CREATE TYPE event_status_enum AS ENUM ('confirmed', 'tentative', 'cancelled');
CREATE TYPE memory_category_enum AS ENUM ('preference', 'fact', 'rule', 'contact_detail', 'work');
CREATE TYPE message_direction_enum AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status_enum AS ENUM ('received', 'sent', 'failed');

-- 3. Tabela: profiles (Perfis de usuário e conexões de APIs)
CREATE TABLE profiles (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'user_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    phone VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo',
    daily_summary_time VARCHAR(10) NOT NULL DEFAULT '07:30',
    daily_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_instance_id VARCHAR(100) DEFAULT 'b3r',
    whatsapp_token TEXT,
    whatsapp_base_url VARCHAR(255) DEFAULT 'https://bearcontrol.uazapi.com',
    google_access_token TEXT,
    google_email VARCHAR(255),
    google_connected BOOLEAN DEFAULT FALSE,
    google_token_expired BOOLEAN DEFAULT FALSE,
    google_last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Tabela: tasks (Tarefas integradas ao Google Tasks)
CREATE TABLE tasks (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'task_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status_enum NOT NULL DEFAULT 'pending',
    priority task_priority_enum NOT NULL DEFAULT 'normal',
    due_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    google_task_id VARCHAR(255),
    synced_at TIMESTAMP WITH TIME ZONE,
    reminder_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Tabela: reminders (Lembretes automáticos do WhatsApp)
CREATE TABLE reminders (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'rem_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence_rule recurrence_rule_enum NOT NULL DEFAULT 'none',
    status reminder_status_enum NOT NULL DEFAULT 'pending',
    task_id VARCHAR(100),
    google_task_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status reminder_delivery_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Tabela: events (Compromissos integrados ao Google Calendar)
CREATE TABLE events (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'evt_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    status event_status_enum NOT NULL DEFAULT 'confirmed',
    google_event_id VARCHAR(255),
    html_link TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Tabela: notes (Bloco de Notas)
CREATE TABLE notes (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'note_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_memory BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Tabela: contacts (Agenda de Fornecedores e Equipe)
CREATE TABLE contacts (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'contact_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Tabela: memories (Preferências e Fatos de Longo Prazo aprendidos pela IA)
CREATE TABLE memories (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'mem_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    category memory_category_enum NOT NULL DEFAULT 'fact',
    confidence REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_memory_key UNIQUE (user_id, key)
);

-- 10. Tabela: conversations (Chats de conversa do WhatsApp)
CREATE TABLE conversations (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'conv_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    contact_phone VARCHAR(30) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
    unread_count INTEGER NOT NULL DEFAULT 0,
    avatar_color VARCHAR(10) DEFAULT '#4F46E5',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_contact_chat UNIQUE (user_id, contact_phone)
);

-- 11. Tabela: messages (Bolhas de mensagens do histórico de chats)
CREATE TABLE messages (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'msg_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    conversation_id VARCHAR(100) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction message_direction_enum NOT NULL,
    text TEXT NOT NULL,
    status message_status_enum NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tool_called VARCHAR(100),
    action_id VARCHAR(100),
    raw_payload JSONB
);

-- 12. Tabela: agent_actions (Auditoria das decisões do Agente de IA)
CREATE TABLE agent_actions (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'act_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_id VARCHAR(100),
    user_message TEXT NOT NULL,
    detected_intent VARCHAR(100) NOT NULL,
    tool_called VARCHAR(100) NOT NULL,
    tool_arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    assistant_response TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Tabela: webhook_events (Logs para deduplicação e auditoria de webhooks)
CREATE TABLE webhook_events (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'wh_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    message_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Tabela: expenses (Controle Financeiro / Gastos)
CREATE TABLE expenses (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'exp_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    user_id VARCHAR(100) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    category VARCHAR(100) NOT NULL DEFAULT 'outros',
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 15. Índices de Desempenho e Deduplicação
-- ==============================================================================
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_reminders_status_time ON reminders(status, scheduled_at);
CREATE INDEX idx_events_user_time ON events(user_id, start_time);
CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, timestamp);
CREATE INDEX idx_webhook_msg_id ON webhook_events(message_id);
CREATE INDEX idx_agent_user_time ON agent_actions(user_id, timestamp);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
