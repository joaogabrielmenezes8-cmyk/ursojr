# URSO JR. — Seu estagiário com IA
## 05-AUTH.md — Autenticação e Gestão de Perfis (Multi-User)

Este documento descreve como o sistema lida com autenticação, sessões de usuário, autorizações de APIs externas e identificação de múltiplos perfis (Multi-User).

---

### 1. Arquitetura Multi-User de Fato

A arquitetura do URSO JR. é nativamente **Multi-User (Multiperfil)**, embora o painel de administração web funcione de forma aberta como um painel administrativo mestre do sistema.

1.  **Painel Web Administrativo (Single-Tenant):** É o painel mestre. Não requer senha para acesso direto nas rotas tradicionais (como `/` ou `/agenda`). Ele serve como o console geral onde o administrador pode gerenciar todos os perfis, visualizar conversas do WhatsApp e intervir manualmente no suporte.
2.  **Fluxo de Auto-Cadastro de Clientes (`/register` ou `/cadastro`):** Permite o cadastro e provisionamento isolado de novas contas por terceiros (membros da casa ou da empresa). 

---

### 2. Fluxo de Autenticação do Usuário (Cadastro)

O fluxo de entrada de novos perfis ocorre de forma segura e guiada via **Google OAuth**:

```text
[Tela de Registro] 
       ↓ (1) Usuário clica em "Conectar com Google"
[Google Identity Client Popup]
       ↓ (2) Usuário aceita os escopos (Calendar e Tasks)
[Google OAuth Success Token]
       ↓ (3) Frontend envia Access Token + WhatsApp para /api/register
[Backend Server]
       ↓ (4) Cria/atualiza o perfil e dispara sincronização assíncrona
[WhatsApp URSO JR.] 
       ↓ (5) Usuário clica em "Iniciar Conversa" e manda oi no celular
```

---

### 3. Identificação Dinâmica de Usuários pelo WhatsApp

No WhatsApp, quando uma mensagem chega via SSE ou Webhook, a identificação ocorre estritamente pelo número de telefone de origem:

1.  O processador extrai o telefone do remetente (ex: `5538991246669`).
2.  Executa a busca do perfil correspondente em `db.getProfileByPhone(phone)` usando **limpeza de números e busca por sufixo de 8 dígitos** (garante correspondência mesmo se o número vier com ou sem o nono dígito '9', ou se houver variação no código de área).
3.  Se um perfil for encontrado:
    *   O robô processa a mensagem sob o contexto daquele perfil específico (carrega a agenda dele, as tarefas dele, o histórico de chat e a memória de IA dele). Os dados são **100% isolados** de outros usuários.
4.  Se o perfil não for encontrado:
    *   **Auto-Provisionamento:** O sistema cria dinamicamente um novo perfil para este número usando o nome do contato vindo do WhatsApp (`pushName`), associando-o à mesma instância do WhatsApp do administrador, permitindo que qualquer pessoa que mande mensagem pro robô comece a usar a IA imediatamente, com histórico individualizado!

---

### 4. Proteção de Rotas e Segurança de Token

*   **OAuth e Scopes:** A conexão utiliza os escopos canônicos do Google Workspace:
    *   `https://www.googleapis.com/auth/calendar.events` (Para criar/editar compromissos)
    *   `https://www.googleapis.com/auth/tasks` (Para gerenciar tarefas)
*   **Armazenamento de Chaves:** Os `google_access_token` de cada usuário são armazenados de forma isolada na tabela `profiles` de cada conta.
*   **Google Token Refresh:** Como a autenticação de cliente Google OAuth no navegador (implicit flow) não gera um `refresh_token` duradouro sem configuração de backend complexa (OAuth Web Server Flow), o backend detecta falhas de API (erros `401 Unauthorized`) e marca a flag `google_token_expired: true` no perfil do usuário.
*   **Banner de Alerta:** Quando a expiração do token é detectada, o frontend exibe um banner vermelho persistente solicitando a reconexão. O operador ou usuário clica em "Reconectar Google" para reabrir o popup do Google e re-sincronizar o token, reativando a sincronização remota sem perda de dados locais.
