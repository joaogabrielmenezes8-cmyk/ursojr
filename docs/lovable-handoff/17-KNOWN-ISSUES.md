# URSO JR. — Seu estagiário com IA
## 17-KNOWN-ISSUES.md — Débitos Técnicos e Pontos Frágeis

Este documento elenca de forma aberta, transparente e mapeada todos os débitos técnicos, mocks e fragilidades arquiteturais existentes no projeto atual que necessitam de atenção durante o desenvolvimento no Lovable.

---

### 1. Débitos Técnicos Críticos (Infraestrutura)

#### 1.1 Persistência Baseada em Arquivo JSON Local (`/server/db.ts`)
*   **Problema:** O banco de dados utiliza a classe `Database` que faz leituras e gravações síncronas (`fs.writeFileSync`) diretamente no arquivo físico `/data/db.json`. 
*   **Risco:** Sob carga média ou alta de requisições simultâneas (vários webhooks de WhatsApp chegando no mesmo segundo), ocorrerão condições de corrida (Race Conditions), podendo resultar em corrupção de dados ou perdas de mensagens.
*   **Recomendação:** Migrar imediatamente para um banco de dados relacional clássico como PostgreSQL (utilizando Prisma, Drizzle ou Supabase) utilizando transações robustas.

#### 1.2 Sessões de Google OAuth Sem Refresh Token (`/src/services/googleAuth.ts`)
*   **Problema:** O fluxo de autenticação do Google atual é executado puramente no frontend do cliente, retornando um `access_token` volátil que expira em 1 hora. Não há geração de um `refresh_token` duradouro de backend.
*   **Risco:** A cada 60 minutos de uso contínuo, a conexão com o Google Agenda e Google Tasks cai de forma silenciosa ou acusa erros 401, exigindo que o usuário clique em "Reconectar Google" no painel.
*   **Recomendação:** Migrar para o fluxo de autenticação de backend Google OAuth Web Server Flow (utilizando chaves de cliente do Google e obtendo `refresh_token` permanente com `access_type: 'offline'`).

#### 1.3 Painel Web Sem Autenticação e Autorização (`/server.ts`)
*   **Problema:** Não há login, cookies ou sessões de segurança para acesso à URL e endpoints do painel web.
*   **Risco:** Se colocado em produção na nuvem sem proteção adicional, as informações estarão totalmente públicas e vulneráveis.
*   **Recomendação:** Adicionar uma camada de autenticação baseada em JWT ou login de operadores (RBAC).

---

### 2. Fragilidades de Integração e Negócio

#### 2.1 Ausência de Fila de Retentativas de Envio (Retries) de Lembretes (`/server/scheduler.ts`)
*   **Problema:** Se um lembrete falhar ao ser enviado no WhatsApp (porque a internet caiu ou a instância Uazapi desconectou), o lembrete é marcado definitivamente como `failed` na entrega e não é colocado em nenhuma fila de reenvio automático.
*   **Recomendação:** Adicionar uma máquina de estados com suporte a retentativas (ex: tentar enviar novamente por até 3 vezes com espaçamento de 5 minutos antes de marcar como falho em definitivo).

#### 2.2 Sem Suporte para Mídias no WhatsApp (Imagens / Documentos)
*   **Problema:** Se o usuário enviar um arquivo PDF, comprovante de pagamento em imagem, ou planilha de gastos pelo WhatsApp, o robô ignora o arquivo e responde que não compreendeu o anexo.
*   **Recomendação:** Habilitar suporte na normalização de mensagens para capturar mídias, salvá-las temporariamente e permitir que o Gemini analise imagens (ex: ler comprovantes de gastos enviados em formato de foto).
