# URSO JR. — Seu estagiário com IA
## 15-SECURITY.md — Auditoria e Análise de Segurança

Este documento apresenta uma auditoria técnica realista sobre os pilares de segurança, proteção de dados pessoais, controle de tokens e riscos operacionais identificados no projeto atual.

---

### 1. Riscos de Segurança Identificados e Classificação

Abaixo estão listados os riscos concretos identificados no código atual, classificados por severidade, acompanhados de ações mitigatórias sugeridas para o próximo estágio de desenvolvimento no Lovable.

#### 🚨 RISCO 1: Painel Administrativo Mestre sem Autenticação
*   **Classificação:** **ALTO**
*   **Detecção:** Atualmente, qualquer requisição para o painel web (como `http://localhost:3000/`) ganha acesso total de leitura e escrita a todas as tabelas (tarefas, eventos, configurações de faturamento, credenciais e logs de auditoria do WhatsApp) sem passar por uma tela de login de operador ou autenticação de sessão básica.
*   **Ação de Correção (Mitigação):** É imperativo implementar um sistema de autenticação básico (ou integração com Auth0 / Supabase Auth) para proteger as rotas estáticas e APIs do painel web antes de realizar o deploy em um endereço público de produção.

#### 🚨 RISCO 2: Cadastro de Membros sem Confirmação de Telefone (Falsidade Ideológica)
*   **Classificação:** **ALTO**
*   **Detecção:** No endpoint `/api/register` e na tela de `/register`, o usuário conecta o Google OAuth e preenche seu nome e telefone manualmente. O backend cria o perfil confiando estritamente no telefone digitado, sem validar se o usuário é realmente o dono daquele número. Isso permitiria que um usuário mal-intencionado cadastrasse o número de outra pessoa e vinculasse sua própria agenda do Google a ela, interceptando mensagens.
*   **Ação de Correção:** Implementar uma rotina de verificação em duas etapas (2FA). Por exemplo, ao registrar, o URSO JR. dispara um código de confirmação temporário de 6 dígitos via WhatsApp Uazapi para o telefone informado; o usuário deve digitar esse código na tela de cadastro para concluir o vínculo.

#### ⚠️ RISCO 3: Armazenamento de Access Tokens em Texto Claro (Plain Text)
*   **Classificação:** **MÉDIO**
*   **Detecção:** Os `google_access_token` e os `whatsapp_token` de cada usuário estão sendo persistidos de forma crua (texto claro) no arquivo `/data/db.json`. Caso o servidor sofra um vazamento de arquivos físicos ou invasão, todas as chaves de acesso estariam expostas.
*   **Ação de Correção:** Criptografar simetricamente os tokens de faturamento e chaves de acesso antes de gravar no banco de dados (ex: utilizando o módulo nativo `crypto` do Node.js com chaves de criptografia armazenadas em variáveis de ambiente).

#### ⚠️ RISCO 4: Logs de Auditoria Contendo Dados Pessoais (PII)
*   **Classificação:** **MÉDIO**
*   **Detecção:** A tabela `agent_actions` e as tabelas de `messages` armazenam os payloads originais crus trafegados, o que inclui textos de e-mails, conversas particulares, senhas de contas (caso ditadas pelo usuário) e nomes de familiares em formato de texto exposto no painel web.
*   **Ação de Correção:** Limpar ou mascarar dados sensíveis nos payloads de auditoria, além de expor a aba de Auditoria de IA apenas a operadores autenticados com papéis elevados de Administrador (Role-Based Access Control - RBAC).

---

### 2. Pontos Fortes de Segurança Existentes

*   **Segurança de Segredos no Frontend (Zero Leak):** Nenhuma chave de API (como a `GEMINI_API_KEY` ou os tokens administrativos de WhatsApp) está exposta ou embarcada no código compilado de frontend. Todas as invocações passam exclusivamente por proxies seguros de backend no servidor Express.
*   **Isolamento de Perfis (Prevenção de Cross-User Access):** No canal do WhatsApp, os dados são rigidamente filtrados e separados pelo número de telefone de faturamento. Não há vazamento de dados de um membro da família para outro durante o Tool Calling ou processamento de mensagens.
