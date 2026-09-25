# URSO JR. — Seu estagiário com IA
## 20-LOVABLE-START-PROMPT.md — Prompt de Inicialização para o Lovable

Copie e cole o prompt estruturado abaixo na caixa de entrada do **Lovable** para iniciar a migração e continuação imediata e contextualizada deste projeto!

---

```text
Você está assumindo o desenvolvimento do URSO JR., um assessor pessoal com IA ("Seu estagiário com IA") que recebe comandos de voz e texto principalmente pelo WhatsApp e executa tarefas reais em segundo plano, integrado a um Painel de Controle Web administrativo moderno e sofisticado (SaaS Dark Mode).

==============================================================================
DIRETRIZES DE CONTINUAÇÃO (LEIA COM ATENÇÃO ANTES DE ALTERAR QUALQUER ARQUIVO):
==============================================================================
1. Leia toda a pasta /docs/lovable-handoff/ para obter uma auditoria profunda do projeto atual.
2. Audite o código existente antes de fazer modificações (Entenda antes de codificar).
3. Preserve integralmente a arquitetura existente. Não recrie rotas ou mude lógicas funcionais que já estão ativas sem um motivo explícito de negócio.
4. NÃO CRIE MOCKS. A aplicação possui um backend real Express integrado rodando ativamente e proxies de comunicação reais com Google APIs e Uazapi WhatsApp.
5. Não altere o schema ou contratos de tipos em `/src/types/index.ts` sem necessidade técnica justificada.
6. Continue estritamente a partir do status real do projeto. Comece atacando as prioridades do roteiro de Próximos Passos (como a migração para banco SQL PostgreSQL/Supabase no P0 e o fluxo permanente de Google Refresh Token no P1).
7. Em cada lote de alteração realizado, informe claramente se as mudanças pertencem ao FRONTEND, BACKEND, BANCO (DB) ou FULL-STACK.
8. Realize testes unitários e de build em cada lote para validar e garantir a estabilidade do sistema.
9. Não declare uma funcionalidade como "pronta" se ela não tiver integração real funcional.

==============================================================================
CONTEXTO DA ARQUITETURA ATUAL E INTEGRANTES:
==============================================================================
*   FRONTEND: React SPA no Vite escrito em TypeScript, estilizado com Tailwind CSS v4, animações Framer Motion e Lucide Icons.
*   BACKEND: Servidor Express em TypeScript configurado no `/server.ts` e arquivos auxiliares em `/server`.
*   BANCO DE DADOS: Atualmente persistido de forma síncrona local no arquivo `/data/db.json` gerenciado pela classe Database no `/server/db.ts`. Um schema SQL equivalente planejado está disponível em `/docs/lovable-handoff/schema-current.sql`.
*   WHATSAPP (UAZAPI): Integrado em duas vias: Listener de fluxo de rede SSE (Server-Sent Events) contínuo e Webhook HTTP POST (/api/webhooks/uazapi), com normalização e deduplicação multicamadas de mensagens em tempo real.
*   INTELIGÊNCIA ARTIFICIAL: SDK `@google/genai` conectando o modelo especializado 'gemini-3.5-transcribe' para decodificação de áudios/mensagens de voz em português e os modelos 'gemini-3.8-flash' / 'gemini-3.6-flash' para interpretações textuais e Tool Calling.
*   GOOGLE WORKSPACE: Integração direta com as fontes canônicas Google Calendar (para compromissos) e Google Tasks (para afazeres) por meio de Access Tokens de cliente repassados e gerenciados via proxies de servidor.

Por favor, analise a documentação de handoff e o repositório, e me apresente uma análise inicial do projeto e qual tarefa das prioridades P0 descritas no /docs/lovable-handoff/19-NEXT-STEPS.md você propõe começar a executar primeiro!
```
