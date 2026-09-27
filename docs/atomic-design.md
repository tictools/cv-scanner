# Atomic Design

> **Living document** — define la arquitectura de componentes para `src/app`. Actualizar conforme evoluciona la UI.

---

## 1. Overview

El framework de Atomic Design organiza los componentes de la interfaz en cinco niveles jerárquicos, de lo más simple a lo más complejo:

```
Atoms → Molecules → Organisms → Pages
```

Esta estructura:
- **Reduce duplicación** — componentes reutilizables a múltiples niveles.
- **Mejora testabilidad** — cada nivel es testeable de forma aislada.
- **Aclara responsabilidades** — cada componente sabe qué nivel ocupa.
- **Facilita onboarding** — desarrolladores nuevos entienden dónde va cada pieza.

En cv-scanner, los componentes viven bajo `src/app/ui/` y se dividen en estas carpetas.

---

## 2. Core Rule: No Raw JSX Outside Atoms

**EXPLICIT CONSTRAINT:** No component above the Atom level may emit raw HTML (JSX elements). Every molecule, organism, and page must **compose exclusively from Atoms and Molecules**, never from bare `<div>`, `<span>`, `<button>`, or any other DOM element.

**Why:**
- **Consistency** — all UI primitives flow through a shared, testable, documented layer.
- **Reusability** — atoms carry design language (spacing, color, typography) that can be changed globally.
- **Enforcement** — linting (or code review discipline) catches regressions early.

**What counts as "raw HTML":**
- Any JSX element that is not a component import (e.g., `<div>`, `<span>`, `<button>`, `<p>`, etc.).
- Exception: CSS Module classNames on wrapper divs are permitted **only in Atoms** to compose layout within an atom; molecules and above must wrap in an Atom or use composition.

**Examples:**

❌ **WRONG** — raw `<div>` in a Molecule:
```tsx
// SearchBar.tsx (MOLECULE) — VIOLATES RULE
export const SearchBar: React.FC<SearchBarProps> = ({ onSubmit }) => {
  return (
    <div className={styles.searchBar}>  // ← raw HTML, not allowed in molecules
      <Input onSubmit={onSubmit} />
      <Button>Search</Button>
    </div>
  );
};
```

✅ **RIGHT** — wrap in a Container Atom:
```tsx
// atoms/Container/Container.tsx
export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`${styles.container} ${className}`}>{children}</div>;

// molecules/SearchBar.tsx
export const SearchBar: React.FC<SearchBarProps> = ({ onSubmit }) => (
  <Container className={styles.searchBar}>  // ← Atom, allowed
    <Input onSubmit={onSubmit} />
    <Button>Search</Button>
  </Container>
);
```

❌ **WRONG** — raw `<button>` in an Organism:
```tsx
// organisms/ChatPanel.tsx — VIOLATES RULE
export const ChatPanel: React.FC = () => (
  <div>
    <button onClick={...}>Send</button>  // ← raw button element
  </div>
);
```

✅ **RIGHT** — always use Button atom:
```tsx
// organisms/ChatPanel.tsx
export const ChatPanel: React.FC = () => (
  <Container>
    <Button onClick={...}>Send</Button>  // ← Atom
  </Container>
);
```

---

## 3. Definiciones por Nivel

### 3.1 Atoms (Primitivas)

**Qué son:** Componentes elementales, indivisibles, sin lógica de negocio.

**Características:**
- Sin estado interno (o estado trivial: hover, focus).
- Altamente reutilizables.
- Props explícitas, ninguna de negocio (ej. no "isLoading", sino solo "disabled").
- Estilo encapsulado con CSS Modules.
- **Únicos componentes que pueden emitir raw HTML.**

**Ejemplos:**
- `Button` — clickeable, variants (primary, secondary, danger), tamaños.
- `Input` — text/textarea, placeholder, onChange handler, disabled state.
- `Text` — párrafo con estilos (normal, small, mono).
- `Heading` — h1-h4, con reset de margin/padding base.
- `Badge` — etiqueta pequeña, color variants.
- `Spinner` — indicador de cargando (SVG o CSS animation).
- `Avatar` — imagen redonda, fallback si no carga.
- `Icon` — iconografía (SVG inline o web font).
- `Container` — wrapper div para layout.
- `Flex` — layout primitivo (flex row/column).
- `Box` — spacer/padding primitivo.

**Ubicación:**
```
src/app/ui/atoms/
├── Button/
│   ├── Button.tsx
│   └── Button.module.css
├── Input/
│   ├── Input.tsx
│   └── Input.module.css
├── Text/
│   ├── Text.tsx
│   └── Text.module.css
├── Container/
│   ├── Container.tsx
│   └── Container.module.css
└── ...
```

**Estructura de Componente Atom:**
```tsx
// Button.tsx
import styles from './Button.module.css';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`${styles.button} ${styles[`button--${variant}`]} ${className}`}
  >
    {children}
  </button>
);
```

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.button--primary {
  background-color: #007bff;
  color: white;
}

.button--primary:hover {
  background-color: #0056b3;
}

.button--secondary {
  background-color: #e9ecef;
  color: #212529;
}

/* ... */
```

---

### 3.2 Molecules (Composiciones)

**Qué son:** Grupos de atoms que forman una unidad funcional.

**Características:**
- Combinan 2+ atoms, **nunca raw HTML.**
- Pueden tener estado simple (local, no global).
- Lógica enfocada en la composición (ej. "qué pasa cuando el user escribe en el input").
- Props reflejan intención compositiva, no negocio (ej. `onSubmit` no `onQueryAgent`).

**Ejemplos:**
- `SearchBar` — Input + Button, maneja onChange y onClick localmente.
- `ChatMessage` — burbuja de chat: Container (alineada según el autor) + Heading (autor) + Markdown
  (respuesta del agente) o Text (pregunta del usuario, literal). Las fuentes citadas no van aquí: son
  del `SourcePanel`.
- `SourceEntry` — Avatar (foto del CV del candidato) + Link con Badge (el nombre, que abre el PDF).
- `LoadingState` — Spinner + Text ("Cargando...").

**Ubicación:**
```
src/app/ui/molecules/
├── SearchBar/
│   ├── SearchBar.tsx
│   ├── SearchBar.module.css
│   └── hooks/
│       └── useSearchBarInput.ts  (opcional, si lógica es compleja)
├── ChatMessage/
│   ├── ChatMessage.tsx
│   ├── ChatMessage.module.css
│   └── types.ts
└── ...
```

**Estructura de Componente Molecule:**
```tsx
// SearchBar.tsx
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Container } from '../atoms/Container';
import { useState } from 'react';
import styles from './SearchBar.module.css';

export interface SearchBarProps {
  onSubmit: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSubmit,
  placeholder = 'Ask a question...',
  disabled = false,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input);
      setInput('');
    }
  };

  return (
    <Container className={styles.searchBar}>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button onClick={handleSubmit} disabled={disabled || !input.trim()}>
        Send
      </Button>
    </Container>
  );
};
```

```css
/* SearchBar.module.css */
.searchBar {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background-color: #f9f9f9;
  border-top: 1px solid #ddd;
}

.searchBar input {
  flex: 1;
}

.searchBar button {
  min-width: 80px;
}
```

---

### 3.3 Organisms (Secciones Complejas)

**Qué son:** Composiciones de molecules y atoms que representan una sección lógica de la interfaz.

**Características:**
- Combinan molecules y atoms, **nunca raw HTML.**
- Pueden tener estado complejo (ej. lista de mensajes).
- Contienen hooks que manejan lógica de presentación.
- Props pueden incluir callbacks de negocio (ej. `onQuerySubmit`).

**Ejemplos:**
- `ChatPanel` — lista de ChatMessage + SearchBar al fondo, gestiona historial.
- `SourcePanel` — lista vertical de SourceEntry, una fila por candidato citado.
- `MessageList` — contenedor scrollable de ChatMessages.

**Ubicación:**
```
src/app/ui/organisms/
├── ChatPanel/
│   ├── ChatPanel.tsx
│   ├── ChatPanel.module.css
│   └── hooks/
│       ├── useChatHistory.ts
│       └── useChatScroll.ts
├── SourcePanel/
│   ├── SourcePanel.tsx
│   ├── SourcePanel.module.css
│   └── hooks/
│       └── useSourceFiltering.ts
└── ...
```

**Estructura de Componente Organism:**
```tsx
// ChatPanel.tsx
import { ChatMessage } from '../../molecules/ChatMessage';
import { SearchBar } from '../../molecules/SearchBar';
import { Container } from '../../atoms/Container';
import { useChatHistory } from './hooks/useChatHistory';
import styles from './ChatPanel.module.css';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  sources?: SourceReference[];
  timestamp: Date;
}

export interface ChatPanelProps {
  onQuerySubmit: (query: string) => Promise<void>;
  isLoading?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onQuerySubmit,
  isLoading = false,
}) => {
  const { messages, addMessage, clearHistory } = useChatHistory();

  const handleSubmit = async (query: string) => {
    addMessage({ content: query, sender: 'user' });
    try {
      const response = await onQuerySubmit(query);
      // agent returns { answer, sources }
      addMessage({ content: response.answer, sender: 'bot', sources: response.sources });
    } catch (error) {
      addMessage({ content: 'Error processing query.', sender: 'bot' });
    }
  };

  return (
    <Container className={styles.chatPanel}>
      <Container className={styles.messageList}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </Container>
      <SearchBar onSubmit={handleSubmit} disabled={isLoading} />
    </Container>
  );
};
```

---

### 3.4 Pages (Páginas Completas)

**Qué són:** Composicions de organisms que formen una pàgina o pantalla completa.

**Características:**
- Combinan organisms, molecules y atoms (composición), **nunca raw HTML.**
- Integran Context API para estado global de la página.
- Manejan routing y navegación (si aplicable).
- Props mínimas (ej. params de ruta).

**Ejemplos:**
- `ChatPage` — layout con ChatPanel a un lado, SourcePanel al otro.

**Ubicación:**
```
src/app/pages/
├── ChatPage/
│   ├── ChatPage.tsx
│   ├── ChatPage.module.css
│   └── hooks/
│       └── usePageState.ts
```

**Estructura de Componente Page:**
```tsx
// ChatPage.tsx
import { ChatPanel } from '../../ui/organisms/ChatPanel';
import { SourcePanel } from '../../ui/organisms/SourcePanel';
import { Container } from '../../ui/atoms/Container';
import { useAgentQuery } from '../../hooks/useAgentQuery';
import { useSources } from '../../hooks/useSources';
import styles from './ChatPage.module.css';

export const ChatPage: React.FC = () => {
  const { query, isLoading, error } = useAgentQuery();
  const { sources } = useSources();

  const handleQuerySubmit = async (userQuery: string) => {
    return await query(userQuery);
  };

  return (
    <Container className={styles.chatPage}>
      <ChatPanel onQuerySubmit={handleQuerySubmit} isLoading={isLoading} />
      <SourcePanel sources={sources} />
    </Container>
  );
};
```

---

## 4. Patrones & Convenciones

### 4.1 Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componente | PascalCase | `ChatMessage`, `SearchBar` |
| Archivo TS | PascalCase (match componente) | `ChatMessage.tsx` |
| Archivo CSS | `ComponentName.module.css` | `ChatMessage.module.css` |
| Hook | camelCase, prefijo `use` | `useChatHistory.ts` |
| Archivo utility | camelCase | `chatUtils.ts`, `sourceHelpers.ts` |
| CSS class (BEM) | `.ComponentName`, `.ComponentName__element`, `.ComponentName--modifier` | `.ChatMessage`, `.ChatMessage__content`, `.ChatMessage--loading` |

### 4.2 Props

Cada componente declara su contrato con TypeScript:

```tsx
export interface ComponentProps {
  // required
  requiredProp: string;

  // optional con defaults
  optionalProp?: boolean;

  // callbacks
  onSomeEvent?: (data: SomeType) => void;
  onAnotherEvent?: (data: AnotherType) => Promise<void>;

  // styling (escape hatch)
  className?: string;
}
```

**Principios:**
- Props descriptivas: `onSubmit` no `onHandle`.
- Tipos explícitos: no `any`.
- Callbacks explícitos: si un componente dispara una acción, que lo declare en props.
- `className` opcional para permitir composiciones custom.

### 4.3 State Management

| Tipo de Estado | Ubicación | Herramienta |
|---|---|---|
| Local a componente (ej. input value) | Dentro del componente | `useState` |
| Compartido en un organism (ej. lista de mensajes) | Hook reutilizable | `useChat.ts` |
| Global de la app (ej. tema, autenticación) | Context API | `ChatContext.tsx` |
| Persistencia local | localStorage | `useLocalStorage.ts` hook |

**No usar:**
- Redux/Zustand (overkill para este proyecto).
- Props drilling (3+ niveles → Context o hook).

### 4.4 Styling

- **CSS Modules:** uno por componente, sin conflictos globales.
- **BEM:** `.Button`, `.Button__text`, `.Button--primary`.
- **No inline styles:** mantener en archivo `.module.css`.
- **Variables CSS globales:** definir en `src/app/styles/global.css`, reutilizar:
  ```css
  :root {
    --color-primary: #007bff;
    --color-secondary: #6c757d;
    --spacing-unit: 0.5rem;
    --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* En componente */
  .button {
    background-color: var(--color-primary);
    padding: var(--spacing-unit);
  }
  ```

### 4.5 Documentation

Cada atom/molecule documenta su uso con JSDoc:

```tsx
/**
 * A reusable button component.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={() => console.log('clicked')}>
 *   Click Me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = (...) => ...;
```

---

## 5. Directory Structure

**Corrected 2026-09-27 (`add-app`)**: no `__tests__/` tree — every file with behavior gets a
colocated `*.test.ts(x)` right beside it, per `docs/code-conventions.md`. No `index.ts` barrel (the
`@app/*` alias resolves paths directly) and no `App.tsx`/`App.css` (`docs/code-conventions.md`
allows exactly one file at a module root, the entry point — `main.tsx` mounts `ChatProvider` +
`ChatPage` directly). See [context/app.md](../context/app.md) for the as-built reference and
[openspec/changes/add-app/design.md](../openspec/changes/add-app/design.md) Decision 13 for the full
rationale. This is the actual, current structure:

```
src/app/
├── index.html                         # Vite entry document
├── main.tsx                           # the module's only root file: mounts ChatProvider + ChatPage
├── styles/
│   └── global.css                     # reset, CSS custom properties (tokens), base typography
│
├── context/
│   ├── chat-context.tsx               # ChatProvider + useChatSession (sessionId, localStorage)
│   └── chat-context.test.tsx
│
├── hooks/
│   ├── useScannerChat.ts              # the only file importing the agents SDK
│   └── useScannerChat.test.ts
│
├── sources/
│   ├── pdf-url.ts                     # source path → dev-server URL
│   ├── pdf-url.test.ts
│   ├── photo-url.ts                   # candidate id → portrait URL
│   ├── photo-url.test.ts
│   ├── message-sources.ts             # UIMessage → SourceReference[] (reuses @agent)
│   ├── message-sources.test.ts
│   ├── latest-answered-sources.ts     # message list → most recent answered turn's sources
│   └── latest-answered-sources.test.ts
│
├── pages/
│   └── ChatPage/
│       ├── ChatPage.tsx
│       ├── ChatPage.module.css
│       └── ChatPage.test.tsx
│
└── ui/
    ├── classnames/
    │   ├── classNames.ts                  # composes a className prop from strings/conditionals/arrays
    │   └── classNames.test.ts
    │
    ├── atoms/
    │   ├── Button/
    │   │   ├── Button.tsx
    │   │   ├── Button.module.css
    │   │   └── Button.test.tsx
    │   ├── Input/
    │   ├── Text/
    │   ├── Heading/
    │   ├── Container/
    │   ├── Badge/
    │   ├── Spinner/
    │   ├── Link/
    │   ├── Avatar/                         # portrait + initials fallback
    │   └── Markdown/
    │       ├── Markdown.tsx                # blocks → elements (no dangerouslySetInnerHTML)
    │       ├── Markdown.module.css
    │       ├── Markdown.test.tsx
    │       ├── parse-markdown.ts           # the subset parser, pure
    │       └── parse-markdown.test.ts
    │
    ├── molecules/
    │   ├── ChatMessage/
    │   │   ├── ChatMessage.tsx
    │   │   ├── ChatMessage.module.css
    │   │   └── ChatMessage.test.tsx
    │   ├── SearchBar/
    │   ├── SourceEntry/
    │   ├── RetrievalStatus/
    │   └── ErrorBanner/
    │
    └── organisms/
        ├── ChatPanel/
        │   ├── ChatPanel.tsx
        │   ├── ChatPanel.module.css
        │   └── ChatPanel.test.tsx
        └── SourcePanel/
```

No `services/` (a per-concern `sources/` directory replaced it), no `types/` (each type lives beside
the code that defines it, e.g. `SourceReference` in `@agent/extraction/extract-sources`), and no
component-local `hooks/` subfolders — the one non-trivial hook (`useScannerChat`) lives at the
module's `hooks/` root since nothing else needs a nested one yet.

---

## 6. Testing Strategy

### Per Level

| Nivel | Tipo de Test | Tool | Ejemplo |
|---|---|---|---|
| Atoms | Snapshot + functional | Vitest | Button renders con variant correcto |
| Molecules | Functional + integration | Vitest + @testing-library/react | SearchBar dispara onSubmit al hacer click |
| Organisms | Integration + behavior | Vitest + @testing-library/react | ChatPanel agrega mensaje al historial |
| Pages | E2E (manual o Playwright) | Manual o Playwright | Flujo completo: pregunta → respuesta |

### Mocking

- **Atoms:** no requieren mocks (standalone).
- **Molecules:** mock atoms si es necesario (raro).
- **Organisms:** mock hooks (`useQuery`, `useHistory`).
- **Pages:** mock agents, contextos.

---

## 7. Common Pitfalls & How to Avoid

| Pitfall | Problem | Solution |
|---|---|---|
| "Atomic creep" — cada pequeña cosa es un atom | Proliferación de componentes tiny | Si menos de 2 líneas, inline en molecule. |
| Props drilling profundo | Page → Organism → Molecule → Atom | Usar Context para estado compartido. |
| Lógica de negocio en atoms | Atoms pierden reusabilidad | Atoms sin lógica; lógica en hooks/organisms. |
| Styling global conflictante | CSS specificity wars | CSS Modules siempre; variables CSS para tema. |
| Tester crea otro Button porque no encontró el atom | Duplicación | Storybook/documentation bien visible. |
| Raw HTML in molecules/organisms | Violates the single abstraction layer rule | Always wrap in Atoms; lint or code-review for violations. |

---

## 8. Evolution & Maintenance

Conforme crece la UI:
1. **New atoms** — agregar bajo `ui/atoms/`, reutilizar en molecules existentes.
2. **New molecules** — combinar atoms, agregar bajo `ui/molecules/`.
3. **New organisms** — combinar molecules, agregar bajo `ui/organisms/`.
4. **Refactoring** — si un organism crece mucho, extraer molecules internas.

Este documento se actualiza con nuevos componentes comunes.

---

## 9. Resources

- Atomic Design (Brad Frost): https://atomicdesign.bradfrost.com/
- React Best Practices: `vercel-react-best-practices` skill.

---

## 10. TLDR

1. **Atoms** = primitivas, sin lógica, **únicos emitiendo raw HTML**. Ejemplos: Button, Input, Text, Container.
2. **Molecules** = composiciones simples, **solo de atoms**. Ejemplos: SearchBar, ChatMessage.
3. **Organisms** = secciones complejas con lógica, **solo de molecules y atoms**. Ejemplos: ChatPanel, SourcePanel.
4. **Pages** = pantallas completas, **composición pura**. Ejemplo: ChatPage.
5. **NO raw HTML outside atoms** — enforce via linting or code review.
6. **Directory = Hierarquía clara:** `src/app/ui/{atoms,molecules,organisms}/ComponentName/`.
7. **CSS Modules + BEM** = estilos encapsulados.
8. **Hooks = Lógica reutilizable** en `hooks/` o carpeta local del componente.
9. **Context = Estado global** en `context/` si es necesario.
10. **TypeScript + JSDoc = Documentación** en el código.
11. **Test cada nivel** con estrategia apropiada.
