# URSO JR. — Seu estagiário com IA
## 06-WHATSAPP-UAZAPI.md — Integração WhatsApp (Uazapi)

Este documento detalha profundamente as engrenagens de recebimento, envio e tratamento das mensagens com o WhatsApp via provider **Uazapi**.

---

### 1. Visão Geral da Configuração

A Uazapi atua como a ponte de comunicação entre o ecossistema do URSO JR. e os servidores do WhatsApp. 

*   **Endpoint Padrão:** `https://bearcontrol.uazapi.com` (sobreposto dinamicamente pelo perfil).
*   **Identificadores Principais:** `whatsapp_instance_id` (ID da instância do usuário) e `whatsapp_token` (Chave de autenticação / API Key).

---

### 2. Provider de Mensagens (`/server/providers/messaging.ts`)

A classe `UazapiProvider` implementa o contrato `MessagingProvider`, sendo responsável por todas as requisições de saída (Outbound) para a Uazapi:

*   **`sendTextMessage(to, text)`:** Envia mensagens de texto. Ele implementa uma rotina inteligente de tentativa de múltiplos formatos de números brasileiro (candidatos de telefone):
    *   Testa envio com nono dígito (ex: `5538991246669`).
    *   Se falhar ou acusar "not on WhatsApp", tenta sem o nono dígito (ex: `553891246669`).
    *   Tenta vários caminhos de endpoints alternativos da Uazapi (`/send/text`, `/sendText`, `/message/sendText/:instance`, `/chat/sendTextMessage/:instance`) para garantir compatibilidade com diferentes versões e servidores da API.
*   **`sendTyping(to)`:** Dispara a presença visual "digitando..." (composing) no WhatsApp por 1200ms para simular comportamento humano.
*   **`markAsRead(messageId)`:** Envia requisição para marcar a mensagem recebida como lida.
*   **`getInstanceStatus()`:** Consulta a saúde da instância na Uazapi (QR Code, conexões ativas, etc.). Trata erros estruturais no objeto retornado pela API para evitar quebras de tempo de execução.
*   **`syncRemoteWebhook(targetUrl)`:** Força a Uazapi a enviar notificações de webhooks para o nosso servidor.

---

### 3. Loop SSE & Webhooks (`/server/services/uazapi-listener.ts`)

Para garantir redundância e entrega em tempo real, o URSO JR. escuta mensagens em duas vias:

1.  **SSE (Server-Sent Events) Real-Time Listener:** Executado continuamente em segundo plano pelo servidor. Ele estabelece uma conexão HTTP `keep-alive` constante para o endpoint `/sse` da Uazapi, recebendo as mensagens no exato milissegundo em que ocorrem.
2.  **Webhook HTTP POST (`/api/webhooks/uazapi`):** Endpoint preparado para receber requisições assíncronas enviadas pela Uazapi.

---

### 4. Normalização de Payload

Como payloads de diferentes eventos ou webhooks do WhatsApp possuem chaves variadas (ex: `key`, `message`, `data`, `sender`, `sender_pn`), o método `normalizeIncomingMessage` unifica os campos sob um contrato idêntico de saída (`NormalizedMessage`):

```typescript
export interface NormalizedMessage {
  messageId: string;        // ID único (ex: "3EB0212C07EEBE10C1153D")
  phone: string;            // Telefone limpo (ex: "553891246669")
  text: string;             // Texto extraído da mensagem
  fromMe: boolean;          // Se a mensagem partiu de nós (bot)
  timestamp: number;        // Horário do disparo (Epoch ms)
  pushName?: string;        // Nome aproximado exibido no WhatsApp
  isAudio?: boolean;        // Flag identificadora de mensagem de voz
  audioInfo?: {             // Dados de mídia para transcrição
    url?: string;
    base64?: string;
    mimeType?: string;
    seconds?: number;
    messageId?: string;
    shortId?: string;
    instanceId?: string;
  };
}
```

---

### 5. Mecanismo de Deduplicação e Proteção Contra Loops (Idempotência)

Uma das partes mais críticas e robustas da escuta do WhatsApp é o seu **sistema multicamadas de deduplicação** implementado no método `processIncomingWhatsAppMessage`. Ele evita que o robô processe e responda à mesma mensagem duas ou mais vezes devido à latência de conexões SSE/Webhooks:

1.  **Deduplicação por In-Flight Lock (Set em Memória):** Mantém um Set de IDs de mensagens atualmente em processamento ativo. Se o webhook e o SSE receberem a mesma mensagem simultaneamente, o segundo a chegar é ignorado imediatamente.
2.  **Lock por Usuário/Telefone (Milissegundos):** Impede que o mesmo usuário envie várias requisições simultâneas em menos de um segundo (previne cliques duplos de áudio/texto).
3.  **Deduplicação de Histórico Recente (Janela de 2 Minutos):** Um cache em memória armazena IDs processados recentemente por até 120 segundos.
4.  **Deduplicação de Rajadas de Conteúdo (Burst):** Se o usuário enviar a mesma mensagem exata duas vezes em menos de 60 segundos, a duplicada é ignorada.
5.  **Deduplicação no Banco Físico:** Antes de iniciar o processamento, consulta o histórico em `db.isWebhookProcessed(messageId)`.
6.  **Prevenção Contra Auto-Loop (Mensagens do Bot):** O normalizador descarta mensagens que contenham flags de `fromMe: true` ou `wasSentByApi: true`, evitando que o robô responda a si mesmo em loop infinito.
7.  **Tratamento de Mídia de Voz:** Mensagens identificadas com `isAudio: true` acionam o pipeline de download de arquivo de mídia e transcrição via Gemini 3.5 Transcribe.
