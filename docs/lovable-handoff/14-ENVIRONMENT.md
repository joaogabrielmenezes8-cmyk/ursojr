# URSO JR. — Seu estagiário com IA
## 14-ENVIRONMENT.md — Variáveis de Ambiente Requeridas

Este documento descreve as variáveis de ambiente necessárias para a execução plena da aplicação e suas respectivas responsabilidades.

---

### 1. Dicionário de Variáveis de Ambiente

O arquivo de configuração local `.env` (ou as variáveis de ambiente em produção) deve expor estritamente as seguintes chaves de configuração:

| Variável | Tipo | Obrigatório | Descrição / Finalidade | Exemplo Seguro |
| :--- | :--- | :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | VARCHAR | Sim | Chave de autorização de API do Gemini para invocação do SDK `@google/genai`. | `"AIzaSyD..."` |
| **`APP_URL`** | URL | Sim (Prod) | URL canônica onde a aplicação está hospedada (Utilizado para montar links e redirecionamentos dinâmicos de webhooks). | `"https://meuapp.run.app"` |
| **`UAZAPI_BASE_URL`**| URL | Não | URL base padrão para comunicação com a API da Uazapi. Se omitido, o sistema assume `https://bearcontrol.uazapi.com`. | `"https://api.uazapi.com"` |
| **`UAZAPI_TOKEN`** | VARCHAR | Não | Token de autenticação padrão para a instância da Uazapi (utilizado se o perfil não tiver token próprio). | `"120cce91-b19a-4857..."` |
| **`UAZAPI_INSTANCE_ID`**| VARCHAR| Não | ID único identificador da instância do WhatsApp na Uazapi. | `"b3r"` |

---

### 2. Exemplo de Arquivo de Configuração (`.env.example`)

O arquivo `.env.example` está presente na raiz do repositório com o seguinte conteúdo padrão para cópia:

```bash
# GEMINI_API_KEY: Required for Gemini AI API calls.
# AI Studio automatically injects this at runtime from user secrets.
# Users configure this via the Secrets panel in the AI Studio UI.
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# APP_URL: The URL where this applet is hosted.
# AI Studio automatically injects this at runtime with the Cloud Run service URL.
# Used for self-referential links, OAuth callbacks, and API endpoints.
APP_URL="MY_APP_URL"

# Uazapi WhatsApp Integration:
# Your Uazapi base URL (e.g. https://api.uazapi.com or your self-hosted URL)
UAZAPI_BASE_URL="https://bearcontrol.uazapi.com"
# Your Uazapi instance token / API key
UAZAPI_TOKEN="120cce91-b19a-4857-a031-9a589c399ef4"
# Your Uazapi instance ID / name
UAZAPI_INSTANCE_ID="b3r"
```
