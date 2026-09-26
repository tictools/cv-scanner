---
name: autoimprove
description: >-
  Captures lessons from corrections, feedback, or the agent's own post-task
  realizations, and writes them straight into the right file — an existing
  SKILL.md, a docs/*.md page, or the top-level AGENTS.md/CLAUDE.md rules —
  instead of letting them evaporate at the end of the conversation. Trigger
  this automatically whenever the user corrects a mistake, says things like
  "next time do X", "you should have...", "remember that...", "that
  convention is wrong/outdated", or proposes any improvement to how a skill
  or the project docs should work — and also trigger it proactively right
  after finishing a task if you personally hit friction from missing or
  wrong documented context, even if nobody asked. Works for repos that
  follow the AGENTS.md/CLAUDE.md + docs/ convention, and for skills stored
  under .claude/skills/, .agents/skills/, or .opencode/skill/ (Claude Code
  and OpenCode both read these). Not for reporting bugs about Claude Code
  the product itself — that belongs to the SendFeedback tool, not here.
metadata:
  author: jaumevillarreal
  version: "1.0.0"
---

# Autoimprove

Most lessons learned mid-conversation die with the conversation. The next session repeats the
same mistake, or re-asks a question the docs could have answered. This skill closes that loop:
when something worth remembering surfaces, find the one right place it belongs and write it
there — immediately, without waiting to be asked twice.

This is about *this repository's* knowledge base (its skills, its `docs/`, its top-level rules
file). It has nothing to do with reporting bugs in Claude Code itself — that's what the
`SendFeedback` tool is for.

## Step 0 — Is there actually a lesson here?

Before touching anything, ask: would reading the current docs/skill have prevented this? If the
answer is "yes, and I just didn't read it," there's nothing to write — the information already
exists, and rewriting it won't fix a one-off oversight. Only proceed if:

- the information is genuinely missing or was never written down, or
- an existing doc/skill actively says something wrong or now-outdated, or
- the user is explicitly proposing a change to a convention, not just pointing at a slip.

## Step 1 — Classify where the lesson belongs

Pick the **narrowest** bucket that fits. Each one has a different blast radius, and the cost of
noise scales with how often the file gets read:

1. **A specific skill's `SKILL.md`** — the lesson is about *how to carry out a class of task*
   with a particular tool, workflow, or skill (e.g. "when doing X, always check Y first"). Edit
   that skill file directly, in the step or section it actually affects.
2. **A doc under `docs/`** — the lesson is project-specific knowledge: an architecture decision,
   a module's actual behavior, a convention scoped to this repo. Edit the relevant doc, or create
   one if none covers it yet.
3. **The top-level rules file** (`AGENTS.md`, or whatever `CLAUDE.md`/equivalent imports) — the
   lesson is a cross-cutting rule that should hold for *every* task in this repo, not just one
   module or workflow (e.g. "never commit without running X", "planning notes live in
   `plans/`"). Edit it directly, in the section that already groups similar rules.

Default to bucket 1 or 2. Only reach for bucket 3 when the rule is truly universal — that file is
read at the start of every session, so it's the most expensive place to get wrong or clutter.

If the same lesson invalidates more than one place (a skill's default behavior contradicts what a
doc claims the architecture does), fix all of them and say so — don't patch just the one you
noticed first.

### When the lesson doesn't fit anywhere existing

Sometimes none of the three buckets has a file that fits — no skill covers this workflow, no doc
covers this topic, and it's not a universal rule either. Before concluding that, actively try to
stretch an existing file first: a bullet added to a related doc's existing section, or a new
sub-section inside a skill that already covers the neighboring workflow, is almost always
possible and is always cheaper than a new file. A new file (a new doc under `docs/`, a new
top-level section, or — heaviest of all — a whole new skill) is a standing cost every future
session pays to read or discover it, so create one **only when strictly necessary**: when the
lesson genuinely doesn't belong under anything that exists, and stretching an existing file would
make it read as out of place or misfiled there. When that happens:

- Create the smallest thing that fits (prefer a new `docs/*.md` page over a new skill; prefer
  extending `AGENTS.md`'s existing structure over a new top-level section).
- Say so explicitly when reporting back (Step 4) — call out that this was a *new* file, not an
  edit, and name the one-line reason nothing existing could hold it. Don't let a new file blend in
  silently among routine edits; the user should be able to notice and veto it easily.

## Step 2 — Find the existing text before adding new text

Never assume nothing covers this already:

- Grep the relevant `docs/*.md` files and the top-level rules file for related keywords.
- For skills, check every location the project's agents actually read from. In a repo that
  mirrors this one's convention, canonical skill content lives in `.agents/skills/<name>/`, and
  `.claude/skills/<name>` is a **symlink** into it (`readlink` it to confirm). Always edit the
  canonical target, never a symlink — editing through the symlink works too, but checking first
  avoids confusion about which copy is "real." If a repo instead has real (non-symlinked) files
  under both `.claude/skills/` and `.agents/skills/`, or also under `.opencode/skill/`, treat
  each one as authoritative for its own tool and update all copies that exist, since nothing is
  syncing them automatically in that layout.
- For docs, check the repository's documentation index first (in this repo, the Documentation
  Map table in `AGENTS.md` §4) for a row that already points at the right file.

If you find existing text that's simply wrong, correct it in place rather than appending a caveat
next to it — a doc that contradicts itself is worse than one that's merely incomplete.

## Step 3 — Write the edit

- Match the voice and structure already in the file: a table row for a table, a bullet for a
  bullet list, a frontmatter field for frontmatter. Don't restructure a file to fit one addition.
- **New doc file** (only once you've confirmed, per the section above, that nothing existing can
  hold this): create it under `docs/`, then add an index row pointing to it wherever this repo's
  documentation map lives (§4 of `AGENTS.md` here) — a doc that isn't indexed is as good as not
  existing, per this repo's own stated rule.
- **New skill from scratch** (not a tweak to an existing one): stop here and say so instead of
  improvising a `SKILL.md` inline. A brand-new skill deserves its own naming, description, and a
  test pass — that's a job for a dedicated skill-creation workflow, not a side effect of this one.
  This is the single most expensive kind of "new file," so it should be rarer than a new doc.
- Keep the diff small. This skill fixes and extends existing text; it doesn't rewrite files for
  style.

## Step 4 — Report back

One short message once the edit lands: which file(s) changed, the one-line lesson captured, and
why it went where it did. Skip the full diff unless asked — the point is to close the loop
quickly, not to produce a change-review document.

## Non-goals

- **Claude Code product bugs or UX complaints** — use `SendFeedback`, not this skill. If a user's
  complaint is actually about Claude Code's own behavior (a tool malfunctioning, a CLI feature
  request) rather than about this project's docs or skills, redirect there instead.
- **Ephemeral, task-specific state** — scratch notes for the current task belong in this repo's
  scratch/planning location (`plans/` here, gitignored), not in a committed doc. Only promote
  content out of scratch space once it's an actual decision future sessions need.
- **Inventing facts to fill a gap** — only record what was actually verified in the codebase or
  explicitly stated by the user. If you're not sure where something belongs or whether it's true,
  say so and ask, rather than guessing and writing it down as fact.
- **No repo convention exists at all** — if the repo has no `AGENTS.md`/`CLAUDE.md`, no `docs/`,
  and no skills directory to speak of, don't invent a new documentation system unprompted; ask
  the user once where they'd like this captured.
