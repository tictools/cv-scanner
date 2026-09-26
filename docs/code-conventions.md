# Code Conventions

Rules that apply to **every code file in this repo, existing or future**, regardless of module
or language. Unlike `docs/tdd.md` (how behavior gets built) or `docs/architecture.md` (how the
system is shaped), this doc governs how code is laid out: the visual structure inside a file, and
where that file lives in the tree.

## Visual block separation

Inside a function or method body, group statements into their logical steps and separate each
step from the next with **exactly one blank line**. A "step" is a chunk of statements that serves
one purpose — preparing input, performing the action, handling/returning the result — not every
individual line.

Concretely, the recurring steps in this codebase's functions are usually some subset of:

1. **Setup** — building the config/options the call needs (variable declarations, destructuring,
   object literals assembled for the next step).
2. **Action** — the call or computation the function exists to make (an `await`, the main
   transformation).
3. **Output** — handling and returning the result (guard checks on the result, the `return`
   statement).

### Example

Before (steps run together, the eye can't tell where one ends and the next begins):

```ts
async generateJson({ model, prompt }: GenerateJsonOptions): Promise<unknown> {
  const generativeModel = this.genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const result = await generativeModel.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

After (setup, action, and output are each their own visual block):

```ts
async generateJson({ model, prompt }: GenerateJsonOptions): Promise<unknown> {
  const generativeModel = this.genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await generativeModel.generateContent(prompt);

  return JSON.parse(result.response.text());
}
```

### Rules of thumb

- One blank line between steps, never more, never inside a step.
- Don't blank-line-separate statements that belong to the same step just to spread them out (e.g.
  two lines both computing pieces of the same setup object stay together).
- A short function with a single step (e.g. a one-line guard clause helper) doesn't need any
  blank lines — there's nothing to separate.
- This is a formatting rule, not a refactor license: apply it by inserting/removing blank lines,
  not by restructuring logic, when adapting existing code.
- Applies uniformly across production code and tests.

## Arrow functions over function declarations/expressions

Prefer `const name = (...) => { ... }` over `function name(...) { ... }`, for both top-level
functions and inner helpers.

```ts
// Before
export function slugify(value: string): string { ... }

// After
export const slugify = (value: string): string => { ... };
```

### Exceptions

- **Class methods** keep normal method syntax (`method() { ... }`), not arrow class fields.
  `GeminiClient.generateJson`/`generateImageBytes` stay as methods — no `this`-binding need
  justifies the per-instance cost of an arrow field here.
- **Anything that needs its own dynamic `this`** stays a `function` expression — e.g. a
  constructor mock like `vi.fn(function (this: unknown) { ... })` in
  `gemini-client.test.ts`, which relies on `this` being the call-time instance. An arrow function
  would capture the wrong `this` and silently break the mock.

## Named (destructured) parameters for multi-argument functions

Whenever a function's own signature would take **more than one parameter**, take a single object
parameter instead and destructure it, the same way `GeminiClient.generateJson` already takes
`{ model, prompt }` rather than two positional arguments. This applies to every
function we define and call ourselves — production code and test helpers alike.

```ts
// Before
function pick<T>(list: readonly T[], index: number, stride: number): T { ... }
pick(ROLES, i, 1);

// After
const pick = <T>({ list, index, stride }: { list: readonly T[]; index: number; stride: number }): T => { ... };
pick({ list: ROLES, index: i, stride: 1 });
```

### Exception

Callback signatures whose arity is fixed by an external API we don't control — `Array.prototype`
methods (`.map((item, index) => ...)`), `describe.each`, etc. — are exempt: we can't change how
those callers invoke the callback, so positional parameters stay.

## No loose files

A file that has a concern of its own does not sit loose at the root of `src/<module>/`, or at the
root of any other directory. It lives in a nested directory whose name **is** that concern. The
directory is a magnet: the next piece of the same concern is added beside it, not as another
loose file one level up. A directory with a single file is the expected starting point — the
folder exists so the second file has somewhere honest to go.

The directory name (and any file name inside it) has to say what the code is about. Generic
buckets are forbidden, as a directory or as a file: `utils`, `helpers`, and the same kind of
empty name (`common`, `shared`, `misc`, `lib`). `generators/fs-utils.ts` is not a legal home for
`fileExists`. If the only name on offer is one of those, the grouping is wrong: name the real
concern, or keep the function next to its only caller.

### What stays at a root

- The module entrypoint (`src/feed/index.ts`, what `generate:cvs` runs). It is the boundary
  something outside the module points at, not a concern waiting for siblings.
- A colocated `*.test.ts` stays next to the file it tests, and moves with it into the nested
  directory.

### Example

```
src/feed/slug.ts                  loose: a naming rule with nowhere for the next one
src/feed/naming/slug.ts           the directory is the concern; the next naming rule lands here

src/feed/generators/fs-utils.ts   forbidden: the name does not say what the file is
```

## No magic numbers in tests

Numeric literals that encode a real limit, threshold, count, or configuration value — not
arbitrary sample data — must be pulled into a named constant before they're used in a test's
setup or assertions. This applies whenever the number *means* something a reader would otherwise
have to guess or re-derive: a candidate count, a concurrency cap, a retry budget, a "spans at
least N distinct X" threshold.

- **Import it if production defines it.** When the number mirrors a value production code
  already has a name for (`CANDIDATE_COUNT`, `MAX_ATTEMPTS`, ...), import that constant instead
  of retyping the literal — see "Constants stay private unless another file needs them" below;
  needing it here is exactly what earns that constant its `export`.
- **Name it locally otherwise.** A threshold that only exists for this test's own assertion (e.g.
  "at least 3 distinct roles") gets a local `const` near the top of the file (or the `describe`
  block, if it's only relevant there), named for what it asserts (`MIN_DISTINCT_ROLES`), not what
  it happens to equal.

### Exceptions

Arbitrary fixture/sample data carries no meaning to protect and stays as a literal:

- Sample values that exist only to make a fixture realistic — a candidate's `yearsOfExperience`,
  a phone number, a date string, an example seed passed only to make output deterministic.
- Numbers embedded inside a string literal, such as an HTTP status code inside a mocked error
  message (`"503 service unavailable"`).
- Trivial `0`/`1` used positionally or as a call count that the test's own name already explains
  (`result[0]`, `toHaveBeenCalledTimes(1)` for "called exactly once").

When in doubt: if replacing the number with `SOME_NAME` would make the test easier to read, name
it; if the number is just filler for a realistic-looking fixture, leave it.

## Constants stay private unless another file needs them

A constant declared inside a module (a `.ts` file) is exported only when some *other* file
actually imports it — never speculatively, and never just because it looks like the kind of thing
that *could* be reused later. (This is about individual TypeScript files/ES modules — every file
is its own module in this sense — not the four architectural modules under `src/`; a constant
private to `content.ts` follows this rule the same way a constant private to `app/` would.)

- Add `export` the moment a second file needs the value, including a test file that needs the
  same constant to avoid a magic number (see above) — that need is what justifies the export, not
  the reverse.
- Drop `export` the moment the last external importer goes away; don't leave a constant exported
  "just in case" once nothing outside the file reads it anymore.
- A value reused by two functions inside the same file still doesn't need `export` — same-file
  reuse is not "another module."

### Example

```ts
// content.ts
export const MAX_ATTEMPTS = 3; // exported: content.test.ts asserts against it directly

const TEXT_MODEL = "gemini-3.8-flash"; // private: only ever used inside this file
```

## Status

Visual block separation, arrow functions, and named parameters were applied repo-wide to the
existing `src/` tree as of 2026-09-26. The magic-numbers-in-tests and private-by-default-constants
rules above were added the same day and applied repo-wide at that point too. New code must follow
every rule in this doc from the start, including directory nesting. When touching an existing
file for unrelated reasons, bring it in line too.
