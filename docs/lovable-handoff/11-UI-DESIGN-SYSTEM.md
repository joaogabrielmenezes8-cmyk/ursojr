# URSO JR. — Seu estagiário com IA
## 11-UI-DESIGN-SYSTEM.md — Design System e Identidade Visual

Este documento registra as diretrizes estéticas, paleta de cores, tipografia, bordas e estilos aplicados no painel web para manter consistência visual e um acabamento premium estilo SaaS moderno de IA.

---

### 1. Paleta de Cores (Definida via Variáveis CSS no `index.css`)

A identidade visual é baseada em um tema **Dark Mode nativo** e sofisticado com alto contraste e destaques em verde-limão tecnológico.

```css
:root {
  --bg-main: #0F1115;                  /* Fundo de tela principal */
  --bg-surface: #181C22;               /* Fundo de superfícies, painéis e cartões */
  --bg-surface-elevated: #1E232B;      /* Superfícies elevadas (Modais, menus suspensos) */
  --bg-surface-hover: #242A34;         /* Efeito de pairar (Hover) em listas e botões */
  --border-subtle: #262C36;            /* Bordas finas de cartões e divisores */
  --border-highlight: #343C4A;         /* Bordas ativas ou em foco */
  --text-main: #F5F7FA;                /* Texto de leitura primário (Quase Branco) */
  --text-muted: #9CA3AF;               /* Texto de leitura secundário (Cinza suave) */
  --accent-brand: #C7FF3D;             /* Verde-Limão tecnológico (Destaque Principal) */
  --accent-brand-hover: #B5F028;       /* Verde-Limão hover ativo */
  --accent-brand-subtle: rgba(199, 255, 61, 0.12); /* Fundo sutil de destaque */
  --success: #22C55E;                  /* Verde para status Sucesso / Conectado */
  --warning: #F59E0B;                  /* Laranja para status Alertas / Avisos */
  --error: #EF4444;                    /* Vermelho para status Falhas / Erros */
  --purple: #8B5CF6;                   /* Roxo decorativo de gradiente de fundo */
}
```

---

### 2. Estilos de Componentes Base (Classes Utilitárias Reutilizáveis)

O sistema de design declara classes personalizadas de conveniência em `/src/index.css` que garantem unidade em todo o frontend:

*   **Cartão Padrão (`.card-urso`):**
    ```css
    .card-urso {
      background-color: #181C22;
      border: 1px solid #262C36;
      border-radius: 1rem; /* 16px */
    }
    ```
*   **Botão Primário de Destaque (`.btn-primary-urso`):**
    Visual em verde-limão com tipografia em peso 700, transições suaves, elevação sutil no hover e sombra brilhante.
    ```css
    .btn-primary-urso {
      background-color: #C7FF3D;
      color: #0F1115;
      font-weight: 700;
      transition: all 0.15s ease-in-out;
    }
    .btn-primary-urso:hover {
      background-color: #b8f72a;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(199, 255, 61, 0.25);
    }
    ```
*   **Botão Secundário (`.btn-secondary-urso`):**
    Apropriado para cancelamentos ou opções alternativas, combinando superfície escura com bordas sutis.
    ```css
    .btn-secondary-urso {
      background-color: #181C22;
      color: #F5F7FA;
      border: 1px solid #262C36;
      font-weight: 600;
      transition: all 0.15s ease-in-out;
    }
    ```

---

### 3. Tipografia, Espaçamento e Bordas

*   **Tipografia:** A família tipográfica padrão utiliza a pilha de fontes nativas do sistema priorizando a clareza e alta legibilidade: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif`.
*   **Arredondamento de Bordas (Border Radius):**
    *   `rounded-xl` (`12px` / `0.75rem`) para inputs de formulário e botões de ação rápida.
    *   `rounded-2xl` / `rounded-3xl` (`16px` e `24px`) para modais de confirmação, painéis de chat e cartões principais.
*   **Foco e Entradas (Inputs):** Todos os campos de digitação compartilham um comportamento visual uniforme: fundo escuro (`#0F1115`), borda fina (`#262C36`) e anel de foco em verde-limão (`focus:border-[#C7FF3D] focus:ring-[#C7FF3D]`).

---

### 4. Integração com Tailwind CSS v4

O projeto utiliza o compilador **Tailwind CSS v4** integrado dinamicamente pelo plugin `@tailwindcss/vite` no arquivo `vite.config.ts`. A importação é feita usando a nova sintaxe da versão 4 no topo do arquivo `/src/index.css`:

```css
@import "tailwindcss";
```

Não há arquivo separado `tailwind.config.js` porque na versão 4 do Tailwind toda a customização de tema é feita utilizando variáveis nativas `:root` declaradas diretamente no arquivo CSS global.
