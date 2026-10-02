# Atomic Design

> **Living document** — defines the component architecture for `src/app`. Update it as the UI evolves.

---

## 1. Overview

Atomic Design organises the interface's components into four hierarchical levels, from the simplest to the most complex:

```
Atoms → Molecules → Organisms → Pages
```

This structure:
- **Reduces duplication** — components are reusable across several levels.
- **Improves testability** — each level can be tested in isolation.
- **Clarifies responsibilities** — every component knows which level it sits at.
- **Eases onboarding** — new developers understand where each piece goes.

In cv-scanner, components live under `src/app/ui/` and are split into these folders.

---

## 2. Core Rule: No Raw JSX Outside Atoms

**EXPLICIT CONSTRAINT:** No component above the Atom level may emit raw HTML (JSX elements). Every molecule, organism, and page must **compose exclusively from Atoms and Molecules**, never from bare `<div>`, `<span>`, `<button>`, or any other DOM element.

**Why:**
- **Consistency** — all UI primitives flow through a shared, testable, documented layer.
- **Reusability** — atoms carry design language (spacing, colour, typography) that can be changed globally.
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
    <div className={styles["searchBar"]}>  // ← raw HTML, not allowed in molecules
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
}) => <div className={`${styles["container"]} ${className}`}>{children}</div>;

// molecules/SearchBar.tsx
export const SearchBar: React.FC<SearchBarProps> = ({ onSubmit }) => (
  <Container className={styles["searchBar"]}>  // ← Atom, allowed
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

## 3. Definitions by Level

### 3.1 Atoms (Primitives)

**What they are:** Elementary, indivisible components with no business logic.

**Characteristics:**
- No internal state (or trivial state only: hover, focus).
- Highly reusable.
- Explicit props, none of them business-related (e.g. not "isLoading", just "disabled").
- Styling encapsulated with CSS Modules.
- **The only components allowed to emit raw HTML.**

**Examples:**
- `Button` — clickable, variants (primary, secondary, danger), sizes.
- `Input` — text/textarea, placeholder, onChange handler, disabled state.
- `Text` — styled paragraph (normal, small, mono).
- `Heading` — h1-h4, with the base margin/padding reset.
- `Badge` — small label, colour variants.
- `Spinner` — loading indicator (SVG or CSS animation).
- `Avatar` — round image, with a fallback if it fails to load.
- `Icon` — iconography (inline SVG or web font).
- `Container` — wrapper div for layout.
- `Flex` — layout primitive (flex row/column).
- `Box` — spacer/padding primitive.

**Location:**
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

**Atom component structure:**
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
    className={`${styles["button"]} ${styles[`button--${variant}`]} ${className}`}
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

### 3.2 Molecules (Compositions)

**What they are:** Groups of atoms that form a functional unit.

**Characteristics:**
- Combine 2+ atoms, **never raw HTML.**
- May hold simple state (local, not global).
- Logic focused on the composition (e.g. "what happens when the user types into the input").
- Props reflect compositional intent, not business intent (e.g. `onSubmit`, not `onQueryAgent`).

**Examples:**
- `SearchBar` — Input + Button, handles onChange and onClick locally.
- `ChatMessage` — chat bubble: Container (aligned by author) + Heading (author) + Markdown
  (the agent's answer) or Text (the user's question, verbatim). Cited sources don't belong here:
  they are the `SourcePanel`'s job.
- `SourceEntry` — Avatar (the candidate's CV photo) + Link with a Badge (the name, which opens the PDF).
- `LoadingState` — Spinner + Text ("Loading...").

**Location:**
```
src/app/ui/molecules/
├── SearchBar/
│   ├── SearchBar.tsx
│   ├── SearchBar.module.css
│   └── hooks/
│       └── useSearchBarInput.ts  (optional, if the logic is complex)
├── ChatMessage/
│   ├── ChatMessage.tsx
│   ├── ChatMessage.module.css
│   └── types.ts
└── ...
```

**Molecule component structure:**
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
    <Container className={styles["searchBar"]}>
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

### 3.3 Organisms (Complex Sections)

**What they are:** Compositions of molecules and atoms that represent a logical section of the interface.

**Characteristics:**
- Combine molecules and atoms, **never raw HTML.**
- May hold complex state (e.g. a list of messages).
- Contain hooks that handle presentation logic.
- Props may include business callbacks (e.g. `onQuerySubmit`).

**Examples:**
- `ChatPanel` — a list of ChatMessage + a SearchBar at the bottom; manages the history.
- `SourcePanel` — a vertical list of SourceEntry, one row per cited candidate.
- `MessageList` — a scrollable container of ChatMessages.

**Location:**
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

**Organism component structure:**
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
    <Container className={styles["chatPanel"]}>
      <Container className={styles["messageList"]}>
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

### 3.4 Pages (Full Pages)

**What they are:** Compositions of organisms that form a full page or screen.

**Characteristics:**
- Combine organisms, molecules and atoms (composition), **never raw HTML.**
- Integrate the Context API for page-wide state.
- Handle routing and navigation (where applicable).
- Minimal props (e.g. route params).

**Examples:**
- `ChatPage` — layout with the ChatPanel on one side and the SourcePanel on the other.

**Location:**
```
src/app/pages/
├── ChatPage/
│   ├── ChatPage.tsx
│   ├── ChatPage.module.css
│   └── hooks/
│       └── usePageState.ts
```

**Page component structure:**
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
    <Container className={styles["chatPage"]}>
      <ChatPanel onQuerySubmit={handleQuerySubmit} isLoading={isLoading} />
      <SourcePanel sources={sources} />
    </Container>
  );
};
```

---

## 4. Patterns & Conventions

### 4.1 Naming

| Element | Convention | Example |
|----------|-----------|---------|
| Component | PascalCase | `ChatMessage`, `SearchBar` |
| TS file | PascalCase (matches the component) | `ChatMessage.tsx` |
| CSS file | `ComponentName.module.css` | `ChatMessage.module.css` |
| Hook | camelCase, `use` prefix | `useChatHistory.ts` |
| Utility file | camelCase | `chatUtils.ts`, `sourceHelpers.ts` |
| CSS class (BEM) | `.ComponentName`, `.ComponentName__element`, `.ComponentName--modifier` | `.ChatMessage`, `.ChatMessage__content`, `.ChatMessage--loading` |

### 4.2 Props

Every component declares its contract in TypeScript:

```tsx
export interface ComponentProps {
  // required
  requiredProp: string;

  // optional with defaults
  optionalProp?: boolean;

  // callbacks
  onSomeEvent?: (data: SomeType) => void;
  onAnotherEvent?: (data: AnotherType) => Promise<void>;

  // styling (escape hatch)
  className?: string;
}
```

**Principles:**
- Descriptive props: `onSubmit`, not `onHandle`.
- Explicit types: no `any`.
- Explicit callbacks: if a component triggers an action, it declares it in its props.
- Optional `className` to allow custom compositions.

### 4.3 State Management

| State type | Location | Tool |
|---|---|---|
| Local to a component (e.g. input value) | Inside the component | `useState` |
| Shared within an organism (e.g. list of messages) | Reusable hook | `useChat.ts` |
| App-wide (e.g. theme, authentication) | Context API | `ChatContext.tsx` |
| Local persistence | localStorage | `useLocalStorage.ts` hook |

**Don't use:**
- Redux/Zustand (overkill for this project).
- Prop drilling (3+ levels → Context or a hook).

### 4.4 Styling

- **CSS Modules:** one per component, no global conflicts.
- **BEM:** `.Button`, `.Button__text`, `.Button--primary`.
- **Accessing module classes:** always with bracket notation `styles["className"]` (or
  `styles[\`block--${modifier}\`]` for dynamic modifiers). Don't use dot notation
  (`styles.className`) — that way every reference has the same shape, static and
  dynamic alike.
- **No inline styles:** keep them in the `.module.css` file.
- **Global CSS variables:** define them in `src/app/styles/global.css` and reuse them:
  ```css
  :root {
    --color-primary: #007bff;
    --color-secondary: #6c757d;
    --spacing-unit: 0.5rem;
    --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* In a component */
  .button {
    background-color: var(--color-primary);
    padding: var(--spacing-unit);
  }
  ```

### 4.5 Documentation

Every atom/molecule documents its usage with JSDoc:

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

### 4.6 Conditional Rendering: `RenderOrNull` / `RenderOrFallback`

**Added 2026-10-02 (issue #18).** Two design-system render helpers live under `ui/atoms/`. They
are view-layer vocabulary for conditional paint, not product components. They emit no DOM and
have no CSS. Use them so a render tree reads as composition, not as `if`/`else` blocks or dense
ternaries:

| Helper | Contract |
| --- | --- |
| `RenderOrNull` | `shouldRender: boolean` + `children` → paints `children` or nothing |
| `RenderOrFallback` | `shouldRender: boolean` + `children` + `fallback: ReactNode` → paints `children` or `fallback` |

```tsx
<RenderOrFallback shouldRender={isUser} fallback={<Markdown>{text}</Markdown>}>
  <Text>{text}</Text>
</RenderOrFallback>

<RenderOrNull shouldRender={state === "error"}>
  <ErrorBanner message="The assistant cannot be reached." />
</RenderOrNull>
```

**Performance / evaluation contract (non-negotiable).** The helpers are ordinary components, so
both sides are evaluated as **arguments** before the helper decides which one to paint:

- **OK: a component on the side that isn't painted.** Its element is created (`createElement`
  runs for both sides), but React only mounts the branch the helper returns. The discarded
  component's body, hooks and effects never run.
- **Not OK: eager work inside the JSX on the side that isn't painted.** Expressions such as
  `transform(x)`, `list.map(...)` or fresh allocations run before the helper does, whatever
  `shouldRender` says. The same goes for work that is only *valid* on the painted side, like
  dereferencing a value that may be `null` there. In those cases, keep a ternary or `&&` (real
  short-circuit), or move the work into a component so it only runs when mounted.
  (`SourcePanel` maps `sources?.map(...)` inside `RenderOrFallback`. That is acceptable only
  because the map is a no-op exactly when the list is discarded.)
- **No lazy APIs.** Don't add `() => ReactNode` render-prop variants unless a real call site
  needs one. The API stays boolean + nodes for DS clarity.
- **Keys in lists.** When a helper is the root a `.map` callback returns, the `key` goes on the
  **helper**, not only on the child inside it.

Each atom's JSDoc restates this contract, so call sites see it on hover.

**When to use them.** Use them for render-only branches: "paint A or B", "paint or nothing".
Today that means `ChatMessage` (user text vs assistant Markdown; the tool part), `RetrievalStatus`
(pending vs nothing), `SourcePanel` (empty state vs list) and `ChatPanel` (spinner; error banner).

**When not to.** These stay as ordinary control flow:

- Event and handler guards, e.g. `SearchBar`'s empty-submit and Enter-key checks.
- Context and bootstrap throws (`chat-context`, `main.tsx`'s missing root).
- Type-driven dispatch that relies on narrowing, e.g. `Markdown`'s `node.type` mapping, or the
  `isTextUIPart` guard in `ChatMessage` that gives `part.text` its type.
- Stateful roots that differ by element, e.g. `Avatar`'s image vs initials after `onError`.
- Plain value choices that aren't render branches, e.g. `isUser ? "You" : "Assistant"`.

---

## 5. Directory Structure

**Corrected 2026-09-27 (`add-app`)**: no `__tests__/` tree — every file with behaviour gets a
colocated `*.test.ts(x)` right beside it, per `docs/code-conventions.md`. No `index.ts` barrel (the
`@app/*` alias resolves paths directly) and no `App.tsx`/`App.css` (`docs/code-conventions.md`
allows exactly one file at a module root, the entry point — `main.tsx` mounts `ChatProvider` +
`ChatPage` directly). See
[openspec/changes/archive/2026-09-27-add-app/design.md](../openspec/changes/archive/2026-09-27-add-app/design.md) Decision 13 for the full
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
    │   ├── RenderOrNull/                   # DS render helper: children or nothing (§4.6), no CSS
    │   ├── RenderOrFallback/               # DS render helper: children or fallback (§4.6), no CSS
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

| Level | Test type | Tool | Example |
|---|---|---|---|
| Atoms | Snapshot + functional | Vitest | Button renders with the correct variant |
| Molecules | Functional + integration | Vitest + @testing-library/react | SearchBar fires onSubmit on click |
| Organisms | Integration + behaviour | Vitest + @testing-library/react | ChatPanel adds a message to the history |
| Pages | E2E (manual or Playwright) | Manual or Playwright | Full flow: question → answer |

### Mocking

- **Atoms:** need no mocks (standalone).
- **Molecules:** mock atoms if needed (rare).
- **Organisms:** mock hooks (`useQuery`, `useHistory`).
- **Pages:** mock agents and contexts.

---

## 7. Common Pitfalls & How to Avoid

| Pitfall | Problem | Solution |
|---|---|---|
| "Atomic creep" — every little thing becomes an atom | Proliferation of tiny components | If it's under 2 lines, inline it in the molecule. |
| Deep prop drilling | Page → Organism → Molecule → Atom | Use Context for shared state. |
| Business logic in atoms | Atoms lose reusability | Logic-free atoms; logic lives in hooks/organisms. |
| Conflicting global styling | CSS specificity wars | Always CSS Modules; CSS variables for theming. |
| A tester creates another Button because they couldn't find the atom | Duplication | Clearly visible Storybook/documentation. |
| Raw HTML in molecules/organisms | Violates the single abstraction layer rule | Always wrap in Atoms; lint or code-review for violations. |
| `RenderOrNull`/`RenderOrFallback` wrapping eager work | The discarded side's JSX expressions (`list.map`, `transform(x)`, a `null` dereference) still run | Keep `&&`/a ternary there, or move the work into a component (§4.6). |

---

## 8. Evolution & Maintenance

As the UI grows:
1. **New atoms** — add them under `ui/atoms/` and reuse them in existing molecules.
2. **New molecules** — combine atoms and add them under `ui/molecules/`.
3. **New organisms** — combine molecules and add them under `ui/organisms/`.
4. **Refactoring** — if an organism grows too large, extract its inner molecules.

This document is updated as new common components appear.

---

## 9. Resources

- Atomic Design (Brad Frost): https://atomicdesign.bradfrost.com/
- React Best Practices: `vercel-react-best-practices` skill.

---

## 10. TLDR

1. **Atoms** = primitives, no logic, **the only ones emitting raw HTML**. Examples: Button, Input, Text, Container.
2. **Molecules** = simple compositions, **of atoms only**. Examples: SearchBar, ChatMessage.
3. **Organisms** = complex sections with logic, **of molecules and atoms only**. Examples: ChatPanel, SourcePanel.
4. **Pages** = full screens, **pure composition**. Example: ChatPage.
5. **NO raw HTML outside atoms** — enforce via linting or code review.
6. **Directory = clear hierarchy:** `src/app/ui/{atoms,molecules,organisms}/ComponentName/`.
7. **CSS Modules + BEM** = encapsulated styles.
8. **Hooks = reusable logic** in `hooks/` or the component's local folder.
9. **Context = global state** in `context/` if needed.
10. **TypeScript + JSDoc = documentation** in the code.
11. **Test every level** with the appropriate strategy.
