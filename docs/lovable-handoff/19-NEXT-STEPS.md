# URSO JR. — Seu estagiário com IA
## 19-NEXT-STEPS.md — Próximos Passos Para Produção (Roadmap)

Este documento reúne e ordena de forma rigorosa as tarefas necessárias para elevar a aplicação atual ao nível de estabilidade exigido para um ambiente comercial de produção.

---

### P0 — Bloqueador (Imprescindível para Lançamento)

#### 1. Migração de Persistência JSON para Banco de Dados Relacional (PostgreSQL)
*   **Problema:** O uso do arquivo `/data/db.json` síncrono causa condições de corrida graves se múltiplas mensagens chegarem juntas de webhooks, corrompendo a base.
*   **Ação:** Substituir a engine reativa local `/server/db.ts` por uma conexão robusta com **PostgreSQL** utilizando um ORM (como Prisma ou Drizzle) ou integrando diretamente com o **Supabase**.
*   **Arquivos Envolvidos:** `/server/db.ts`, `/server.ts`, `/server/agent.ts`.
*   **Dependências:** Provisionar um banco PostgreSQL (ou Supabase).
*   **Critério de Pronto (DoD):** Todas as chamadas de API, gravação de mensagens e Tool Calling da IA operando em transações SQL com concorrência segura, sem gerar ou ler arquivos `.json` de dados locais.

---

### P1 — Importante (Requisitos de Segurança e Autonomia)

#### 2. Fluxo Google OAuth com Refresh Token (Offline Access)
*   **Problema:** Os tokens de acesso do Google expiram a cada 60 minutos, pausando as integrações e forçando o usuário a re-conectar manualmente na tela.
*   **Ação:** Implementar o fluxo **Google OAuth Server-Side Flow**. O frontend solicita o consentimento e envia um `authorization_code` temporário ao backend; o backend realiza o intercâmbio com o Google para obter o `access_token` e o `refresh_token` duradouro (com `access_type: 'offline'`), salvando-o de forma segura.
*   **Arquivos Envolvidos:** `/src/services/googleAuth.ts`, `/server.ts`, `/server/google/calendar.ts`, `/server/google/tasks.ts`.
*   **Dependências:** Configurar chaves OAuth de produção (Client ID + Client Secret) no console de desenvolvedor do Google.
*   **Critério de Pronto (DoD):** O backend renova automaticamente e de forma transparente chaves do Google expiradas em segundo plano, mantendo a sincronização ativa por tempo indeterminado sem banners vermelhos.

#### 3. Proteção e Login no Painel Web Administrativo
*   **Problema:** O painel web de controle mestre é exposto abertamente para qualquer pessoa que acesse a URL raiz.
*   **Ação:** Criar uma barreira de autenticação (Login) para o operador/administrador por meio de sessões seguras ou tokens JWT.
*   **Arquivos Envolvidos:** `/server.ts`, `/src/App.tsx`.
*   **Critério de Pronto (DoD):** Exige login e senha válidos para renderizar as telas do dashboard e permitir consumo de rotas de API administrativas.

---

### P2 — Melhoria (Aprimoramento de UX e Negócio)

#### 4. Validação de Vínculo de Telefone via Código de Confirmação (WhatsApp OTP)
*   **Problema:** No cadastro de novos familiares, qualquer pessoa pode cadastrar um número de terceiro e interceptar a agenda do Google deste terceiro.
*   **Ação:** Ao preencher o formulário de cadastro, o backend gera um código temporário de 6 dígitos (OTP) e o envia via robô do WhatsApp para o celular digitado. O usuário deve informar esse código no painel web para autenticar a propriedade do telefone.
*   **Arquivos Envolvidos:** `/src/components/views/RegisterView.tsx`, `/server.ts`.
*   **Critério de Pronto (DoD):** Perfis de membros só se tornam ativos no WhatsApp após verificação bem sucedida do código enviado pelo celular.
